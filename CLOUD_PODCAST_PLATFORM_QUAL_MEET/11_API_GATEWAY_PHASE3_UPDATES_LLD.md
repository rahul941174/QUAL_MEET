# API Gateway Phase 3 Updates LLD

## 1. Goal
Expose the new Media Recording Service and the internal Chat History endpoints securely to the frontend via the API Gateway, ensuring cookie-based authentication is strictly enforced.

---

## 2. Route Definitions

The API Gateway (`app.ts` / `routes.ts`) needs to be updated with new proxy middleware configurations.

### 2.1. Media Recording Routes
*   **Path:** `/api/media/*`
*   **Target:** `http://media-recording-service:PORT` (or via Docker network alias)
*   **Auth Required:** YES. The JWT verification middleware must execute before proxying.
*   **Path Rewrite:** Strip `/api` so the service receives `/media/*` (or configure service to expect `/api/media`).
*   **Rate Limiting:** Apply standard authenticated user rate limits.

### 2.2. Chat History Routes
*   **Path:** `/api/chats/*`
*   **Target:** `http://signaling-service:PORT`
*   **Auth Required:** YES.
*   **Path Rewrite:** Strip `/api` so the service receives `/chats/*`.
*   **Note:** Because we merged the Chat Service into the Signaling Service, chat REST endpoints are handled by the Express app running alongside the Socket.IO instance in the Signaling Service.

---

## 3. Auth Middleware Consistency

No changes are required to the Auth Middleware itself. It should continue to:
1. Read the `access_token` from `req.cookies`.
2. Verify using the RS256 Public Key.
3. Inject `x-user-id`, `x-user-email`, `x-user-name` into the proxy headers.

Both the Media Recording Service and Signaling Service will rely on these injected headers to identify the user making the REST request.