# API Gateway Phase 3 Updates LLD

## 1. Goal
Expose the new Media Recording Service and Chat Service endpoints securely to the frontend via the API Gateway, ensuring cookie-based authentication is strictly enforced.

---

## 2. Route Definitions

The API Gateway (`app.ts` / `routes.ts`) needs to be updated with new proxy middleware configurations.

### 2.1. Media Recording Routes
*   **Path:** `/api/media/*`
*   **Target:** `http://media-recording-service:PORT` (or via Docker network alias)
*   **Auth Required:** YES. The JWT verification middleware must execute before proxying.
*   **Path Rewrite:** Strip `/api` so the service receives `/media/*` (or configure service to expect `/api/media`).
*   **Rate Limiting:** Apply standard authenticated user rate limits.

### 2.2. Chat Routes
*   **Path:** `/api/chats/*`
*   **Target:** `http://chat-service:PORT`
*   **Auth Required:** YES.
*   **Path Rewrite:** Strip `/api` so the service receives `/chats/*`.

---

## 3. Internal Routing Constraints

*   **Blocked Routes:** The API Gateway MUST NOT expose the `/internal/chats` endpoint of the Chat Service. The Gateway routing rules should strictly proxy `/api/chats/*` to `/chats/*`, ensuring no external user can hit the internal persistence API.
*   **Internal Service Key:** The Gateway does not handle the `X-Internal-Service-Key`. This is exclusively used for backend-to-backend communication (e.g., Signaling to Chat).

---

## 4. Auth Middleware Consistency

No changes are required to the Auth Middleware itself. It should continue to:
1. Read the `access_token` from `req.cookies`.
2. Verify using the RS256 Public Key.
3. Inject `x-user-id`, `x-user-email`, `x-user-name` into the proxy headers.

Both the Media Recording Service and Chat Service will rely on these injected headers to identify the user making the request (e.g., to ensure User A cannot request a recording session for User B).