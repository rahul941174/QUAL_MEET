# Signaling Service Phase 3 Updates LLD

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
socket.emit("chat_message", { content });
```

### 2.2. Server Handling (CRITICAL FLOW)
The server must broadcast the message in real-time, then persist it asynchronously without blocking the event loop.

```typescript
socket.on("chat_message", async (data) => {
  const user = socket.data.user;
  const roomId = socketToRoom.get(socket.id);

  if (!roomId) return;

  const message = {
    id: crypto.randomUUID(),
    roomId,
    senderId: user.userId,
    content: data.content,
    createdAt: new Date().toISOString()
  };

  // 🔥 1. BROADCAST FIRST (REAL-TIME)
  await redisPub.publish(
    `channel:room:${roomId}`,
    JSON.stringify({
      type: "CHAT_MESSAGE",
      payload: message
    })
  );

  // 🔥 2. PERSIST ASYNC (NON-BLOCKING)
  saveMessageToDB(message).catch(err => {
    console.error("Chat persist failed:", err);
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
*   ❌ **NEVER block event loop:** Do not await the DB write before broadcasting.
*   ❌ **NEVER await DB write in hot path.**

---

## 6. Failure Handling

| Issue | Behavior |
| :--- | :--- |
| **DB down** | Message is still delivered in real-time (history lost). |
| **Redis down** | Chat disabled (fail safe). System degrades safely. |
| **Duplicate message** | Ignored by clients using the unique `id`. |