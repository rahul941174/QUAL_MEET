LIVE LINK -> https://frontend.qualmeetrhhv.xyz


# QUAL_MEET — Cloud Podcast & Online Meeting Platform

QUAL_MEET is a microservices-based real-time communication platform built for online meetings, podcasts, and collaborative sessions. The platform supports secure authentication, room management, real-time WebRTC signaling, media recording, and cloud storage integration.

---

# 🚀 Features Implemented

## ✅ Authentication System

* User Signup
* User Login
* JWT-based Authentication (RS256)
* Refresh Token Flow
* CSRF Protection
* Secure Cookie-based Session Handling
* Current User (`/me`) API
* Logout Functionality

---

## ✅ Room Management

* Create Meeting Rooms
* Join Rooms
* Leave Rooms
* Room Authorization
* Active Participant Tracking
* Room State Management

---

## ✅ Real-Time Signaling (Socket.IO)

* WebRTC Offer/Answer Exchange
* ICE Candidate Exchange
* Peer Connection Signaling
* Room Presence Updates
* Live Participant Updates
* Real-Time Chat Events
* Media State Synchronization
* Screen Sharing Events
* Redis Pub/Sub Based Cross-Instance Event Broadcasting

---

## ✅ Media Recording System

* Browser MediaRecorder API Integration
* Chunk-based Video Uploading
* Backend Chunk Handling
* Video Chunk Merging
* Recording Session Management
* Final Video Upload to Cloudflare R2
* Recording Metadata Storage

---

## ✅ Cloud Storage Integration

* Cloudflare R2 Integration
* Upload Final Recording Files
* Store Recording URLs
* Persistent Cloud Media Storage

---

# 🧱 Microservices Architecture

The project follows a distributed microservices architecture.

## Services Built

### 1. API Gateway

Central entry point for all client requests.

### Responsibilities

* Request Routing
* JWT Verification
* Cookie Parsing
* CORS Handling
* Proxying Requests to Services

### Routes

* `/api/auth`
* `/api/rooms`
* `/api/media`
* `/api/turn`

---

### 2. Auth Service

Handles authentication and user identity management.

### Features

* Signup
* Login
* Logout
* Refresh Access Token
* Get Current User

### Technologies

* Prisma ORM
* PostgreSQL (Supabase)
* JWT RS256 Authentication

---

### 3. Room Service

Handles meeting room lifecycle and participant management.

### Features

* Create Room
* Join Room
* Leave Room
* Room Authorization
* Fetch Room Details

---

### 4. Signaling Service

Handles real-time communication and WebRTC signaling.

### Features

* Socket.IO Server
* WebRTC Signaling
* Room Presence
* Peer Synchronization
* Redis Pub/Sub Integration
* Real-Time Chat Events
* Screen Sharing Events

---

### 5. Media Recording Service

Handles recording uploads and processing.

### Features

* Upload Recording Chunks
* Merge Video Chunks
* Upload Final Recording to Cloudflare R2
* Recording Metadata Handling

---

# 🛠️ Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Socket.IO Client
* WebRTC APIs

---

## Backend

* Node.js
* Express.js
* TypeScript
* Socket.IO
* Redis

---

## Database

* PostgreSQL (Supabase)

---

## ORM

* Prisma ORM

---

## Cloud Storage

* Cloudflare R2

---

## Deployment

* Render
* Vercel

---

# 🔐 Authentication Architecture

The platform uses secure JWT authentication with:

* Access Tokens
* Refresh Tokens
* CSRF Protection
* HTTP-only Cookies

### Token Strategy

* Access Token Expiry: 15 minutes
* Refresh Token Expiry: 7 days

---

# 🌐 Deployment Architecture

## Frontend

Deployed on:

* Vercel

## Backend Services

Deployed independently on:

* Render

### Services Deployed

* API Gateway
* Auth Service
* Room Service
* Signaling Service

---

# 📡 Real-Time Communication Flow

## WebRTC Flow

1. User joins room
2. Socket.IO establishes signaling connection
3. Offer/Answer exchange occurs
4. ICE candidates exchanged
5. Peer-to-peer connection established

---

# 🎥 Recording Flow

## Recording Lifecycle

1. Frontend records media using MediaRecorder API
2. Recording chunks uploaded to backend
3. Backend stores temporary chunks
4. Chunks merged into final recording
5. Final video uploaded to Cloudflare R2
6. Recording metadata stored

---

# 🧠 Redis Pub/Sub Usage

Redis Pub/Sub is used to synchronize events across multiple signaling service instances.

### Events Broadcasted

* WebRTC Offer
* WebRTC Answer
* ICE Candidates
* User Join/Leave
* Media State Updates
* Screen Share Events
* Chat Messages

---

# ⚙️ Security Features

* JWT RS256 Signing
* CSRF Protection
* Secure Cookies
* Authenticated API Gateway
* Protected Room Access
* Secure WebSocket Authentication

---

# 📂 Project Structure

```bash
QUAL_MEET/
│
├── frontend/
│
├── api-gateway/
│
├── auth-service/
│
├── room-service/
│
├── signaling-service/
│
├── media-recording-service/
│
├── shared/
│
└── docs/
```

---

# 🚧 Current Status

## Implemented

* Authentication System
* Room Management
* WebRTC Signaling
* Socket.IO Integration
* Media Recording Pipeline
* Cloudflare R2 Uploads
* Redis Pub/Sub
* Microservices Deployment

## In Progress

* Production Deployment Stabilization
* Socket Authentication Hardening
* Render Free Tier Optimization

---

# 🧪 Environment Variables

Each service uses its own `.env` configuration.

Examples:

```env
JWT_PUBLIC_KEY=
JWT_PRIVATE_KEY=
DATABASE_URL=
REDIS_URL=
FRONTEND_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

---

# 👨‍💻 Developer

Rahul
B.Tech CSE (Core)
Final Year Project — 2026

---
