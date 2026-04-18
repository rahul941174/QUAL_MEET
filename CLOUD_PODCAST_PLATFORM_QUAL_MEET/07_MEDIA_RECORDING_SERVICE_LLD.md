# Media Recording Service LLD (Phase 3)

## 1. Responsibility
The **Media Recording Service** handles the distributed recording pipeline for QUAL_MEET. It orchestrates chunk uploads from clients, ensures data integrity, and produces the final merged video without proxying media traffic through the backend.

### Responsibilities
*   **Upload Coordination:** Generating pre-signed URLs for direct client uploads to Cloud storage (AWS S3 or Cloudflare R2).
*   **Tracking:** Managing recording sessions and tracking the upload state of individual video chunks.
*   **Merging:** Running FFmpeg to concatenate chunks into a final HD `.webm` file per user.
*   **Delivery:** Providing the final video URL upon completion.

### Non-Responsibilities
*   **Media Proxying:** The backend MUST NOT receive or proxy video chunks directly from the frontend.
*   **Cloudinary:** Cloudinary is explicitly forbidden due to reliability issues with chunking.

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
| `uploaded`     | BOOLEAN   | True if upload is confirmed          |

---

## 4. API Design

### 4.1. Initialize Recording Session
**Endpoint:** `POST /media/recordings/init`
**Description:** Called by the client when recording starts.
**Request:**
```json
{
  "roomId": "abc-def-ghi",
  "userId": "user-123"
}
```
**Response:**
```json
{
  "sessionId": "rec_12345"
}
```

### 4.2. Get Upload URL (Core API)
**Endpoint:** `POST /media/recordings/upload-url`
**Description:** Requests a pre-signed URL to upload a specific chunk.
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

### 4.3. Complete Recording
**Endpoint:** `POST /media/recordings/complete`
**Description:** Called when the client stops recording. Triggers the merge pipeline.
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

### 4.4. Get Recording Status
**Endpoint:** `GET /media/recordings/:sessionId`
**Description:** Poll or fetch the final status of the recording.
**Response:**
```json
{
  "status": "completed",
  "videoUrl": "https://cdn.qualmeet.com/recordings/.../final.webm"
}
```

---

## 5. Merging Pipeline (FFmpeg)

When `complete` is called, the service executes the following workflow:

1.  **Validation:** Query `recording_chunks` to ensure all chunks from `0` to `max(chunk_index)` are marked `uploaded = true`.
2.  **Fetch:** Download all chunks for the session from S3/R2 to a temporary local directory.
3.  **Sort:** Sort files strictly by `chunk_index`.
4.  **List Generation:** Create a `filelist.txt`:
    ```text
    file 'chunk_0001.webm'
    file 'chunk_0002.webm'
    ...
    ```
5.  **Merge Command:**
    ```bash
    ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.webm
    ```
6.  **Upload:** Upload `output.webm` back to S3/R2 as `final.webm`.
7.  **Cleanup:** Delete the temporary directory and update DB status.

---

## 6. Failure & Reliability Handling

*   **Missing Chunks:** If the DB indicates missing chunks during the `complete` phase, the service can either wait (if the client is retrying) or skip the missing chunk and merge the rest (with a slight jump in the video).
*   **Out-of-Order Uploads:** Handled implicitly because the merge pipeline sorts files by `chunk_index` before concatenation.
*   **Duplicate Chunks:** S3/R2 PUT operations are idempotent. A duplicate upload simply overwrites the existing chunk.
*   **Merge Failure:** If FFmpeg fails, set `status = failed`. Retries can be manually triggered or queued.