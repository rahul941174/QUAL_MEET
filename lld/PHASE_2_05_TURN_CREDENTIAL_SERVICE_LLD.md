# TURN Credential Service LLD (Phase 2)

## 1. Phase 2 Upgrades
*   **Redis Quota:** Implementation of the rate limiting designed in Phase 1.
*   **Secret Rotation:** Strategy for zero-downtime secret updates.
*   **Dynamic Secret:** Fetching TURN secret from a secure store.

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

---

## 4. Secret Rotation Strategy

**Problem:** Changing `static-auth-secret` invalidates all active sessions and generated credentials.

**Solution:**
1.  **Configuration:** Support multiple secrets (Current + Previous).
    *   `TURN_SECRET_CURRENT=...`
    *   `TURN_SECRET_PREVIOUS=...`
2.  **Generation:** Always sign with `CURRENT`.
3.  **Validation (Coturn):** Coturn supports multiple secrets in newer versions, or we restart Coturn with the new secret during a maintenance window.
4.  **Coordination:**
    *   Update Env Var in Service.
    *   Restart Service.
    *   Update `turnserver.conf`.
    *   Restart Coturn (SIGHUP).
    *   *Note:* Existing TURN allocations might drop if Coturn doesn't support seamless reload. For Phase 2, we accept a brief disruption during maintenance.

---

## 5. ICE Restart Logic

**Critical Requirement:**
When the frontend fetches new ICE servers (e.g., via scheduled refresh), the mere presence of new config does **not** update the active connection.

**Rule:**
The Frontend **MUST** trigger `pc.restartIce()` if:
1.  The `iceConnectionState` is `disconnected` or `failed`.
2.  OR a proactive refresh timer fires (e.g., at 45m mark of a 60m TTL).
