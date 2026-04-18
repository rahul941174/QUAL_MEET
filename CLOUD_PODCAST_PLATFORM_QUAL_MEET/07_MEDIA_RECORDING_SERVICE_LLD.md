# Media Recording Service LLD (Phase 3 Final)

## 1. Responsibility
The **Media Recording Service** handles the distributed recording pipeline for QUAL_MEET. It orchestrates chunk uploads from clients, ensures data integrity, and produces the final merged video without proxying media traffic through the backend.

### Responsibilities
*   **Upload Coordination:** Generating pre-signed URLs for direct client uploads to Cloud storage (AWS S3 or Cloudflare R2).
*   **Tracking:** Managing recording sessions and tracking the upload state of individual video chunks via explicit completion APIs.
*   **Merging:** Using background jobs (BullMQ) to run FFmpeg and concatenate chunks into a final HD `.webm` file per user.
*   **Delivery:** Providing the final video URL upon completion.
*   **Security & Validation:** Enforcing ownership, room validation, and strict duration limits.

### Non-Responsibilities
*   **Media Proxying:** The backend MUST NOT receive or proxy video chunks directly from the frontend.
*   **Cloudinary:** Cloudinary is explicitly forbidden.

---

## 2. Storage Architecture
**Provider:** Cloudflare R2 (Preferred for cost) or AWS S3.
**Bucket:** `recordings`

### Storage Structure
```text
recordings/
  {roomId}/
    {userId}/
      chunk_0001.webm
      chunk_0002.webm
      ...
      final.webm
```

### 2.1 Storage Failure Handling
If URL generation fails (e.g., S3/R2 downtime):
*   Return 503 Service Unavailable.
*   Frontend must queue the chunk and retry backoff.

---

## 3. Database Schema

**Table: `recordings`**
| Column       | Type      | Description                          |
| :---         | :---      | :---                                 |
| `id`         | UUID (PK) | Unique recording session ID          |
| `room_id`    | VARCHAR   | ID of the meeting                    |
| `user_id`    | VARCHAR   | ID of the user being recorded        |
| `status`     | ENUM      | `recording`, `processing`, `completed`, `failed` |
| `created_at` | TIMESTAMP | Session start time                   |
| `final_url`  | VARCHAR   | URL of the final merged video        |

**Table: `recording_chunks`**
| Column         | Type      | Description                          |
| :---           | :---      | :---                                 |
| `id`           | UUID (PK) | Unique chunk ID                      |
| `recording_id` | UUID (FK) | Reference to the `recordings` table  |
| `chunk_index`  | INTEGER   | Sequential order of the chunk (Crucial) |
| `uploaded`     | BOOLEAN   | True if upload is confirmed via explicit API |

---

## 4. API Design

### 4.1. Initialize Recording Session
**Endpoint:** `POST /media/recordings/init`
**Description:** Called by the client when recording starts.
**Auth & Security:**
*   MUST extract `userId` from headers (`x-user-id` injected by Gateway), NOT the body.
*   Must validate that the user is actually in the requested `roomId` (via internal call to Room Service).
*   Enforce a limit of **1 active recording session per user**.
**Request:**
```json
{
  "roomId": "abc-def-ghi"
}
```
**Response:**
```json
{
  "sessionId": "rec_12345"
}
```

### 4.2. Get Upload URL
**Endpoint:** `POST /media/recordings/upload-url`
**Description:** Requests a pre-signed URL to upload a specific chunk.
**Auth:** Must validate session ownership (`userId` matches session).
**Request:**
```json
{
  "sessionId": "rec_12345",
  "chunkIndex": 1
}
```
**Response:**
```json
{
  "uploadUrl": "https://r2.cloudflare.com/.../signed-url",
  "filePath": "recordings/abc-def-ghi/user-123/chunk_0001.webm"
}
```

### 4.3. Confirm Chunk Upload (NEW)
**Endpoint:** `POST /media/recordings/chunk-complete`
**Description:** Called by frontend AFTER a successful PUT to S3/R2 to mark `uploaded=true` in DB.
**Request:**
```json
{
  "sessionId": "rec_12345",
  "chunkIndex": 1
}
```

### 4.4. Complete Recording
**Endpoint:** `POST /media/recordings/complete`
**Description:** Called when the client stops recording. Enqueues the merge job.
**Validation:**
*   Must check if there are any missing chunks (`where uploaded=false`). If missing chunks exist, return a 400 error ("Upload incomplete") so the frontend can wait and retry completion.
**Request:**
```json
{
  "sessionId": "rec_12345"
}
```
**Response:**
```json
{
  "status": "processing"
}
```

### 4.5. Get Recording Status
**Endpoint:** `GET /media/recordings/:sessionId`
**Auth:** Must validate session ownership.
**Response:**
```json
{
  "status": "completed",
  "videoUrl": "https://cdn.qualmeet.com/recordings/.../final.webm"
}
```

---

## 5. Merging Pipeline (BullMQ + FFmpeg)

To prevent blocking the Node.js event loop and crashing under heavy load, merging is moved to a background worker queue (BullMQ backed by Redis).

**Constraints:**
*   **Max Duration Limit:** Enforce `MAX_RECORDING_DURATION = 30 min` to prevent disk/memory explosions during the merge phase.

**Worker Flow:**
1.  **Consume Job:** Worker picks up `sessionId`.
2.  **Fetch:** Stream or download all confirmed chunks for the session from S3/R2 to a temporary local directory.
3.  **Sort:** Sort files strictly by `chunk_index`.
4.  **List Generation:** Create `filelist.txt`.
5.  **Merge Command:** `ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.webm`
6.  **Upload:** Upload `output.webm` back to S3/R2 as `final.webm`.
7.  **Cleanup Policy (Critical):**
    *   Delete local temporary files immediately.
    *   Trigger an S3/R2 deletion of all individual chunk files (`chunk_0001.webm`, etc.) to save storage costs.
8.  **Update DB:** Set status to `completed`.

---

## 6. Failure & Reliability Handling

*   **Merge Retry Strategy:** If FFmpeg or the final S3 upload fails, BullMQ will automatically retry the job 3 times with exponential backoff before marking it `failed`.
*   **Missing Chunks Race Condition:** Prevented by step 4.4; the backend refuses to enqueue the job until the frontend confirms all generated URLs have been uploaded successfully.
*   **Duplicate Chunks:** S3/R2 PUT operations are idempotent. Overwrites are safe.