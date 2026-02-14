# API Gateway LLD (Phase 2)

## 1. Phase 2 Upgrades
*   **Cookie Auth:** Middleware extracts token from cookies.
*   **Redis Rate Limiting:** Distributed rate limiting.
*   **Route Updates:** New routes for Media and Chat services.

---

## 2. Auth Middleware (Updated)

**Logic:**
1.  **Check Headers:** `Authorization: Bearer ...` (Support mobile apps/CLI).
2.  **Check Cookies:** `req.cookies['access_token']` (Browser support).
3.  **Priority:** Header > Cookie.
4.  **Verification:** Same RS256 logic.

**Code Snippet:**
```typescript
const token = req.headers.authorization?.split(" ")[1] || req.cookies.access_token;
if (!token) throw new UnauthorizedError();
```

---

## 3. Redis Rate Limiting

**Library:** `rate-limit-redis` + `express-rate-limit`.

**Buckets:**
1.  **Global:** 1000 req/min per IP.
2.  **Auth:** 5 login attempts/min per IP.
3.  **Room Creation:** 10 rooms/hour per User.

**Redis Key:** `rl:{ip}:{route}`.

---

## 4. New Routes

| Path | Target Service | Auth? |
| :--- | :--- | :--- |
| `/api/media/*` | `media-service` | YES |
| `/api/chats/*` | `chat-service` | YES |

---

## 5. CORS Configuration (Critical for Cookies)

To allow Cookies, CORS must be strict:
*   `origin`: Must be exact (e.g., `https://qualmeet.com`). **Wildcard `*` is forbidden** with `credentials: true`.
*   `credentials`: `true`.
