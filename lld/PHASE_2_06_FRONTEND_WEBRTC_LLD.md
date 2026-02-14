# Frontend WebRTC LLD (Phase 2)

## 1. Phase 2 Upgrades
*   **Robustness:** ICE Refresh, Connection Monitoring (The "Phase 1 Leftovers").
*   **Auth:** Cookie-based flow.
*   **SFU Support:** `useMediasoup` hook.
*   **Chat UI:** Side panel for persistent chat.

---

## 2. Robust Connection Monitoring (Priority)

**Hook:** `useConnectionHealth(pc)`

**Logic:**
1.  **Listen:** `pc.oniceconnectionstatechange`.
2.  **Disconnected:**
    *   Network glitch.
    *   Action: `pc.restartIce()`.
    *   UI: Show "Reconnecting..." toast.
3.  **Failed:**
    *   Fatal error (Firewall/Block).
    *   Action: Prompt user to "Reload".
    *   (Auto-reload is risky, user action preferred).

---

## 3. Scheduled ICE Refresh

**Problem:** TURN credentials expire (e.g., 60 mins). Long meetings will fail.

**Solution:**
1.  **Timer:** `setInterval` (e.g., every 45 mins).
2.  **Fetch:** `GET /api/turn/ice-servers`.
3.  **Update:**
    *   `pc.setConfiguration({ iceServers: newServers })`.
    *   **Action:** Trigger `pc.restartIce()` immediately to negotiate using the new credential.
    *   *Note:* Without `restartIce()`, the browser will keep using the old (expiring) credential until the connection drops. We want to preempt the drop.

---

## 4. Auth Refactor (Cookies)

**Changes:**
1.  **Login:** No `localStorage.setItem('token')`.
2.  **API Client:** `fetch(url, { credentials: 'include' })`.
3.  **Socket.IO:** `io(url, { withCredentials: true })`.
    *   Browser automatically sends the HttpOnly cookie.

### 4.1 Token Expiry Handling (Silent Refresh)

**Interceptor Logic (Axios/Fetch Wrapper):**
1.  **Call API:** Returns `401 Unauthorized`.
2.  **Catch:**
    *   Call `POST /auth/refresh` (Cookie-based).
    *   **If 200 OK:** Retry original request.
    *   **If 401 Unauthorized:** Redirect to `/login` (Session expired).

---

## 5. SFU Integration (Conceptual)

**New Hook:** `useSFU(socket, roomId)`

**Logic:**
1.  **Join:** Emit `sfu_join`.
2.  **Produce:** `transport.produce({ track })`.
3.  **Consume:** Listen for `new_consumer` event -> `transport.consume()`.
4.  **UI:** Same `VideoGrid`, but `stream` source is from Mediasoup consumer, not P2P.

---

## 6. Chat UI

**Components:**
*   `ChatPanel`: Sidebar.
*   `MessageList`: Virtualized list of messages.
*   `ChatInput`: Text area.

**Flow:**
1.  **Send:** `socket.emit('chat_message', text)`.
2.  **Receive:** `socket.on('chat_message')` -> Append to state.
3.  **History:** On load, `GET /api/chats/:roomId`.
