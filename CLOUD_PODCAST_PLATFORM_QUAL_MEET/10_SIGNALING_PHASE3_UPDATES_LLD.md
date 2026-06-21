# Signaling Service Phase 3 Updates LLD (Final)

## 1. Responsibility (Updated)
The Signaling Service is the core real-time orchestrator. In Phase 3, we avoid creating a standalone chat service to reduce complexity.

The Signaling Service handles:
*   WebRTC signaling (existing)
*   Presence + Redis Pub/Sub (existing)
*   Screen share lock (existing)
*   ✅ **Chat broadcasting + persistence (NEW)**

---

## 2. New Feature: Chat System

### 2.1. Event: `chat_message`
**Client → Server**
```typescript
// Note: Frontend must generate a tempId to prevent optimistic UI duplicates
socket.emit("chat_message", { content, tempId });
```

### 2.2. Server Handling & Security (CRITICAL FLOW)
The server must broadcast the message in real-time, persist it asynchronously, and strictly protect against SPAM and XSS.

```typescript
import sanitizeHtml from "sanitize-html";

socket.on("chat_message", async (data) => {
  const user = socket.data.user;
  const roomId = socketToRoom.get(socket.id);

  if (!roomId) return;

  // 🛡️ SECURITY: Empty Message Check
  if (!data.content || !data.content.trim()) return;

  // 🛡️ SECURITY: Room Membership Validation (Prevent Spoofing/Stale state)
  // MANDATORY DOCUMENTATION: `room:${roomId}:users` MUST be a Redis SET across the entire system.
  // Using SISMEMBER guarantees consistency with the room-join Lua script.
  const isMember = await redisClient.sismember(`room:${roomId}:users`, user.userId);
  if (!isMember) return;

  // 🛡️ SECURITY: Size Limit
  if (data.content.length > 1000) return;

  // 🛡️ SECURITY: Rate Limiting (SPAM Protection - Per User AND Per Room)
  const userRateKey = `chat:rate:user:${user.userId}`;
  const roomRateKey = `chat:rate:room:${roomId}`;

  const userCount = await redisClient.incr(userRateKey);
  const roomCount = await redisClient.incr(roomRateKey);

  if (userCount === 1) await redisClient.expire(userRateKey, 5);
  if (roomCount === 1) await redisClient.expire(roomRateKey, 5);

  if (userCount > 10 || roomCount > 50) return; // Block spammer/overloaded room

  // 🛡️ SECURITY: XSS Sanitization (NEVER trust frontend)
  const cleanContent = sanitizeHtml(data.content);

  const realId = crypto.randomUUID();
  const message = {
    id: realId,
    tempId: data.tempId, // Send back so frontend can resolve optimistic UI
    roomId,
    senderId: user.userId,
    content: cleanContent,
    createdAt: new Date().toISOString()
  };

  // 🔥 1. BROADCAST FIRST (REAL-TIME)
  // PERFORMANCE FIX: DO NOT AWAIT PUBLISH
  redisPub.publish(
    `channel:room:${roomId}`,
    JSON.stringify({
      type: "CHAT_MESSAGE",
      payload: message
    })
  ).catch(console.error);

  // 🔥 2. PERSIST ASYNC (NON-BLOCKING)
  // Use a simple queue or setImmediate to avoid blocking the hot path event loop
  setImmediate(() => {
    saveMessageToDB(message).catch(err => {
      console.error("Chat persist failed:", err);
    });
  });
});
```

### 2.3. Redis Pub/Sub Handling
When the `CHAT_MESSAGE` event is received from Redis on any node:
```typescript
if (event.type === "CHAT_MESSAGE") {
  io.to(roomId).emit("chat_message", event.payload);
}
```

---

## 3. Database (Inside Signaling Service)

The Signaling Service will connect to the existing PostgreSQL database to write chat history.

**Database Connection Pool (Critical):**
Because the signaling service is high-throughput, the PostgreSQL connection pool MUST be explicitly constrained to prevent starving real-time operations.
*   `max: 10` (Maximum 10 concurrent connections to DB per signaling node).

**Table: `messages`**
| Column       | Type      |
| :---         | :---      |
| `id`         | UUID      |
| `room_id`    | VARCHAR   |
| `sender_id`  | VARCHAR   |
| `content`    | TEXT      |
| `created_at` | TIMESTAMP |

---

## 4. Chat History API
To allow late-joiners to retrieve chat history, the signaling service (or a small router within it) exposes:

**Endpoint:** `GET /chats/:roomId`
**Query Params:** `?page=1&limit=50`

---

## 5. Rules (VERY IMPORTANT)
*   ✅ **Broadcast first:** Real-time delivery is the highest priority.
*   ❌ **NEVER block event loop:** Do not await the DB write before broadcasting. Use `setImmediate` or a worker queue to prevent DB latency from affecting WebRTC signaling.
*   ❌ **NEVER await Redis Publish:** Fire and forget the Redis broadcast to keep the WebRTC message loop fast.