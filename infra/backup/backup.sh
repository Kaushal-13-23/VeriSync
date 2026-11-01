#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VeriSync Automated Database Backup Script (NFR-REL-006, SRS 7.5, TC-19)
# Recovery Point Objective (RPO): <= 15 minutes via snapshot + continuous WAL archiving
# =============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/verisync}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-verisync_prod}"
BACKUP_FILE="${BACKUP_DIR}/verisync_backup_${TIMESTAMP}.dump"
METADATA_FILE="${BACKUP_DIR}/verisync_backup_${TIMESTAMP}.json"

mkdir -p "${BACKUP_DIR}"

echo "📦 [VeriSync Backup] Starting full database backup at ${TIMESTAMP}..."
START_TIME=$(date +%s)

# Execute pg_dump in compressed custom binary format (-Fc)
PGPASSWORD="${PGPASSWORD:-}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -Fc \
  --quote-all-identifiers \
  --file="${BACKUP_FILE}"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Compute SHA256 Checksum for tamper prevention and integrity validation
FILE_HASH=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
FILE_SIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}")

# Record metadata catalog
cat <<EOF > "${METADATA_FILE}"
{
  "backupId": "backup_${TIMESTAMP}",
  "timestampUtc": "${TIMESTAMP}",
  "database": "${DB_NAME}",
  "format": "custom_pg_dump",
  "fileName": "$(basename "${BACKUP_FILE}")",
  "fileSizeBytes": ${FILE_SIZE},
  "sha256": "${FILE_HASH}",
  "durationSeconds": ${DURATION},
  "rpoMinutes": 15,
  "rtoTargetHours": 4
}
EOF

echo "✅ [VeriSync Backup] Backup created successfully: ${BACKUP_FILE}"
echo "   Size: ${FILE_SIZE} bytes | Duration: ${DURATION}s | SHA256: ${FILE_HASH}"

# Clean up local snapshots older than 30 days
find "${BACKUP_DIR}" -name "verisync_backup_*.dump" -mtime +30 -exec rm {} \;
find "${BACKUP_DIR}" -name "verisync_backup_*.json" -mtime +30 -exec rm {} \;
