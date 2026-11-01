#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VeriSync Migration Validation & Rollback Readiness Script
# SRS 12.3 Stage 4: Database Migration Check
# =============================================================================

echo "🔍 [VeriSync Migration Check] Validating schema and migration readiness..."

# 1. Validate Prisma schema syntax
pnpm prisma validate --schema=prisma/schema.prisma

# 2. Check for migration status against target database (if DATABASE_URL provided)
if [ -n "${DATABASE_URL:-}" ]; then
  echo "📡 Checking database migration alignment..."
  pnpm prisma migrate status --schema=prisma/schema.prisma
fi

# 3. Execute TypeScript migration validation suite
pnpm ts-node infra/scripts/validate-migrations.ts

echo "✅ [VeriSync Migration Check] All migration gates passed."
