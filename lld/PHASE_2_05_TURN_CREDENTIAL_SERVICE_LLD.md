# TURN Credential Service LLD (Phase 2)

## 1. Phase 2 Upgrades
*   **Redis Quota:** Implementation of the rate limiting designed in Phase 1.
*   **Dynamic Secret:** Fetching TURN secret from a secure store (Vault/AWS Secrets) instead of `.env` (Future).

---

## 2. Redis Quota Implementation

**Goal:** Prevent users from generating infinite TURN credentials.

**Logic:**
1.  **Key:** `quota:turn:{userId}`.
2.  **Check:** `GET key`.
3.  **If > Limit (e.g., 10):** Throw `429 Too Many Requests`.
4.  **Else:**
    *   `INCR key`.
    *   `EXPIRE key 3600` (1 hour window).

---

## 3. ICE Server Config

**Optimized List:**
1.  **UDP TURN:** Preferred.
2.  **TCP TURN:** Fallback (Firewalls).
3.  **TLS TURN:** Fallback (Strict Firewalls).

(Phase 2 should ensure coturn is deployed with TLS certificates).
