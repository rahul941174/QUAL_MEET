# QUAL_MEET System Design Document (Phase 1)

## 1. Executive Summary

**QUAL_MEET** is a browser-based online meeting platform designed for reliability, scalability, and security. 
Phase 1 focuses on a Peer-to-Peer (P2P) mesh architecture using WebRTC, supported by a scalable signaling backend and robust authentication.

### Core Goals (Phase 1)
- **P2P Video/Audio:** High-quality real-time communication without a media server (SFU).
- **Authenticated Access:** Secure entry via JWT.
- **Scalable Signaling:** Distributed WebSocket servers using Redis Pub/Sub.
- **Connectivity:** Reliable NAT traversal via COTURN (STUN/TURN).

---

## 2. System Architecture

The system follows a **Microservices** architecture orchestrated within a Monorepo. Traffic is routed through a central API Gateway, while real-time signaling is handled by a dedicated service cluster.

### High-Level Components

1.  **Client (Frontend):** React SPA + WebRTC API.
2.  **Load Balancer (Nginx/ALB):** Terminates SSL, routes HTTP to Gateway and WSS to Signaling.
3.  **API Gateway:** Single entry point for all RESTful operations.
4.  **Microservices:**
    *   `auth-service`: Identity management.
    *   `room-service`: Meeting lifecycle and metadata.
    *   `turn-credential-service`: Ephemeral ICE credentials.
    *   `signaling-service`: Real-time WebSocket mesh.
5.  **Data Layer:**
    *   **PostgreSQL:** Durable storage (Users, Meeting history).
    *   **Redis:** Ephemeral state (Presence, Pub/Sub, Caching).

---

## 3. Component Details

### 3.1 Frontend (`/frontend`)
*   **Tech:** React, TypeScript, Native WebRTC API.
*   **Responsibilities:**
    *   User Login/Signup.
    *   Room Creation/Joining.
    *   Media Device Access (Camera/Mic).
    *   WebRTC PeerConnections (Mesh Topology).
    *   Handling WebSocket Signaling events.

### 3.2 API Gateway (`/api-gateway`)
*   **Tech:** Node.js (Express/Fastify), `http-proxy-middleware`.
*   **Responsibilities:**
    *   Request Routing:
        *   `/api/auth/*` → `auth-service`
        *   `/api/rooms/*` → `room-service`
        *   `/api/ice/*` → `turn-credential-service`
    *   Authentication Middleware (verifies JWT before passing to services).
    *   Rate Limiting.

### 3.3 Auth Service (`/auth-service`)
*   **Tech:** Node.js.
*   **Responsibilities:**
    *   User Registration (bcrypt password hashing).
    *   Login (Issue JWT).
    *   JWT Validation logic (**RS256** Public/Private key pair).

### 3.4 Room Service (`/room-service`)
*   **Tech:** Node.js, PostgreSQL, Redis.
*   **Responsibilities:**
    *   **Create Room:** Generate unique Room ID, store in DB.
    *   **Validate Room:** Check if room exists and is active.
    *   **Participant Management:** Enforce max participant limits (Phase 1 constraint).
    *   **Cache:** Write-through caching to Redis for fast lookups.
    *   **Mesh Constraint (Phase 1):** Rooms are limited to a maximum of **N participants (e.g., 4–6)**. Beyond this limit, SFU is required (Phase 2).

### 3.5 TURN Credential Service (`/turn-credential-service`)
*   **Tech:** Node.js.
*   **Responsibilities:**
    *   Generate time-limited credentials for COTURN.
    *   Return list of ICE Servers (STUN + TURN).
    *   **Abuse Protection:** 
        *   TURN credentials are short-lived (≤60 minutes).
        *   Rate-limited per user.
        *   Redis tracks issuance to prevent abuse.

### 3.6 Signaling Service (`/signaling-service`)
*   **Tech:** Node.js, Socket.IO / `ws`, Redis Pub/Sub.
*   **Responsibilities:**
    *   Handle WebSocket upgrades.
    *   **Room Presence:** Track who is in which room using Redis Sets/Keys with TTL.
    *   **Message Routing:** Relay SDP Offers, Answers, and ICE Candidates.
    *   **Scaling:** Use Redis Pub/Sub to allow users connected to *different* signaling nodes to communicate in the same room.
    *   **WebSocket Authentication:**
        *   Clients **MUST** pass a JWT in the WebSocket **auth payload** (not URL query params).
        *   The signaling service verifies the JWT **locally** before allowing any room interaction.
        *   Connection is rejected if:
            *   Token is missing
            *   Token is invalid
            *   Token is expired

---

## 4. Data Design

### 4.1 PostgreSQL Schema (Durable)

**Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Meetings Table**
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  max_participants INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Redis Structures (Ephemeral)

*   **Presence:**
    *   Key: `presence:{roomId}:{userId}`
    *   Value: `timestamp` or `socketId` (Metadata)
    *   TTL: 30 seconds (Heartbeat refreshes this).
    *   **Cleanup:** TTL is strictly for data cleanup in Redis. Detection of disconnected users relies on **WebSocket disconnection** events or **Client-side ICE state monitoring**, not Redis Key Expiry notifications (which are unreliable).
*   **Room Cache:**
    *   Key: `room:{roomId}`
    *   Value: JSON object of room details.
*   **Pub/Sub Channels:**
    *   Channel: `room_events:{roomId}`
    *   Payload: `{ type: 'OFFER', from: 'A', to: 'B', data: ... }`

---

## 5. Interface & Protocols

### 5.1 HTTP API (via Gateway)

| Method | Endpoint | Service | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/signup` | Auth | Create new user |
| POST | `/api/auth/login` | Auth | Get JWT |
| POST | `/api/rooms` | Room | Create new meeting |
| GET | `/api/rooms/:id` | Room | Validate/Fetch room info |
| GET | `/api/ice-servers` | TurnCred | Get STUN/TURN config |

### 5.2 WebSocket Signaling Events

**Client -> Server**
*   `join_room`: `{ roomId }`
*   `offer`: `{ targetUserId, sdp }`
*   `answer`: `{ targetUserId, sdp }`
*   `ice_candidate`: `{ targetUserId, candidate }`
*   `heartbeat`: `{}` (Keep alive)

**Server -> Client**
*   `room_joined`: `{ existingPeers: [userId, ...] }`
*   `user_joined`: `{ userId }`
*   `user_left`: `{ userId }`
*   `offer`: `{ senderUserId, sdp }`
*   `answer`: `{ senderUserId, sdp }`
*   `ice_candidate`: `{ senderUserId, candidate }`

### 5.3 WebRTC Negotiation Rules
*   **Existing peers** initiate SDP offers.
*   **Newly joined peer** only responds with SDP answers.
*   ICE candidates may arrive before SDP and **must be buffered**.

---

## 6. Implementation Strategy

### Phase 1 Execution Order
1.  **Auth Service:** Build foundation (Login/Signup).
2.  **API Gateway:** Secure traffic flow.
3.  **Room Service:** Establish meeting contexts.
4.  **TURN Service:** Enable connectivity.
5.  **Signaling Service:** Build the mesh network logic.
6.  **Frontend:** Integrate WebRTC.

### Key Constraints
*   **No SFU:** Clients send media to *every* other peer (Mesh).
*   **No Recording:** Ephemeral media only.
*   **Strict Layering:** Backend never parses media, only relays signals.

---

## 7. Infrastructure

*   **Docker:** Each service has its own `Dockerfile`.
*   **Docker Compose:** Orchestrates local development with Postgres and Redis containers.
*   **Environment:** managed via `.env` files passed into containers.
