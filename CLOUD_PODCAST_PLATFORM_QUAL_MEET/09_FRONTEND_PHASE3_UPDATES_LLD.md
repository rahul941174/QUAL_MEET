# Frontend Phase 3 Updates LLD (Final)

## 1. Goal
Implement the client-side logic for the Distributed Recording System and the Chat UI securely and reliably.

---

## 2. Distributed Recording Implementation

### 2.1. The `useRecording` Hook
This hook manages the `MediaRecorder` instance, chunk slicing, and sequential upload coordination to prevent network saturation.

**Core Responsibilities:**
1.  Initialize recording session.
2.  Check MIME type compatibility (Safari/Firefox fallbacks).
3.  Capture local media stream chunks (1-2 second intervals).
4.  Manage an explicit sequential upload queue to prevent parallel request chaos.
5.  Handle upload chunk timeouts and strictly requeue failed chunks.
6.  Handle browser closures (`beforeunload`) and cleanly remove listeners.
7.  Display clear Error State UI.

### 2.2. Recording Flow

**1. Setup & Start:**
```typescript
// 🛡️ SECURITY: MIME Compatibility
const mimeType = 'video/webm;codecs=vp8,opus';
if (!MediaRecorder.isTypeSupported(mimeType)) {
  // Fallback to generic webm or mp4 depending on browser
}

const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const recorder = new MediaRecorder(mediaStream, { mimeType });
let chunkIndex = 0;

// 🛡️ RELIABILITY: Queue System
const uploadQueue = [];
let isUploading = false;

// 🛡️ RELIABILITY: Prevent accidental loss
const handleTabClose = (e) => {
  e.preventDefault();
  e.returnValue = ''; // Trigger browser warning
};
window.addEventListener("beforeunload", handleTabClose);
```

**2. Chunk Handling (`ondataavailable`) & Explicit Queue:**
```typescript
recorder.ondataavailable = async (event) => {
  if (event.data && event.data.size > 0) {
    const chunk = event.data;
    const currentIndex = chunkIndex++;

    uploadQueue.push({ chunk, index: currentIndex, retries: 0 });
    processQueue();
  }
};

async function processQueue() {
  if (isUploading || uploadQueue.length === 0) return;
  isUploading = true;

  const currentTask = uploadQueue.shift();
  const { chunk, index, retries } = currentTask;

  try {
    const { uploadUrl } = await api.getUploadUrl(sessionId, index);

    // 🛡️ RELIABILITY: Timeout + Retry
    const uploadTask = uploadChunk(uploadUrl, chunk);
    const timeoutTask = new Promise((_, reject) => setTimeout(() => reject(new Error("Upload Timeout")), 10000));

    await Promise.race([uploadTask, timeoutTask]);

    // 🛡️ RELIABILITY: Confirm upload to backend
    await api.confirmChunkComplete(sessionId, index);
  } catch (error) {
    console.error(`Chunk ${index} failed:`, error);

    // 🛡️ RELIABILITY: Explicit Requeue Logic
    if (retries < 3) {
      uploadQueue.unshift({ chunk, index, retries: retries + 1 });
    } else {
      showErrorStateUI("Upload critically failed. Recording may be incomplete.");
      // Depending on strictness, abort session here.
    }
  } finally {
    isUploading = false;
    processQueue(); // Process next in queue
  }
}

recorder.start(2000);
```

**3. Stop Recording (Queue Flush Safety):**
```typescript
recorder.stop();
window.removeEventListener("beforeunload", handleTabClose);

// 🛡️ RELIABILITY: Final Queue Flush Safety (Prevent Infinite Loop)
const MAX_WAIT = 30000;
const start = Date.now();

while ((uploadQueue.length > 0 || isUploading) && Date.now() - start < MAX_WAIT) {
  await new Promise(resolve => setTimeout(resolve, 500));
}

if (uploadQueue.length > 0 || isUploading) {
  showErrorStateUI("Upload queue stuck. Recording is incomplete.");
  throw new Error("Upload queue stuck");
}

try {
  await api.completeRecording(sessionId);
} catch (error) {
  // 🛡️ RELIABILITY: Error State UI for missing chunks or merge failures
  showErrorStateUI("Recording completion failed. Please try again.");
}
```

---

## 3. Chat UI Implementation

### 3.1. Components
*   `ChatPanel`: A sidebar toggled via the control bar.
*   `MessageList`: Displays messages. Should auto-scroll to bottom.
*   `ChatInput`: Text input field.

### 3.2. Socket & State Flow (Fixing Duplicates)
Optimistic UI updates cause duplicates if the server broadcasts the same message back.

1.  **Sending (Optimistic UI):**
    ```typescript
    const tempId = `temp-${Date.now()}`;
    const newMsg = { id: tempId, content: textInput, senderId: myId, createdAt: new Date() };

    setMessages(prev => [...prev, newMsg]); // Optimistic update
    socket.emit("chat_message", { content: textInput, tempId });
    ```
2.  **Receiving:**
    ```typescript
    socket.on("chat_message", (message) => {
      setMessages(prev => {
        // 🛡️ RELIABILITY: Replace optimistic temp message OR ignore existing real duplicates
        const exists = prev.find(m => m.id === message.id);
        if (exists) return prev;

        const filtered = prev.filter(m => m.id !== message.tempId);
        return [...filtered, message];
      });
    });
    ```