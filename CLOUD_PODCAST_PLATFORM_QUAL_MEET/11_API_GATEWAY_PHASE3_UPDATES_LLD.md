# API Gateway Phase 3 Updates LLD (Final)

## 1. Goal
Expose the new Media Recording Service and the internal Chat History endpoints securely to the frontend via the API Gateway, ensuring strict security boundaries and payload limits.

---

## 2. Route Definitions

The API Gateway (`app.ts` / `routes.ts`) needs to be updated with new proxy middleware configurations.

### 2.1. Media Recording Routes
*   **Path:** `/api/media/*`
*   **Target:** `http://media-recording-service:PORT`
*   **Auth Required:** YES. The JWT verification middleware must execute before proxying.
*   **Path Rewrite:** Strip `/api` so the service receives `/media/*`.
*   **Rate Limiting:** Apply standard authenticated user rate limits.
*   **🛡️ SECURITY - Payload Limits:** Explicitly limit JSON payload sizes (e.g., `express.json({ limit: '1mb' })`) on these routes to prevent abuse, even though media isn't uploaded here.

### 2.2. Chat History Routes
*   **Path:** `/api/chats/*`
*   **Target:** `http://signaling-service:PORT`
*   **Auth Required:** YES.
*   **Path Rewrite:** Strip `/api` so the service receives `/chats/*`.

---

## 3. Internal Routing Constraints (CRITICAL SECURITY)

The API Gateway is the public boundary. It **MUST NOT** expose internal communication paths to the internet.

*   **Blocked Routes:** Ensure the following patterns are explicitly blocked (return 404 or 403) at the Gateway layer:
    *   `/api/internal/*`
    *   `/api/media/internal/*`
    *   `/api/chats/internal/*`
*   **Internal Service Key:** The Gateway does not handle the `X-Internal-Service-Key`. This header is exclusively used for backend-to-backend communication (e.g., Signaling calling Room Service) and should be stripped if it is present on an incoming external request.

---

## 4. Auth Middleware Consistency

No changes are required to the Auth Middleware itself. It should continue to:
1. Read the `access_token` from `req.cookies`.
2. Verify using the RS256 Public Key.
3. Inject `x-user-id`, `x-user-email`, `x-user-name` into the proxy headers.

The Media Recording Service relies entirely on the `x-user-id` header to determine session ownership.