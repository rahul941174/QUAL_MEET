# Chat Service LLD (Phase 3)

## 1. Responsibility
The **Chat Service** is responsible for the persistent storage and retrieval of in-meeting chat messages. It ensures that chat history is not lost if a user reconnects or joins a meeting late.

### Responsibilities
*   **Persistence:** Saving chat messages to a PostgreSQL database.
*   **Retrieval:** Serving paginated chat history for a specific room.
*   **Sanitization:** Cleaning input to prevent XSS (though frontend should also handle this).

### Non-Responsibilities
*   **Real-time Broadcasting:** The Chat Service **does not** handle real-time WebSockets. That is the job of the Signaling Service using Redis Pub/Sub.

---

## 2. Core Architectural Rule: "Broadcast First, Persist Async"

To ensure the chat feels instantly responsive and doesn't block the signaling pipeline:
1.  **Client** emits `chat_message` to the **Signaling Service**.
2.  **Signaling Service** immediately broadcasts the message to all connected clients via Redis Pub/Sub.
3.  **Signaling Service** makes an asynchronous, fire-and-forget HTTP/gRPC call to the **Chat Service** to persist the message.

*Trade-off:* If the Chat Service database goes down, messages are still delivered in real-time, but history might be lost. This is an acceptable failure mode for Phase 3.

---

## 3. Database Schema

**Table: `messages`**
| Column       | Type      | Description                          |
| :---         | :---      | :---                                 |
| `id`         | UUID (PK) | Unique message ID                    |
| `room_id`    | UUID      | ID of the meeting (Indexed)          |
| `sender_id`  | UUID      | ID of the user who sent the message  |
| `content`    | TEXT      | The actual chat message              |
| `created_at` | TIMESTAMP | Time the message was sent (Indexed)  |

---

## 4. API Design

### 4.1. Save Message (Internal API)
**Endpoint:** `POST /internal/chats`
**Description:** Called internally by the Signaling Service to persist a message.
**Auth:** Requires `X-Internal-Service-Key` header.
**Request:**
```json
{
  "roomId": "room-uuid",
  "senderId": "user-uuid",
  "content": "Hello everyone!"
}
```
**Response:** `201 Created`

### 4.2. Get Messages (Public API)
**Endpoint:** `GET /chats/:roomId`
**Description:** Called by the Frontend when a user opens the chat panel or joins late.
**Auth:** Standard JWT Cookie verification via API Gateway.
**Query Params:** `?page=1&limit=50` (Optional pagination)
**Response:**
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "roomId": "room-uuid",
      "senderId": "user-uuid",
      "content": "Hello everyone!",
      "createdAt": "2023-10-27T10:00:00Z"
    }
  ]
}
```

---

## 5. Failure Handling

*   **Database Down:** If the `POST /internal/chats` request fails, the Signaling Service logs an error but does not retry indefinitely or crash. The real-time message has already been delivered to active participants.
*   **High Load:** If chat volume is extremely high, the Signaling Service could write messages to a Redis List (`chat:buffer:{roomId}`) and the Chat Service could consume and batch-insert them into PostgreSQL. For Phase 3, direct async HTTP calls are sufficient.