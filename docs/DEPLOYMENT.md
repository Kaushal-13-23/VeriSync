# VeriSync Deployment and Operations Guide

## 1. Overview & Cloud Architecture (SRS Section 12)

VeriSync production deployment is designed for high availability, zero-downtime rolling releases, and resilient disaster recovery across enterprise infrastructure.

```
                      +-----------------------------+
                      | Cloudflare / Ingress CDN    |
                      | WAF & DDoS Shield           |
                      +--------------+--------------+
                                     | TLS 1.3
                                     v
                      +-----------------------------+
                      | Kubernetes Ingress / ALB    |
                      | HTTPS (Port 443)            |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
      +-----------------+                         +-----------------+
      | API Pod 1       |                         | API Pod 2       |
      | verisync-api:prd|                         | verisync-api:prd|
      +--------+--------+                         +--------+--------+
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
                      +-----------------------------+
                      | PgBouncer Connection Pooler |
                      | max_client_conn = 1000      |
                      | default_pool_size = 50      |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | PostgreSQL 16 Primary       |
                      | 8 vCPU, 32 GB RAM, SSD      |
                      +--------------+--------------+
                                     | Continuous WAL (archive_timeout = 900s)
                                     v
                      +-----------------------------+
                      | S3 / GCS Backup Vault       |
                      | Snapshots + WALs (RPO 15m)  |
                      +-----------------------------+
```

---

## 2. Environment Configuration

VeriSync enforces strict environment separation across Development, Staging, and Production.

| Configuration Item   | Development (`dev.env`) | Staging (`staging.env`) | Production (`prod.env`)               |
| :------------------- | :---------------------- | :---------------------- | :------------------------------------ |
| **Node Environment** | `development`           | `staging`               | `production`                          |
| **API Port**         | `4000`                  | `4000`                  | `4000`                                |
| **Database Pool**    | `connection_limit=10`   | `connection_limit=30`   | `connection_limit=60`                 |
| **Pool Timeout**     | `10s`                   | `10s`                   | `5s`                                  |
| **Secrets Engine**   | `.env.local` file       | HashiCorp Vault / KMS   | AWS Secrets Mgr / Sealed Secrets      |
| **Metrics Exporter** | Enabled (`/metrics`)    | Enabled (`/metrics`)    | Enabled (`/metrics` on internal port) |
| **Log Format**       | Colorized Console       | Structured JSON         | Structured JSON with correlationId    |
| **Rate Limit**       | 1000 req/min            | 300 req/min             | 200 req/min                           |

---

## 3. Containerization & Docker Builds

The API container uses a multi-stage Alpine build for an ultra-compact, hardened footprint running as an unprivileged user (`verisync:verisync`, UID 1001).

```bash
# Build production container image
docker build -t verisync-api:latest -f apps/api/Dockerfile .

# Run container locally with environment file
docker run -d \
  --name verisync-api \
  -p 4000:4000 \
  --env-file infra/environments/prod.env \
  verisync-api:latest
```

---

## 4. Database Migration Management

Prisma migrations are strictly validated prior to deployment via `pnpm validate:migrations`.

```bash
# 1. Validate schema formatting and absence of destructive queries
pnpm validate:migrations

# 2. Apply pending migrations safely to production DB
pnpm prisma migrate deploy --schema=prisma/schema.prisma

# 3. Check migration status
pnpm prisma migrate status --schema=prisma/schema.prisma
```

---

## 5. Secrets Management Policy (Rule 5)

- Zero plaintext secrets or cryptographic keys are committed to Git.
- Passwords use **Argon2id** exclusively.
- Production secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`) are injected into pods at runtime via environment variables loaded from HashiCorp Vault, AWS Secrets Manager, or Kubernetes `Secret` resources.

---

## 6. Disaster Recovery Runbook (RPO 15 min / RTO 4 h, TC-19)

### 6.1 Automated Backup Execution

Daily automated snapshots with continuous 15-minute Write-Ahead Log (WAL) archiving:

```bash
./infra/backup/backup.sh
```

### 6.2 Staging Restoration Drill

Validates snapshot integrity (SHA256) and restores the database into staging:

```bash
./infra/backup/restore.sh /var/backups/verisync/verisync_backup_<TIMESTAMP>.dump verisync_staging
```

---

## 7. Observability & Health Probes (SRS 12.4)

| Endpoint                   | Purpose                     | Target Response               | Alert Rule                       |
| :------------------------- | :-------------------------- | :---------------------------- | :------------------------------- |
| `GET /api/v1/health`       | Overall system diagnostic   | HTTP 200 `{ status: "ok" }`   | Warning if degraded              |
| `GET /api/v1/health/live`  | Kubernetes Liveness Probe   | HTTP 200 `{ status: "ok" }`   | Container restart on 3 failures  |
| `GET /api/v1/health/ready` | Kubernetes Readiness Probe  | HTTP 200 `{ status: "ok" }`   | Traffic removal on DB disconnect |
| `GET /api/v1/metrics`      | Prometheus Metrics Exporter | HTTP 200 (OpenMetrics format) | Scraped every 10s                |

Alerting rules are specified in [`infra/monitoring/alert-rules.yml`](file:///d:/Veri_Sync/VeriSync/infra/monitoring/alert-rules.yml).

---

## 8. Rollback Procedures

If an anomalous release occurs:

1. **Container Rollback**: Revert Kubernetes deployment image tag to the preceding stable SHA:
   `kubectl rollout undo deployment/verisync-api`
2. **Database Rollback**: If a schema migration must be reversed, execute the verified down-migration SQL script stored in `prisma/migrations/`.
3. **Cache / Token Invalidation**: If a security vulnerability was remediated, trigger token revocation via `POST /api/v1/admin/auth/revoke-all-tokens`.
