# Signaling Service Phase 3 Updates LLD

## 1. Goal
Integrate the real-time chat broadcasting mechanism into the existing Signaling Service without degrading the performance of the WebRTC signaling pathways.

---

## 2. Chat Event Broadcasting

The Signaling Service must handle the new `chat_message` socket event.

### 2.1. Handling Incoming Messages
**Event:** `socket.on("chat_message", (data))`

**Logic:**
1.  **Extract Data:** Get `content` from the payload, and `userId`, `roomId` from the `socket.data` context.
2.  **Construct Payload:** Create a standardized message object including a generated ID and timestamp.
    ```javascript
    const messagePayload = {
      id: generateUUID(),
      senderId: socket.data.user.userId,
      roomId: currentRoomId,
      content: data.content,
      createdAt: new Date().toISOString()
    };
    ```
3.  **Broadcast (Redis Pub/Sub):** Publish the payload to the room's Redis channel so all signaling nodes receive it.
    ```javascript
    redisClient.publish(`channel:room:${currentRoomId}`, JSON.stringify({
      type: 'CHAT_MESSAGE',
      payload: messagePayload
    }));
    ```
4.  **Persist (Async):** Trigger a fire-and-forget HTTP call to the Chat Service.
    ```javascript
    // Do NOT await this if it blocks the event loop significantly
    fetch('http://chat-service:3000/internal/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': process.env.INTERNAL_SERVICE_KEY
      },
      body: JSON.stringify(messagePayload)
    }).catch(err => console.error("Chat persistence failed", err));
    ```

### 2.2. Handling Redis Pub/Sub Messages
When the signaling node receives a `CHAT_MESSAGE` type from the Redis subscription:
1.  **Target:** Find all local sockets connected to that `roomId`.
2.  **Emit:** Send the payload to the clients.
    ```javascript
    io.to(roomId).emit("chat_message", messagePayload);
    ```

---

## 3. Redis Hardening (Phase 3 Maintenance)

While adding chat, ensure the following Redis fail-safes are strictly enforced:

*   **Presence Drift:** Ensure `cleanupStaleUsers()` actively checks the `presence:{socketId}` TTL and forcefully emits `user_left` if a heartbeat is missed, cleaning up local maps.
*   **Lock Recovery:** Ensure the Screen Share lock (`room:{roomId}:screen_share`) strictly relies on its 30s TTL. If a node crashes while holding the lock, it will naturally expire, allowing another user to acquire it.

---

## 4. Auth Hardening (WebSocket)

Minor update to the `io.use` middleware:
*   Ensure the cookie parser can handle `=` characters inside the JWT or other cookie values gracefully.
*   Ensure leading/trailing whitespace on cookie keys is trimmed.
*   Use `err.name` for more precise error logging on auth failures.