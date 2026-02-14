# TURN Server Infrastructure LLD (Phase 2 Critical)

## 1. Responsibility
This document defines the **Infrastructure Deployment** for the TURN Server (Coturn).
Unlike the `turn-credential-service` (which issues passwords), this component **relays actual media traffic**.

### Responsibilities
*   **Relaying Media:** Forwarding UDP/TCP packets between peers behind symmetric NATs.
*   **STUN:** Public IP discovery.
*   **Authentication:** Validating credentials issued by the Credential Service.
*   **Bandwidth Control:** Enforcing per-user limits.

---

## 2. Deployment Specifications

### 2.1 Hardware Requirements
*   **Type:** Dedicated Virtual Machine (e.g., AWS EC2, DigitalOcean Droplet).
*   **OS:** Ubuntu 22.04 LTS.
*   **CPU:** Compute Optimized (c6g.medium or similar) for high packet throughput.
*   **Network:** High Bandwidth (Up to 5Gbps).

### 2.2 Network Configuration (Critical)
*   **Public IP:** Must be a **Static Elastic IP** (IPv4).
*   **NAT Mode:** **None**. The VM should be directly addressable or use 1:1 NAT.
*   **Docker Mode:** If using Docker, MUST use `network_mode: host`.
    *   *Reason:* Bridge networking adds significant latency and breaks large port ranges.

---

## 3. Port Configuration (Firewall Rules)

**Inbound Rules (Allow from Anywhere 0.0.0.0/0):**

| Port | Protocol | Purpose |
| :--- | :--- | :--- |
| `3478` | UDP/TCP | Standard STUN/TURN |
| `5349` | TLS | Secure TURN (Enterprise Firewall Traversal) |
| `40000-49999` | UDP | **Relay Range** (Media Traffic) |

**Outbound Rules:**
*   Allow All (to reach peers).

---

## 4. Coturn Configuration (`turnserver.conf`)

```ini
# --- Listening ---
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0

# --- Public IP Announcement ---
external-ip=<YOUR_PUBLIC_IP>

# --- Authentication ---
fingerprint
use-auth-secret
static-auth-secret=<YOUR_LONG_RANDOM_SECRET>
realm=turn.qualmeet.com
total-quota=100
bps-capacity=0
stale-nonce=600

# --- Security ---
no-cli
no-loopback-peers
no-multicast-peers
no-tcp-relay  # Optional: Force UDP for better performance if possible

# --- Relay Ports ---
min-port=40000
max-port=49999

# --- TLS (Required for Phase 2) ---
cert=/etc/letsencrypt/live/turn.qualmeet.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.qualmeet.com/privkey.pem

# --- Secret Rotation (Zero Downtime) ---
# To rotate, add new secret as static-auth-secret
# and move old secret to alternate-auth-secret (if supported)
# OR restart service during maintenance window.
```

---

## 5. TLS Certificate Management

**Tool:** `certbot` (Let's Encrypt).

**Setup:**
1.  Map DNS `turn.qualmeet.com` -> `PUBLIC_IP`.
2.  Run `certbot certonly --standalone -d turn.qualmeet.com`.
3.  Mount `/etc/letsencrypt` volume to Coturn container.
4.  **Auto-Renewal:** Cron job to renew cert and restart Coturn (`SIGHUP`).

---

## 6. Scaling & High Availability

### 6.1 Stateless Clustering
*   **Concept:** Deploy N Coturn instances.
*   **Shared Secret:** All instances use the **same** `static-auth-secret`.
*   **Load Balancing:** Use **DNS Round Robin** (Multiple A Records for `turn.qualmeet.com`).
*   **Why DNS?** L4 Load Balancers (AWS NLB) can be expensive for high UDP throughput. DNS is free and sufficient for TURN logic (Client picks one IP).

### 6.2 ICE Server Ordering (Critical)
The Credential Service MUST return servers in this exact order:
1.  `udp` (Best Performance)
2.  `tcp` (Firewall Traversal)
3.  `tls` (Strict Firewall Traversal - slowest but most reliable)

### 6.2 Geo-Distribution (Future)
*   `us-east.turn.qualmeet.com`
*   `eu-west.turn.qualmeet.com`
*   Credential Service decides which URL to return based on user IP (GeoIP).

---

## 7. Monitoring & Logs

**Metrics to Track:**
*   **Allocation Load:** Active allocations count.
*   **Bandwidth:** Throughput (RX/TX).
*   **Auth Failures:** Spike indicates attack or expired credentials.

**Log Rotation:**
*   Coturn logs can grow huge. Configure `log-file` and `logrotate` to keep last 7 days.
