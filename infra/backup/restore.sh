#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VeriSync Automated Database Restoration Script (NFR-REL-006, TC-19)
# Recovery Time Objective (RTO): <= 4 hours target recovery into staging/production
# =============================================================================

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file> [target_db_name]"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${2:-verisync_staging}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
METADATA_FILE="${BACKUP_FILE%.dump}.json"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "🔄 [VeriSync Restore] Validating backup integrity before restoration..."
if [ -f "${METADATA_FILE}" ]; then
  EXPECTED_HASH=$(grep '"sha256"' "${METADATA_FILE}" | cut -d'"' -f4)
  ACTUAL_HASH=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
  if [ "${EXPECTED_HASH}" != "${ACTUAL_HASH}" ]; then
    echo "❌ Integrity check FAILED: Checksum mismatch!"
    echo "   Expected: ${EXPECTED_HASH}"
    echo "   Actual:   ${ACTUAL_HASH}"
    exit 1
  fi
  echo "✅ Checksum verified: ${ACTUAL_HASH}"
fi

echo "🚀 [VeriSync Restore] Restoring snapshot into database '${DB_NAME}'..."
START_TIME=$(date +%s)

# Terminate active connections to target database prior to drop/restore
PGPASSWORD="${PGPASSWORD:-}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true

# Restore with clean drop of existing tables
PGPASSWORD="${PGPASSWORD:-}" pg_restore \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${BACKUP_FILE}"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "✨ [VeriSync Restore] Database restoration complete in ${DURATION} seconds."
if [ ${DURATION} -le 14400 ]; then
  echo "🎯 Target RTO met: ${DURATION}s <= 14400s (4 hours)."
else
  echo "⚠️ Warning: Restoration exceeded 4-hour RTO target."
fi
