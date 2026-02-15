# Signaling Service LLD (Phase 2)

## 1. Phase 2 Upgrades
*   **Redis Pub/Sub:** Scaling across multiple nodes.
*   **Chat Relay:** Persisting chat messages via Chat Service.
*   **SFU Signaling:** Handling Mediasoup transport negotiations.
*   **Robustness:** Handling Redis failures and connection drops.

---

## 2. Redis Architecture (Pub/Sub)

**Rationale:** In Phase 1, `roomUsers` was a local Map. This breaks if we have 2 signaling nodes (Node A has User 1, Node B has User 2).

### Data Structures
*   **Local State:** `socketToUser`, `socketToRoom` (Keep these for fast local lookups).
*   **Shared State (Redis):**
    *   **Presence:** `HSET room:{roomId}:nodes {nodeId} {count}` (Track which nodes serve this room).
    *   **User Location:** `SET user:{userId}:node {nodeId}`.

### Pub/Sub Channels
*   `channel:room:{roomId}`: Broadcasts `OFFER`, `ANSWER`, `ICE`, `CHAT`, `USER_JOINED`.

### Flow (Multi-Node)
1.  **Client A (Node 1)** sends `webrtc_offer` to **Client B (Node 2)**.
2.  **Node 1** publishes to `channel:room:{roomId}`.
3.  **Node 2** receives event.
4.  **Node 2** checks if it holds **Client B**.
5.  **Node 2** forwards event to **Client B** via Socket.IO.

---

## 3. Chat Signaling

**Event:** `chat_message` ({ content })

1.  **Receive:** Server receives message from Client A.
2.  **Persist (Async):**
    *   Fire-and-forget call to **Chat Service** (gRPC or HTTP queue) to save to DB.
    *   *Alternative:* Write to Redis List `chat:buffer:{roomId}` and flush periodically.
3.  **Broadcast:**
    *   Publish to `channel:room:{roomId}`.
    *   Payload: `{ senderId, content, timestamp, id }`.

---

## 4. SFU Signaling (Mediasoup Integration)

If the room is in **SFU Mode** (flag in Redis Room Cache):

**Events:**
1.  `sfu_get_router_capabilities`: Ask Media Service for capabilities.
2.  `sfu_create_transport`: Ask Media Service to create WebRTC Transport.
3.  `sfu_connect_transport`: Send DTLS parameters.
4.  `sfu_produce`: Send track parameters (ID, kind).
5.  `sfu_consume`: Request to consume a producer's track.

**Architecture:**
*   Signaling Service acts as a **Proxy** between Frontend and Media Service.
*   Frontend <-> Signaling (WS) <-> Media Service (HTTP/GRPC/Redis).

---

## 5. Connection Health & Reconnection

### Disconnect Handling (Updated)
1.  **Graceful:** Client emits `leave_room`.
2.  **Ungraceful (TCP Drop):**
    *   `socket.on('disconnect')` fires.
    *   Mark user as "Disconnecting" in Redis (set a short TTL key `disconnecting:{userId}`).
    *   Wait 5 seconds (Reconnection Window).
    *   If user reconnects (Auth Handshake), clear key.
    *   If TTL expires, publish `user_left`.

### Heartbeat
*   Client sends `heartbeat` every 10s.
*   Server updates `EXPIRE presence:{roomId}:{userId} 30`.

---

## 6. Implementation Checklist (Phase 2)
- [ ] Install `ioredis`.
- [ ] Implement `RedisAdapter` for Socket.IO (or custom Pub/Sub logic).
- [ ] Update `join_room` to use Redis Presence.
- [ ] Implement `chat_message` handler + persistence.
- [ ] Add `sfu_*` event handlers (proxy to Media Service).

---

## 7. Critical Failure Handling (Phase 2 Hardening)

### 7.1 WebSocket Authentication Code
```typescript
io.use((socket, next) => {
  const cookie = socket.handshake.headers.cookie;
  if (!cookie) return next(new Error("Authentication error"));

  const token = parseCookie(cookie)['access_token'];
  try {
    const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});
```

### 7.2 Cache Miss Strategy (Room Mode)
If `GET room:{id}` returns null (TTL expired):
1.  **Read-Through:** Call Room Service internal API (`GET /internal/rooms/:id`).
2.  **Populate:** Write to Redis `room:{id}` with TTL 1h.
3.  **Proceed:** Use fetched data.

### 7.3 Media Service Total Crash
If Media Service (all workers) is unreachable:
1.  **Detect:** Timeout on `sfu_create_transport`.
2.  **Action:**
    *   Emit `error` to client: "Media Server Unavailable".
    *   Downgrade to P2P if participants < 4 (Optional).
    *   Prevent further `sfu_*` requests until health check passes.

### 7.4 Graceful Shutdown
```typescript
process.on('SIGTERM', async () => {
  io.close(); // Stop accepting new connections
  await redisPub.quit();
  await redisSub.quit();
  process.exit(0);
});
```
