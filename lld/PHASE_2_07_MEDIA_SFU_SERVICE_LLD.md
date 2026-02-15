# Media Service (SFU) LLD (Phase 2 New)

## 1. Responsibility
The **Media Service** is a dedicated node (or cluster) for handling high-bandwidth WebRTC traffic using **Mediasoup**.

### Responsibilities
*   **WebRTC Termination:** Handling Producers (Uploads) and Consumers (Downloads).
*   **Routing:** Forwarding media packets.
*   **Simulcast:** Managing quality layers (Low/Med/High).
*   **DTLS/SRTP:** Encryption termination.

---

## 2. Architecture

**Library:** `mediasoup` (v3).

**Worker Structure:**
*   **1 Worker per CPU Core.**
*   **Router:** 1 Router per Room. (Router lives on a specific Worker).

---

## 3. Signaling Interaction

This service does **not** have a WebSocket server. It communicates via **gRPC** or **HTTP** (Internal) with the **Signaling Service**.

**API:**
*   `POST /routers` (Create Router for Room)
*   `POST /transports` (Create WebRTC Transport)
*   `POST /producers` (Connect Producer)
*   `POST /consumers` (Connect Consumer)

---

## 4. Deployment

*   **Host Networking:** Critical. Docker container must use `network_mode: host` or define wide UDP port ranges (e.g., 40000-49999).
*   **Announced IP:** Must be the public IP of the VM (Phase 2 Cloud Deployment).

---

## 5. Scaling & Rebalancing

**Constraint:** 1 Worker = 1 CPU Core.
**Limit:** Approx 500 Consumers per Worker (conservative).
**Max Routers/Worker:** 50 (Soft limit).

**Load Balancing Logic:**
1.  **Placement:** Signaling Service queries Media Service for "Least Loaded Worker" (by # of routers).
2.  **Assignment:** Room ID is hashed to a Worker ID (Sticky) OR assigned dynamically.

**Rebalancing:**
*   Not supported in Phase 2 (Simple).
*   If a worker is full, new rooms are rejected or assigned to a new node.

## 6. Failure Handling (Worker Crash)

**Event:** `worker.on('died')`
1.  **Detection:** Media Service detects child process exit.
2.  **Cleanup:** Remove all Routers associated with that worker.
3.  **Notification:** Inform Signaling Service that Room X is dead.
4.  **Orphaned State Cleanup:**
    *   Signaling Service MUST clear the `room:{id}:router` key from Redis.
    *   Signaling Service MUST clear `room:{id}:presence` to prevent ghost users.
5.  **Recovery:** Signaling Service emits `error` event -> Frontend reloads page -> New Router assigned.
