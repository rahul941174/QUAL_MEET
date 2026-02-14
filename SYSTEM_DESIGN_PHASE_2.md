# QUAL_MEET System Design Document (Phase 2)

## 1. Executive Summary

**QUAL_MEET Phase 2** transforms the platform from a P2P mesh prototype into a scalable, production-grade conferencing system.
Phase 2 introduces **Media Servers (SFU)** for large meetings, **Persistent Chat**, **Robust Authentication (Cookies)**, and **Redis-based Scaling**.

### Core Goals (Phase 2)
- **Scalable Media:** Support 50+ participants using an SFU (Selective Forwarding Unit).
- **Security Hardening:** Move from LocalStorage to **HttpOnly Cookies** for token storage.
- **Reliability:** Robust reconnection logic, ICE restarts, and Redis-backed state.
- **Rich Features:** Persistent Chat, Recording (Future), and Screen Sharing optimization.

---

## 2. System Architecture (Updated)

The Microservices architecture is expanded with new services and a dedicated Data Layer for ephemeral state.

### High-Level Components

1.  **Client (Frontend):** React + WebRTC (Mesh & SFU Consumers).
2.  **Load Balancer (Nginx/ALB):** Terminates SSL, routes HTTP/WSS.
3.  **API Gateway:**
    *   **UPDATED:** Reads **HttpOnly Cookies** for Auth.
    *   **UPDATED:** Implements **Redis Rate Limiting**.
4.  **Microservices:**
    *   `auth-service`: Identity (Cookie issuance).
    *   `room-service`: Meeting lifecycle + **Redis Caching**.
    *   `turn-credential-service`: ICE credentials + **Redis Quota**.
    *   `signaling-service`: **Redis Pub/Sub** for multi-node scaling.
    *   **[NEW]** `media-service`: Mediasoup-based SFU for large rooms.
    *   **[NEW]** `chat-service`: Persistent chat history (PostgreSQL).
5.  **Data Layer:**
    *   **PostgreSQL:** Users, Meetings, **Chat Messages**.
    *   **Redis:**
        *   **Pub/Sub:** Signaling events across nodes.
        *   **Presence:** Real-time user lists (`room:{id}:users`).
        *   **Cache:** Room metadata, Rate limits.

---

## 3. Component Details (Phase 2)

### 3.1 Frontend (`/frontend`)
*   **Auth:** No longer stores JWT in `localStorage`. Uses `credentials: 'include'` for API calls.
*   **Connection Monitoring:**
    *   Monitors `iceConnectionState`.
    *   Triggers **ICE Restart** on `disconnected`.
    *   Hard reload/re-join on `failed`.
*   **ICE Refresh:** Scheduled background task (every 45m) to fetch new TURN credentials.
*   **Topology Switching:**
    *   < 4 users: **P2P Mesh** (Direct).
    *   > 4 users: **SFU** (Via `media-service`).

### 3.2 API Gateway (`/api-gateway`)
*   **Cookie Extraction:** Middleware reads `access_token` from cookies.
*   **Redis Rate Limit:** Uses `rate-limit-redis` to strictly enforce global limits across gateway instances.

### 3.3 Auth Service (`/auth-service`)
*   **Cookie Logic:**
    *   On Login: `res.cookie('access_token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' })`.
    *   On Logout: Clears cookie.
*   **Refresh Token (Optional Phase 2):** Implement rotation if strict security is needed, or stick to long-lived JWT in cookie for now (24h).

### 3.4 Room Service (`/room-service`)
*   **Redis Caching:**
    *   Cache `room:{id}` metadata (host, mode, active status).
    *   TTL: 24h.
*   **Mode Switching:** Determines if a room should be P2P or SFU based on `maxParticipants`.

### 3.5 Signaling Service (`/signaling-service`)
*   **Redis Pub/Sub (Critical):**
    *   Replaces in-memory room maps.
    *   Node A publishes to `channel:room:{id}`.
    *   Node B receives and forwards to local sockets.
*   **Chat Relay:** Forwards chat messages to `chat-service` for persistence (async) while broadcasting via WS (real-time).

### 3.6 [NEW] Media Service (`/media-service`)
*   **Tech:** Node.js + **Mediasoup**.
*   **Responsibilities:**
    *   **Router:** Manages WebRTC Transports (Producers/Consumers).
    *   **SFU:** Receives 1 stream, forwards to N consumers.
    *   **Optimization:** Simulcast (quality tiers) handling.

### 3.7 [NEW] Chat Service (`/chat-service`)
*   **Tech:** Node.js + PostgreSQL.
*   **Responsibilities:**
    *   Store messages: `INSERT INTO messages ...`
    *   Fetch history: `GET /chats/:roomId`.

---

## 4. Data Design (Phase 2)

### 4.1 PostgreSQL Schema

**Messages Table (New)**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES meetings(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Redis Structures (Mandatory)

1.  **Presence:** `room:{id}:presence` (Hash: `userId` -> `nodeId`).
2.  **Rate Limit:** `rl:{ip}` (Counter).
3.  **Room Cache:** `cache:room:{id}` (JSON).
4.  **Pub/Sub Channels:** `events:{roomId}`.

---

## 5. Interface & Protocols (Phase 2)

### 5.1 Authentication Flow (Cookies)
1.  **Login:** `POST /api/auth/login` -> Returns 200 OK + `Set-Cookie`.
2.  **API Call:** Frontend sends request (Browser attaches Cookie).
3.  **Gateway:** Verifies Cookie Signature -> Injects Headers -> Proxies.
4.  **Socket.IO:** Handshake includes Cookie -> Verified by `io.use`.

### 5.2 Signaling Events (Expanded)
*   `sfu_join`: Request to join SFU router.
*   `sfu_produce`: Publish a stream to SFU.
*   `sfu_consume`: Subscribe to a stream from SFU.
*   `chat_message`: Text message payload.

---

## 6. Implementation Strategy (Phase 2)

1.  **Auth Hardening:** Migrate to Cookies.
2.  **Frontend Cleanup:** Implement ICE Refresh & Reconnection monitors.
3.  **Redis Infrastructure:** Spin up Redis, update Gateway/Signaling.
4.  **Chat Service:** Build persistence.
5.  **Media Service (SFU):** Build the Mediasoup worker.
6.  **Frontend SFU Integration:** Add `useMediasoup` hook.
