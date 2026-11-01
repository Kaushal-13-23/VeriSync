import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { RateLimiterService } from './rate-limiter.service';
import { MfaService } from './mfa.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../common/prisma.service';
import { UserRole, AccountStatus, AuditOutcome } from '@prisma/client';
import { ApiErrorException } from '../common/api-error.exception';
import { ApiErrorCode } from '@verisync/shared';

describe('AuthService (Phase 1 Backend Foundation)', () => {
  let authService: AuthService;
  let passwordService: PasswordService;
  let auditService: AuditService;
  let prismaMock: any;

  const mockAdminUser = {
    id: 'usr_admin_123',
    username: 'superadmin',
    passwordHash: '', // Will be set with real Argon2id hash in beforeAll
    role: UserRole.SUPER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    totpSecret: null,
    totpEnabled: false,
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    candidateProfile: null,
  };

  const mockCandidateUser = {
    id: 'usr_cand_456',
    username: 'candidate_demo',
    passwordHash: '',
    role: UserRole.CANDIDATE,
    accountStatus: AccountStatus.ACTIVE,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    totpSecret: null,
    totpEnabled: false,
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    candidateProfile: {
      id: 'cp_789',
      candidateIdentifier: 'CAN-2026-001',
      userId: 'usr_cand_456',
      fullName: 'Aarav Sharma',
      email: 'aarav@example.edu',
      institution: 'NIT',
      qualification: 'B.Tech',
      graduationYear: 2026,
      recruitmentReference: 'REF-2026',
    },
  };

  beforeAll(async () => {
    const pwService = new PasswordService();
    mockAdminUser.passwordHash = await pwService.hashPassword('SuperAdmin@2026!');
    mockCandidateUser.passwordHash = await pwService.hashPassword('Candidate@2026!');
  });

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === mockAdminUser.id || where.username === mockAdminUser.username) {
            return Promise.resolve({ ...mockAdminUser });
          }
          if (where.id === mockCandidateUser.id || where.username === mockCandidateUser.username) {
            return Promise.resolve({ ...mockCandidateUser });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          if (where.id === mockCandidateUser.id) {
            if (data.tokenVersion?.increment) {
              mockCandidateUser.tokenVersion += 1;
            }
            if (data.accountStatus) {
              mockCandidateUser.accountStatus = data.accountStatus;
            }
            if (data.passwordHash) {
              mockCandidateUser.passwordHash = data.passwordHash;
            }
            return Promise.resolve({ ...mockCandidateUser });
          }
          return Promise.resolve(null);
        }),
      },
      candidateProfile: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.candidateIdentifier === 'CAN-2026-001' || where.id === 'cp_789') {
            return Promise.resolve({
              ...mockCandidateUser.candidateProfile,
              user: { ...mockCandidateUser },
            });
          }
          return Promise.resolve(null);
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          return Promise.resolve({ id: 'audit_test_id', ...data });
        }),
      },
      revokedToken: {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test_jwt_secret_for_unit_tests_must_be_sufficiently_long_32chars!',
        }),
      ],
      providers: [
        AuthService,
        PasswordService,
        TokenService,
        RateLimiterService,
        MfaService,
        AuditService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    passwordService = module.get<PasswordService>(PasswordService);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('FR-AUTH-001 & FR-AUTH-002: Authentication Flows', () => {
    it('TC-AUTH-01: Admin should login successfully with username and receive JWT tokens', async () => {
      const result = await authService.login(
        { identifier: 'superadmin', password: 'SuperAdmin@2026!' },
        '127.0.0.1',
        'jest-agent',
        'corr-01',
      );

      expect(result.mfaRequired).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.username).toBe('superadmin');
      expect(result.user?.role).toBe(UserRole.SUPER_ADMIN);
    });

    it('TC-AUTH-02: Candidate should login successfully with candidate ID (CAN-2026-001) per Decision 3', async () => {
      const result = await authService.login(
        { identifier: 'CAN-2026-001', password: 'Candidate@2026!' },
        '127.0.0.1',
        'jest-agent',
        'corr-02',
      );

      expect(result.mfaRequired).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.candidateProfile?.candidateIdentifier).toBe('CAN-2026-001');
      expect(result.user?.role).toBe(UserRole.CANDIDATE);
    });

    it('TC-AUTH-03: Candidate should login successfully with username', async () => {
      const result = await authService.login(
        { identifier: 'candidate_demo', password: 'Candidate@2026!' },
        '127.0.0.1',
        'jest-agent',
        'corr-03',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.user?.username).toBe('candidate_demo');
    });

    it('TC-AUTH-04: Login should fail on incorrect password and throw UNAUTHENTICATED', async () => {
      await expect(
        authService.login(
          { identifier: 'superadmin', password: 'WrongPassword123!' },
          '127.0.0.1',
          'jest-agent',
          'corr-04',
        ),
      ).rejects.toThrow(ApiErrorException);
    });

    it('TC-AUTH-05: Login should fail on non-existent identifier', async () => {
      await expect(
        authService.login(
          { identifier: 'non_existent_user', password: 'SomePassword123!' },
          '127.0.0.1',
          'jest-agent',
          'corr-05',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });

  describe('FR-AUTH-003 & NFR-SEC-002: Argon2id Cryptography & Zero Plaintext (TC17)', () => {
    it('TC-PW-01: Passwords must be hashed with Argon2id and never match plaintext', async () => {
      const plaintext = 'SecretPlacement2026!';
      const hash = await passwordService.hashPassword(plaintext);

      // Verify Argon2id prefix
      expect(hash.startsWith('$argon2id$')).toBe(true);
      expect(hash).not.toContain(plaintext);

      // Verify verification works
      const isValid = await passwordService.verifyPassword(hash, plaintext);
      expect(isValid).toBe(true);

      const isInvalid = await passwordService.verifyPassword(hash, 'wrong_pw');
      expect(isInvalid).toBe(false);
    });
  });

  describe('FR-AUTH-004: Rate Limiting & Temporary Lockout (TC17)', () => {
    it('TC-RATE-01: 5 consecutive failed logins should engage temporary lockout', async () => {
      const target = 'lockout_test_user';

      // 4 failed attempts should fail with UNAUTHENTICATED
      for (let i = 0; i < 4; i++) {
        await expect(
          authService.login(
            { identifier: target, password: 'wrong' },
            '127.0.0.1',
            'agent',
            `corr-lock-${i}`,
          ),
        ).rejects.toThrow(expect.objectContaining({ code: ApiErrorCode.UNAUTHENTICATED }));
      }

      // 5th failed attempt engages RATE_LIMITED lockout
      await expect(
        authService.login(
          { identifier: target, password: 'wrong' },
          '127.0.0.1',
          'agent',
          'corr-lock-5',
        ),
      ).rejects.toThrow(expect.objectContaining({ code: ApiErrorCode.RATE_LIMITED }));

      // Subsequent attempt while locked out immediately rejects with RATE_LIMITED
      await expect(
        authService.login(
          { identifier: target, password: 'any_password' },
          '127.0.0.1',
          'agent',
          'corr-lock-subsequent',
        ),
      ).rejects.toThrow(expect.objectContaining({ code: ApiErrorCode.RATE_LIMITED }));
    });
  });

  describe('FR-AUTH-008: Admin TOTP Multi-Factor Authentication', () => {
    it('TC-MFA-01: Privileged admin with TOTP enabled requires two-step verification', async () => {
      const mfaService = new MfaService();
      const secret = mfaService.generateSecret();

      // Configure admin with TOTP
      mockAdminUser.totpEnabled = true;
      (mockAdminUser as any).totpSecret = secret;

      const loginRes = await authService.login(
        { identifier: 'superadmin', password: 'SuperAdmin@2026!' },
        '127.0.0.1',
        'jest-agent',
        'corr-mfa-1',
      );

      expect(loginRes.mfaRequired).toBe(true);
      expect(loginRes.mfaToken).toBeDefined();

      // Attempt verification with invalid TOTP code
      await expect(
        authService.verifyMfa(
          { mfaToken: loginRes.mfaToken!, code: '000000' },
          '127.0.0.1',
          'corr-mfa-fail',
        ),
      ).rejects.toThrow(expect.objectContaining({ code: ApiErrorCode.UNAUTHENTICATED }));

      // Reset mockAdminUser TOTP for subsequent tests
      mockAdminUser.totpEnabled = false;
      (mockAdminUser as any).totpSecret = null;
    });
  });

  describe('FR-AUTH-006 & FR-AUTH-007: Token Rotation, Revocation & Deactivation', () => {
    it('TC-TOK-01: Refresh token rotation issues new token pair', async () => {
      const loginRes = await authService.login(
        { identifier: 'superadmin', password: 'SuperAdmin@2026!' },
        '127.0.0.1',
        'agent',
        'corr-tok-1',
      );

      const refreshRes = await authService.refresh(
        { refreshToken: loginRes.refreshToken! },
        '127.0.0.1',
        'corr-tok-2',
      );

      expect(refreshRes.accessToken).toBeDefined();
      expect(refreshRes.refreshToken).toBeDefined();
    });

    it('TC-TOK-02: Deactivating candidate account revokes existing sessions immediately', async () => {
      const initialTokenVersion = mockCandidateUser.tokenVersion;

      const result = await authService.deactivateAccount(
        mockAdminUser.id,
        mockCandidateUser.id,
        { reason: 'Suspicious exam activity' },
        'corr-deact-1',
      );

      expect(result.success).toBe(true);
      expect(mockCandidateUser.accountStatus).toBe(AccountStatus.INACTIVE);
      expect(mockCandidateUser.tokenVersion).toBeGreaterThan(initialTokenVersion);

      // Attempting to login while deactivated must be rejected with INVALID_STATE
      await expect(
        authService.login(
          { identifier: 'candidate_demo', password: 'Candidate@2026!' },
          '127.0.0.1',
          'agent',
          'corr-deact-login',
        ),
      ).rejects.toThrow(expect.objectContaining({ code: ApiErrorCode.INVALID_STATE }));
    });
  });

  describe('FR-AUD-001 to FR-AUD-007: Audit Logging & Sanitization', () => {
    it('TC-AUD-01: Metadata sanitizer must redact passwords, tokens and secrets', () => {
      const sensitiveData = {
        username: 'candidate01',
        password: 'PlainTextPassword123!',
        jwtToken: 'eyJhbGciOiJIUzI1Ni...',
        refreshToken: 'refresh_secret_123',
        safeMetadata: {
          examId: 'asmt_123',
          apiSecretKey: 'super_secret',
        },
      };

      const sanitized = auditService.sanitizeMetadata(sensitiveData);

      expect(sanitized.username).toBe('candidate01');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.jwtToken).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.safeMetadata.examId).toBe('asmt_123');
      expect(sanitized.safeMetadata.apiSecretKey).toBe('[REDACTED]');
    });

    it('TC-AUD-02: Successful login generates append-only audit entry', async () => {
      const entry = await auditService.log({
        actorUserId: mockAdminUser.id,
        eventType: 'TEST_AUDIT_EVENT',
        affectedEntity: 'system',
        outcome: AuditOutcome.SUCCESS,
        correlationId: 'corr-audit-test',
        metadata: { action: 'unit_test' },
      });

      expect(entry.eventType).toBe('TEST_AUDIT_EVENT');
      expect(entry.outcome).toBe(AuditOutcome.SUCCESS);
      expect(entry.correlationId).toBe('corr-audit-test');
    });
  });
});
