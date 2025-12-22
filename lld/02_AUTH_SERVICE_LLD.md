# Auth Service LLD (Low Level Design)

## 1. Responsibility & Scope

The **Auth Service** is the foundation of identity. It is responsible for verifying who a user is and issuing secure tokens for other services to trust.

### Responsibilities
*   **User Registration:** Validating input and storing new user credentials.
*   **Authentication:** Verifying credentials (email/password) and issuing JWTs.
*   **Password Security:** Hashing passwords using `bcrypt` (or Argon2).
*   **Token Management:** Defining JWT payload structure and managing the **Private Key** for signing.

### Out of Scope
*   **Session Management:** Stateless JWTs are used; no server-side sessions.
*   **OAuth/Social Login:** Phase 1 is email/password only.

---

## 2. Database Schema

**Table: `users`**

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default: `gen_random_uuid()` | Unique User ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hash of password |
| `full_name` | VARCHAR(100) | NOT NULL | Display name for meetings |
| `created_at` | TIMESTAMP | DEFAULT: `NOW()` | Account creation time |

---

## 3. Signup Flow

**Endpoint:** `POST /auth/signup`

1.  **Input Validation:**
    *   `email`: Valid email format.
    *   `password`: Min 8 chars.
    *   `fullName`: Non-empty.
2.  **Duplicate Check:**
    *   Query DB: `SELECT 1 FROM users WHERE email = ?`.
    *   If exists -> Return `409 Conflict`.
3.  **Hashing:**
    *   `hash = bcrypt.hash(password, 10 salt rounds)`.
4.  **Persistence:**
    *   `INSERT INTO users (email, password_hash, full_name) VALUES (...)`.
5.  **Response:**
    *   Return `201 Created` (No token, force login).

---

## 4. Login Flow

**Endpoint:** `POST /auth/login`

1.  **Input Validation:**
    *   Check presence of email/password.
2.  **User Lookup:**
    *   `SELECT * FROM users WHERE email = ?`.
    *   If null -> Return `401 Unauthorized`.
3.  **Password Verification:**
    *   `match = bcrypt.compare(input_password, stored_hash)`.
    *   If false -> Return `401 Unauthorized`.
4.  **JWT Generation:**
    *   **Payload:** `{ userId: user.id, email: user.email, name: user.full_name }`.
    *   **Expiration:** 24 Hours (`1d`).
    *   **Algorithm:** **RS256** (Asymmetric).
    *   **Signing:** Sign using the **Private Key** stored securely in the Auth Service.
5.  **Response:**
    *   Return `200 OK` `{ token: "ey..." }`.

---

## 5. JWT Generation Rules

*   **Key Management:**
    *   **Private Key:** Stored ONLY in Auth Service (Env var or Secret Manager). Used for **Signing**.
    *   **Public Key:** Distributed to Gateway and Signaling Service. Used for **Verification**.
*   **Payload Minimization:**
    *   Keep payload small to reduce network overhead on WebSocket handshakes.
    *   Include only essential identity data.

---

## 6. JWT Verification Rules

(Used by API Gateway and Signaling Service, but defined here)

*   **Signature Check:** Must verify using the **Public Key**.
*   **Expiration Check:** Reject if `exp < current_time`.
*   **Issuer Check (Optional):** Verify `iss` claim if added.

---

## 7. Error Cases & Security

*   **400 Bad Request:** Missing fields.
*   **401 Unauthorized:** Invalid credentials.
*   **409 Conflict:** User already exists.
*   **500 Internal Server Error:** DB failure.

**Security Constraints:**
*   Rate limit login attempts (via Gateway) to prevent brute force.
*   Never return specific error messages like "User not found" (use generic "Invalid credentials").
