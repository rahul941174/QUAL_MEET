# Frontend WebRTC LLD (Low Level Design)

## 1. App States

The application state machine drives the UI and logic:

1.  **IDLE (Logged Out):** Show Login/Signup.
2.  **AUTHENTICATED (Logged In):** Show Dashboard / Join Room input.
3.  **LOBBY (Pre-Join):** Show Camera/Mic preview, Device selection.
4.  **CONNECTING:** WebSocket connecting, exchanging keys.
5.  **IN_MEETING:** Grid view of peers, active audio/video.
6.  **RECONNECTING:** Network blip, attempting to restore.

---

## 2. API Interaction Flow

1.  **Login:** `POST /api/auth/login` -> Store JWT in LocalStorage/Memory.
2.  **Check Room:** `GET /api/rooms/:id` -> Verify validity.
3.  **Get ICE:** `GET /api/ice-servers` -> Store locally for `RTCPeerConnection`.
4.  **Scheduled ICE Refresh:**
    *   Set interval (e.g., every 45 minutes) to fetch new credentials from `/api/ice-servers`.
    *   Update `rtcConfig` for any *future* reconnections/restarts (existing PCs might need manual update if logic allows, or just use for new connections).

---

## 3. WebSocket Interaction Flow

1.  **Connect:** `io(URL, { auth: { token } })`. **(Query params are BANNED)**.
2.  **Join:** `emit('join_room', { roomId })`.
3.  **Listen:**
    *   `room_joined` -> Initialize Mesh.
    *   `user_joined` -> Create Offer (if already in room).
    *   `offer` -> Create Answer.
    *   `answer` -> Set Remote Description.
    *   `ice_candidate` -> Add to PC.
    *   `user_left` -> Close PC, Remove Video Element.

---

## 4. PeerConnection Lifecycle

We manage **One PC per Peer** (Mesh Topology).

`peers = Map<userId, RTCPeerConnection>`

**Creation with Constraints:**
```javascript
// Hardcoded Phase 1 Constraints to prevent CPU melt
const mediaConstraints = {
    audio: true,
    video: {
        width: { ideal: 320 },
        height: { ideal: 180 },
        frameRate: { ideal: 15 }
    }
};

const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
const pc = new RTCPeerConnection({ iceServers });
```

**Monitor Connection State (The "Die vs. Restart" Logic):**
```javascript
pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;

    if (state === 'disconnected') {
        // Network blip? Attempt Restart immediately.
        pc.restartIce();
        showUiToast("Reconnecting...");
    } else if (state === 'failed') {
        // Fatal error. Wait 10s then kill.
        setTimeout(() => {
            if (pc.iceConnectionState === 'failed') {
                peers.get(userId).close();
                peers.delete(userId);
                showUiToast("User disconnected");
            }
        }, 10000);
    }
};
```

**Teardown:**
```javascript
peers.get(userId).close();
peers.delete(userId);
```

---

## 5. SDP Handling Logic (Glare Fix)

1.  **Making Offer (Existing Peer):**
    *   `pc.createOffer()`
    *   `pc.setLocalDescription(offer)`
    *   `socket.emit('offer', { targetUserId, sdp: offer })`

2.  **Handling Offer (New Peer):**
    *   `pc.setRemoteDescription(new RTCSessionDescription(sdp))`
    *   `checkIceBuffer()` (See Section 6)
    *   `pc.createAnswer()`
    *   `pc.setLocalDescription(answer)`
    *   `socket.emit('answer', { targetUserId, sdp: answer })`

3.  **Handling Answer (Existing Peer):**
    *   `pc.setRemoteDescription(new RTCSessionDescription(sdp))`
    *   `checkIceBuffer()`

---

## 6. ICE Handling Logic (Buffer)

Because ICE candidates are UDP (fast) and SDP is signaling (slow), ICE often arrives first.

```javascript
const iceBuffer = {}; // { userId: [candidate, ...] }

function handleCandidate(userId, candidate) {
  const pc = peers.get(userId);
  if (pc.remoteDescription) {
    pc.addIceCandidate(candidate);
  } else {
    iceBuffer[userId].push(candidate);
  }
}

function checkIceBuffer(userId) {
  const pc = peers.get(userId);
  if (iceBuffer[userId]) {
    iceBuffer[userId].forEach(c => pc.addIceCandidate(c));
    delete iceBuffer[userId];
  }
}
```

---

## 7. UI State Updates

*   **Redux / Context API:** Store `peers` list.
*   **Video Grid:** Map `peers` to `<VideoPlayer stream={peer.stream} />`.
*   **Mute/Unmute:** Toggle `localStream.getAudioTracks()[0].enabled`.
*   **Toast:** Show "User joined", "User left".
