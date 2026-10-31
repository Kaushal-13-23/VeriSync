// VeriSync Database Seed Script
// Seeds the initial SuperAdmin account per FR-AUTH-001 and Argon2id security policy (Rule 5).
// Traceability: FR-AUTH-001, FR-AUTH-003, NFR-SEC-002

import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding VeriSync database...');

  // Default Super Admin credentials
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'superadmin';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'SuperAdmin@VeriSync2026!';

  // Hash password using Argon2id with recommended OWASP parameters
  const adminPasswordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });

  const superAdmin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      totpEnabled: false,
    },
  });

  console.log(`[Seed] Seeded SuperAdmin: ${superAdmin.username} (${superAdmin.id})`);

  // Candidate seed for demonstration and integration testing
  const candidateUsername = 'candidate01';
  const candidateIdentifier = 'CAN-2026-001';
  const candidatePassword = process.env.INITIAL_CANDIDATE_PASSWORD || 'Candidate@VeriSync2026!';

  const candidatePasswordHash = await argon2.hash(candidatePassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const candidateUser = await prisma.user.upsert({
    where: { username: candidateUsername },
    update: {
      passwordHash: candidatePasswordHash,
      role: UserRole.CANDIDATE,
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      username: candidateUsername,
      passwordHash: candidatePasswordHash,
      role: UserRole.CANDIDATE,
      accountStatus: AccountStatus.ACTIVE,
      candidateProfile: {
        create: {
          candidateIdentifier,
          fullName: 'Aarav Sharma',
          email: 'aarav.sharma@example.edu',
          phone: '+919876543210',
          institution: 'National Institute of Technology',
          qualification: 'B.Tech Computer Science',
          graduationYear: 2026,
          recruitmentReference: 'DRIVE-2026-CAMPUS-A',
        },
      },
    },
  });

  console.log(`[Seed] Seeded Candidate: ${candidateUser.username} (${candidateIdentifier})`);
  console.log('[Seed] Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
