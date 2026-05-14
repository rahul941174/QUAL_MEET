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
  *   **Scaling:** 1 Worker per CPU core. If a worker crashes, room closes (Phase 2 simplicity).

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
5.  **TURN Quota:** `quota:turn:{userId}` (Counter).

---

## 5. Interface & Protocols (Phase 2)

### 5.1 Authentication Flow (Cookies)
1.  **Login:** `POST /api/auth/login` -> Returns 200 OK.
    *   `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=3600` (Short-lived)
    *   `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh` (Long-lived 7d)
2.  **API Call:** Frontend sends request (Browser attaches Cookie).
3.  **Gateway:** Verifies Cookie Signature -> Injects Headers -> Proxies.
4.  **Token Expiry:**
    *   Frontend detects 401.
    *   Frontend calls `POST /auth/refresh` (Browser sends refresh cookie).
    *   Auth Service verifies refresh token -> Sets new access cookie.
    *   Frontend retries original request.

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

---

## 7. TURN Infrastructure (New Critical Section)

Phase 2 requires a dedicated **Coturn** deployment, not just credential issuance.

### 7.1 Deployment Specs
*   **Host:** Dedicated VM (e.g., EC2 t3.medium or larger). **High Bandwidth** is critical.
*   **Public IP:** Elastic IP required (Static).
*   **Network:** `host` networking mode (Docker) to avoid NAT issues.

### 7.2 Port Configuration
*   **Listening:**
    *   UDP 3478 (Standard)
    *   TCP 3478 (Fallback)
    *   TLS 5349 (Secure - Required for enterprise firewalls)
*   **Relay Range:**
    *   UDP 40000-49999 (Must be opened in AWS Security Group / Firewall).

### 7.3 Authentication Configuration (`turnserver.conf`)
*   `use-auth-secret`
*   `static-auth-secret=<random_string>`
*   `realm=turn.qualmeet.com`
*   `no-cli`
*   `no-loopback-peers`
*   `no-multicast-peers`

### 7.4 TLS Certificates
*   **Requirement:** Valid Let's Encrypt or paid certificate.
*   **Path:** `/etc/letsencrypt/live/turn.qualmeet.com/fullchain.pem`.
*   **Why?** Many corporate networks block non-TLS traffic on port 3478.

### 7.5 Scaling Strategy
*   **Stateless:** TURN servers share the same `static-auth-secret`.
*   **Load Balancing:** DNS Round Robin (A records) creates a simple cluster.
*   **Geo-Distribution:** Deploy TURN nodes in different regions (US-East, EU-West) and use Geo-DNS.

---

## 8. Redis High Availability (New Critical Section)

The entire real-time system depends on Redis. A single instance is a single point of failure (SPOF).

### 8.1 Deployment Mode
*   **Requirement:** Redis **Sentinel** (Minimum 3 nodes: 1 Master, 2 Replicas).
*   **Failover:** If Master dies, Sentinel promotes a Replica.
*   **Client:** `ioredis` supports Sentinel connections natively.

### 8.2 Persistence
*   **RDB:** Snapshots every 15 minutes (Backup).
*   **AOF:** Append Only File (Every second).
*   **Why?** Presence data is ephemeral, but Rate Limits and Room Metadata should survive a restart.

---

## 9. Failure Handling Strategies

### 9.1 Chat Service Failure
*   **Policy:** "Broadcast First, Persist Async".
*   **Scenario:** Database is down.
*   **Action:** Signaling Service broadcasts the message to the room via Redis Pub/Sub so real-time conversation continues.
*   **Log:** Error logged to Kibana/CloudWatch.
*   **Impact:** Chat history will be missing for that period, but the meeting is not disrupted.

### 9.2 Media Worker Crash
*   **Scenario:** The Mediasoup Worker hosting Room A crashes.
*   **Detection:** Signaling Service loses connection to Media Service (gRPC/HTTP timeout).
*   **Action:**
    1.  Signaling Service detects failure.
    2.  Emits `error` to all clients in Room A: "Media Server lost. Reconnecting...".
    3.  Frontend triggers `window.location.reload()` or internal re-join logic.
    4.  New Room allocation assigns a healthy Worker.
