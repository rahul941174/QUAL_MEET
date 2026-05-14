# Auth Service LLD (Phase 2)

## 1. Phase 2 Upgrades
*   **Cookie Storage:** Move JWT from response body to HttpOnly Cookie.
*   **Refresh Tokens (Optional):** If stricter security is required. (We will document the Cookie flow first).
*   **Logout:** Explicit cookie clearing.

---

## 2. Cookie Configuration

**Security Headers:**
```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax', // Allow top-level navigation, block cross-site POST
  maxAge: 15 * 60 * 1000 // 15 Minutes (Short-lived Access)
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
};
```

---

## 3. Login Flow (Updated)

**Endpoint:** `POST /auth/login`

1.  **Validate:** Email/Password check (Same as Phase 1).
2.  **Generate JWT:** (Same as Phase 1).
3.  **Set Cookie:**
    ```typescript
    res.cookie('access_token', token, COOKIE_OPTIONS);
    ```
4.  **Response:**
    *   Return `200 OK` `{ user: UserDTO }`.
    *   **NO TOKEN** in the JSON body.

---

## 4. Logout Flow (New)

**Endpoint:** `POST /auth/logout`

1.  **Clear Cookie:**
    ```typescript
    res.clearCookie('access_token', COOKIE_OPTIONS);
    ```
2.  **Response:** `200 OK`.

---

## 5. Signup Flow (Updated)

**Endpoint:** `POST /auth/signup`

1.  **Create User:** (Same as Phase 1).
2.  **Auto-Login (Optional):**
    *   Generate Token.
    *   Set Cookie.
    *   Return User DTO.

---

## 6. Refresh Token Flow

**Endpoint:** `POST /auth/refresh`

**Prerequisite:**
*   `access_token` (Short-lived, e.g. 15m) -> In Memory or Cookie.
*   `refresh_token` (Long-lived, e.g. 7d) -> **Strict HttpOnly Cookie Path=/auth/refresh**.

**Flow:**
1.  **Extract:** Read `req.cookies['refresh_token']`.
2.  **Verify:** Check signature and DB whitelist (if implementing rotation).
3.  **Issue:**
    *   New Access Token.
    *   New Refresh Token (Rotation).
4.  **Set Cookies:** Update browser cookies.
5.  **CSRF Check:**
    *   **Strict Origin:** Request must originate from `https://app.qualmeet.com`.
    *   **Double Submit:** Verify `X-CSRF-Token` header matches `csrf_token` cookie.

---

## 7. Database Schema (Refresh Tokens)

**Table: `refresh_tokens`**
| Column | Type |
| :--- | :--- |
| `id` | UUID (PK) |
| `user_id` | UUID (Index) |
| `token_hash` | VARCHAR(255) |
| `expires_at` | TIMESTAMP |
| `revoked` | BOOLEAN |
| `device_info` | VARCHAR(255) |

**Logic:**
*   On Refresh: `UPDATE refresh_tokens SET revoked=true WHERE id=old_id`.
*   On Logout: `UPDATE refresh_tokens SET revoked=true WHERE user_id=...`.

---

## 8. Key Rotation Strategy (Future)
*   Store `kid` (Key ID) in JWT Header.
*   Auth Service exposes `/.well-known/jwks.json` for Gateway to fetch Public Keys dynamically.
*   (For Phase 2 start, stick to `.env` keys, but prepare for rotation).
