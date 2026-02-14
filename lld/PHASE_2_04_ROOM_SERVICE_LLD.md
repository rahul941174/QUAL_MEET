# Room Service LLD (Phase 2)

## 1. Phase 2 Upgrades
*   **Redis Caching:** Performance optimization.
*   **Room Modes:** P2P vs SFU decision logic.
*   **Participant Limits:** Increased for SFU rooms.

---

## 2. Redis Caching Strategy

**Pattern:** Cache-Aside.

**Read Flow (`GET /rooms/:id`):**
1.  Check Redis: `GET room:{id}`.
2.  If Hit: Return JSON.
3.  If Miss:
    *   Query Postgres.
    *   Write to Redis (`EX 3600`).
    *   Return JSON.

**Write Flow (Update/Participant Join):**
1.  Update Postgres.
2.  Invalidate Redis: `DEL room:{id}` OR Update Redis (Write-Through).

---

## 3. Room Modes

**Enum:** `RoomMode` { `P2P`, `SFU` }

**Logic:**
*   Default: `P2P`.
*   If `maxParticipants` > 4 (configured limit) -> `SFU`.
*   Stored in DB and Redis.

**Signaling Impact:**
*   Signaling Service reads `RoomMode` from Redis.
*   If `SFU`, it triggers Mediasoup logic instead of P2P relay.

---

## 4. Large Room Optimization
*   **Participant List:** For >50 users, do not return full list in one payload.
*   **Pagination:** `GET /rooms/:id/participants?page=1`.
*   (For Phase 2 start, we stick to <50, so full list is fine).
