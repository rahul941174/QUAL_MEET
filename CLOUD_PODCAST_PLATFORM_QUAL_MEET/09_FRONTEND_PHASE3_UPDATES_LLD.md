# Frontend Phase 3 Updates LLD

## 1. Goal
Implement the client-side logic for the Distributed Recording System and the Chat UI without breaking the existing WebRTC P2P mesh or Cookie Auth flow.

---

## 2. Distributed Recording Implementation

### 2.1. The `useRecording` Hook
This hook manages the `MediaRecorder` instance, chunk slicing, and upload coordination.

**Core Responsibilities:**
1.  Initialize recording session with the backend.
2.  Capture local media stream chunks (1-2 second intervals).
3.  Request pre-signed URLs.
4.  Upload chunks directly to S3/R2.
5.  Handle upload retries.

### 2.2. Recording Flow

**1. Start Recording:**
```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp8,opus' });
let chunkIndex = 0;
```

**2. Chunk Handling (`ondataavailable`):**
```typescript
recorder.ondataavailable = async (event) => {
  if (event.data && event.data.size > 0) {
    const chunk = event.data;
    const currentIndex = chunkIndex++;

    // 1. Get pre-signed URL from backend
    const { uploadUrl } = await api.getUploadUrl(sessionId, currentIndex);

    // 2. Upload directly to S3/R2 with retry logic
    await uploadChunkWithRetry(uploadUrl, chunk, 3);
  }
};

// Start slicing every 2000ms
recorder.start(2000);
```

**3. Stop Recording:**
```typescript
recorder.stop();
// Wait for any pending chunk uploads to finish in the queue
await api.completeRecording(sessionId);
```

### 2.3. Upload Reliability (Critical)
*   **Sequential Queue:** While chunks are generated every 2 seconds, network latency might cause uploads to overlap. The hook should ideally use a queue to ensure we don't saturate the client's uplink with 10 parallel PUT requests.
*   **Retry Logic:** If a PUT request to the `uploadUrl` fails, retry up to 3 times with exponential backoff before marking the recording session as degraded.

---

## 3. Chat UI Implementation

### 3.1. Components
*   `ChatPanel`: A sidebar toggled via the control bar.
*   `MessageList`: Displays messages. Should auto-scroll to bottom on new messages.
*   `ChatInput`: Text input field.

### 3.2. Socket & State Flow
1.  **On Mount:** `GET /api/chats/:roomId` to load history.
2.  **Sending:**
    ```typescript
    socket.emit("chat_message", { content: textInput });
    ```
    *Optimistic UI update:* Immediately append the message to local state.
3.  **Receiving:**
    ```typescript
    socket.on("chat_message", (message) => {
      setMessages(prev => [...prev, message]);
    });
    ```

---

## 4. Stability Constraints
*   **Do Not Touch ICE Logic:** The existing ICE restart and TURN refresh logic must remain untouched.
*   **Auth:** Continue using `credentials: "include"` for all fetch calls.
*   **Screen Share Lock:** Ensure starting a recording does not interfere with the Redis screen share lock logic.