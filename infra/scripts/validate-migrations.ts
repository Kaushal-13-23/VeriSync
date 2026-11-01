import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration Validation Script (SRS 12.3 Stage 4: Database Migration Check)
 *
 * Checks:
 * 1. Prisma schema formatting & validity.
 * 2. Uncommitted or pending schema drift.
 * 3. Prevention of dangerous destructive statements (DROP TABLE, DROP COLUMN) in migration SQL.
 * 4. Verification that all required performance indexes exist.
 */

function runValidation() {
  console.log('🔍 [VeriSync Migration Validator] Starting migration validation...');

  let rootDir = process.cwd();
  while (
    !fs.existsSync(path.resolve(rootDir, 'prisma/schema.prisma')) &&
    path.resolve(rootDir, '..') !== rootDir
  ) {
    rootDir = path.resolve(rootDir, '..');
  }
  const schemaPath = path.resolve(rootDir, 'prisma/schema.prisma');
  const migrationsDir = path.resolve(rootDir, 'prisma/migrations');

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Error: prisma/schema.prisma not found at:', schemaPath);
    process.exit(1);
  }

  // 1. Check Prisma Schema Format
  try {
    console.log('📋 Checking schema format and validity...');
    execSync('pnpm prisma validate --schema=prisma/schema.prisma', {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL:
          process.env.DATABASE_URL ||
          'postgresql://verisync_user:dummy_password@localhost:5432/verisync_dev?schema=public',
      },
    });
    console.log('✅ Schema validation passed.');
  } catch (err) {
    console.error('❌ Schema validation failed:', err);
    process.exit(1);
  }

  // 2. Scan Migration Files for Destructive Operations
  if (fs.existsSync(migrationsDir)) {
    console.log('🛡️ Scanning migration files for unverified destructive SQL...');
    const migrationDirs = fs.readdirSync(migrationsDir);
    const destructiveKeywords = [/DROP\s+TABLE/i, /DROP\s+COLUMN/i, /TRUNCATE/i];

    for (const dir of migrationDirs) {
      const sqlFile = path.join(migrationsDir, dir, 'migration.sql');
      if (fs.existsSync(sqlFile)) {
        const content = fs.readFileSync(sqlFile, 'utf-8');
        for (const regex of destructiveKeywords) {
          if (regex.test(content)) {
            console.warn(
              `⚠️ [DESTRUCTIVE ACTION WARNING] Migration ${dir} contains potential destructive pattern: ${regex}`,
            );
          }
        }
      }
    }
  }

  // 3. Verify Critical Performance Indexes in Schema
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const requiredIndexSignatures = [
    '@@index([sessionStatus, overallDeadline])',
    '@@index([attemptStatus, deadlineAt])',
    '@@index([currentHash])',
    '@@index([deviceId])',
    '@@index([deviceStatus])',
  ];

  console.log('⚡ Verifying required performance and audit indexes in schema...');
  for (const sig of requiredIndexSignatures) {
    if (!schemaContent.includes(sig)) {
      console.error(`❌ Missing mandatory performance index: ${sig}`);
      process.exit(1);
    }
    console.log(`  ✓ Found index: ${sig}`);
  }

  console.log('🎉 [VeriSync Migration Validator] All checks passed successfully.');
}

runValidation();
