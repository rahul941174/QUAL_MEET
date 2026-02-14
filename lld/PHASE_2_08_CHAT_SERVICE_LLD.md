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
| `created_at` | TIMESTAMP |

---

## 3. API

*   `POST /chats` (Internal use mostly, or via Gateway)
*   `GET /chats/:roomId` (Public, Paginated)

---

## 4. Integration
*   **Signaling Service** calls `POST /chats` asynchronously when it receives a `chat_message` via WebSocket.
*   **Frontend** calls `GET /chats/:roomId` when opening the chat panel.
