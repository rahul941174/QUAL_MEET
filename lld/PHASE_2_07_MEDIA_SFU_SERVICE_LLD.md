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
