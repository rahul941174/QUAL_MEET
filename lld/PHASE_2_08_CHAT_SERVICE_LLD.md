# Chat Service LLD (Phase 2 New)

## 1. Responsibility
The **Chat Service** handles the persistence and retrieval of chat history.

### Responsibilities
*   **Persistence:** Saving messages to Postgres.
*   **History:** Serving paginated chat history.
*   **Sanitization:** Cleaning input (no scripts).

---

## 2. Database Schema

**Table: `messages`**

| Column | Type |
| :--- | :--- |
| `id` | UUID (PK) |
| `room_id` | UUID (Index) |
| `sender_id` | UUID |
| `content` | TEXT |
| `created_at` | TIMESTAMP (Index) |

---

## 3. API

*   `POST /chats` (Internal use mostly, or via Gateway)
*   `GET /chats/:roomId` (Public, Paginated)

---

## 4. Integration
*   **Signaling Service** calls `POST /chats` asynchronously when it receives a `chat_message` via WebSocket.
*   **Frontend** calls `GET /chats/:roomId` when opening the chat panel.

### 4.1 Internal Authentication
*   **Middleware:** Validate `X-Internal-Service-Key` header.
*   **Reject:** 401 if header missing or invalid.
*   **Trust:** Only trust requests from Signaling Service with this key.

---

## 5. Failure Handling (Critical)

**Policy:** "Broadcast First, Persist Async".

1.  **Receive:** Signaling Service gets `chat_message`.
2.  **Broadcast:** Immediately publish to Redis Pub/Sub (Real-time delivery).
3.  **Persist:** Call Chat Service `POST /chats`.
    *   **Success:** No action.
    *   **Failure (500/Timeout):**
        *   Log error: `Failed to persist chat message for room {id}`.
        *   **Action:** Drop message from persistence queue.
        *   **User Impact:** Message appears in real-time session but is lost if page is refreshed.
        *   **Tradeoff:** Accepted for Phase 2 to prevent blocking the real-time pipe.
