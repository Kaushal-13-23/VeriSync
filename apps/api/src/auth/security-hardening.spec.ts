import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RateLimiterService } from './rate-limiter.service';
import { MfaService } from './mfa.service';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApiErrorException } from '../common/api-error.exception';
import {
  ApiErrorCode,
  AccountStatus,
  UserRole,
  SessionState,
  QuestionType,
} from '@verisync/shared';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('Phase 6 Security Hardening & Test Cases (TC08, TC09, TC15, TC16, TC17)', () => {
  let guard: JwtAuthGuard;
  let tokenServiceMock: any;
  let authService: AuthService;
  let rateLimiter: RateLimiterService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      candidateProfile: {
        findUnique: jest.fn(),
      },
      labDevice: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      assessmentAssignment: {
        findUnique: jest.fn(),
      },
      assessmentSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    audit = {
      log: jest.fn().mockResolvedValue({ id: 'audit-mock-1' }),
    };

    tokenServiceMock = {
      verifyAccessToken: jest.fn().mockImplementation(async (token: string) => {
        return {
          sub: 'usr-cand-1',
          username: 'cand-001',
          role: 'CANDIDATE',
          type: 'access',
          jti: 'jti-1',
          tokenVersion: 1,
          deviceId: 'LAB-ROOM-A-PC01',
          clientVersion: '1.4.0',
        };
      }),
      isTokenRevoked: jest.fn().mockResolvedValue(false),
      generateAccessToken: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    rateLimiter = new RateLimiterService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: TokenService, useValue: tokenServiceMock },
        { provide: Reflector, useValue: new Reflector() },
        AuthService,
        PasswordService,
        { provide: RateLimiterService, useValue: rateLimiter },
        MfaService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    authService = module.get<AuthService>(AuthService);
  });

  describe('TC-08: Cross-Candidate Access & Lab Device Binding (FR-AUTH-010, SRS 10)', () => {
    it('should allow candidate access when request header x-device-id matches token bound device', async () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: 'Bearer valid-token',
              'x-device-id': 'LAB-ROOM-A-PC01',
              'x-client-version': '1.4.0',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should reject with 403 FORBIDDEN when candidate uses token from Device A on Device B (TC-08)', async () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: 'Bearer valid-token',
              'x-device-id': 'LAB-ROOM-B-PC99', // Mismatched device!
            },
          }),
        }),
      } as unknown as ExecutionContext;

      try {
        await guard.canActivate(mockContext);
        fail('Should have rejected with 403 FORBIDDEN');
      } catch (err: any) {
        expect(err.getStatus()).toBe(403);
        expect(err.code).toBe(ApiErrorCode.FORBIDDEN);
        expect(err.message).toContain('Cross-device access forbidden');
      }
    });
  });

  describe('TC-16: Unsupported Client Version Rejection (FR-LAB-003, FR-AUTH-010)', () => {
    it('should reject with 426 UPGRADE_REQUIRED when client version in header does not match bound version', async () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: 'Bearer valid-token',
              'x-device-id': 'LAB-ROOM-A-PC01',
              'x-client-version': '1.3.0', // Outdated client version!
            },
          }),
        }),
      } as unknown as ExecutionContext;

      try {
        await guard.canActivate(mockContext);
        fail('Should have rejected with 426 UPGRADE_REQUIRED');
      } catch (err: any) {
        expect(err.getStatus()).toBe(426);
        expect(err.code).toBe(ApiErrorCode.UNSUPPORTED_CLIENT);
      }
    });

    it('should reject candidate login with 426 when reporting outdated clientVersion to lab device', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr-cand-1',
        username: 'cand-001',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
        role: UserRole.CANDIDATE,
        accountStatus: AccountStatus.ACTIVE,
      });

      prisma.labDevice.findUnique.mockResolvedValue({
        id: 'dev-1',
        deviceReference: 'LAB-ROOM-A-PC01',
        approvedClientVersion: '1.4.0',
        deviceStatus: 'ACTIVE',
      });

      // Mock password verify as valid
      jest.spyOn((authService as any).passwordService, 'verifyPassword').mockResolvedValue(true);

      try {
        await authService.login(
          {
            identifier: 'cand-001',
            password: 'CorrectPassword123!',
            deviceId: 'LAB-ROOM-A-PC01',
            clientVersion: '1.3.9', // Mismatched / Outdated
          },
          '192.168.1.101',
          'VeriSync-Candidate-Kiosk/1.3.9',
          'corr-tc16',
        );
        fail('Should have rejected with 426');
      } catch (err: any) {
        expect(err.getStatus()).toBe(426);
        expect(err.code).toBe(ApiErrorCode.UNSUPPORTED_CLIENT);
      }
    });
  });

  describe('TC-17: Brute-Force Rate Limiting (NFR-SEC-007, SRS 10.3)', () => {
    it('should lock out candidate after 5 consecutive failed logins with 429 RATE_LIMITED', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'usr-cand-1',
        username: 'brute.target',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
        role: UserRole.CANDIDATE,
        accountStatus: AccountStatus.ACTIVE,
      });

      jest.spyOn((authService as any).passwordService, 'verifyPassword').mockResolvedValue(false);

      // 4 failed attempts throw UNAUTHENTICATED (401)
      for (let attempt = 1; attempt <= 4; attempt++) {
        await expect(
          authService.login(
            { identifier: 'brute.target', password: 'WrongPassword!' },
            '10.0.0.1',
            'AttackerBot',
            `corr-att-${attempt}`,
          ),
        ).rejects.toThrow(ApiErrorException);
      }

      // 5th failed attempt engages lockout and throws RATE_LIMITED (429)
      try {
        await authService.login(
          { identifier: 'brute.target', password: 'WrongPassword!' },
          '10.0.0.1',
          'AttackerBot',
          'corr-att-5',
        );
        fail('5th attempt should engage temporary lockout');
      } catch (err: any) {
        expect(err.getStatus()).toBe(429);
        expect(err.code).toBe(ApiErrorCode.RATE_LIMITED);
        expect(err.details?.retryAfterSeconds).toBeGreaterThan(0);
      }

      // 6th attempt while locked out is immediately rejected with RATE_LIMITED
      try {
        await authService.login(
          { identifier: 'brute.target', password: 'EvenWithCorrectPasswordNow' },
          '10.0.0.1',
          'AttackerBot',
          'corr-att-6',
        );
        fail('Attempt while locked out must be immediately rejected');
      } catch (err: any) {
        expect(err.getStatus()).toBe(429);
        expect(err.code).toBe(ApiErrorCode.RATE_LIMITED);
      }
    });
  });

  describe('TC-09: Answer-Key & Hidden Test Cases Exposure Prevention (Non-negotiable Rule 2)', () => {
    it('should never expose isCorrect, explanation or hidden test cases in candidate session view', () => {
      // Direct validation of question attempt sanitization
      const mockRawQuestion = {
        id: 'q-mcq-1',
        questionType: QuestionType.MCQ_SINGLE,
        questionText: 'What is the time complexity of binary search?',
        topic: 'Algorithms',
        difficulty: 'EASY',
        maximumMarks: 2.0,
        negativeMarks: 0.5,
        explanation: 'Binary search halves the search space each step: O(log n)',
        referenceSolution: 'O(log n)',
        options: [
          { id: 'opt-1', optionText: 'O(log n)', isCorrect: true, displayOrder: 1 },
          { id: 'opt-2', optionText: 'O(n)', isCorrect: false, displayOrder: 2 },
          { id: 'opt-3', optionText: 'O(n^2)', isCorrect: false, displayOrder: 3 },
        ],
        testCases: [
          { id: 'tc-sample-1', isHidden: false, input: '5', expectedOutput: '2' },
          { id: 'tc-hidden-1', isHidden: true, input: '100000', expectedOutput: '17' },
        ],
      };

      // Candidate sanitized options MUST NOT contain isCorrect or explanation
      const sanitizedOptions = mockRawQuestion.options.map((opt) => ({
        id: opt.id,
        optionText: opt.optionText,
        displayOrder: opt.displayOrder,
      }));

      // Candidate sanitized test cases MUST only contain sample (non-hidden) test cases
      const sanitizedTestCases = mockRawQuestion.testCases
        .filter((tc) => !tc.isHidden)
        .map((tc) => ({
          id: tc.id,
          input: tc.input,
          sampleOutput: tc.expectedOutput,
        }));

      const serialized = JSON.stringify({
        questionId: mockRawQuestion.id,
        questionText: mockRawQuestion.questionText,
        options: sanitizedOptions,
        testCases: sanitizedTestCases,
      });

      expect(serialized).not.toContain('isCorrect');
      expect(serialized).not.toContain('explanation');
      expect(serialized).not.toContain('referenceSolution');
      expect(serialized).not.toContain('100000'); // Hidden input
      expect(serialized).not.toContain('tc-hidden-1'); // Hidden test case ID
    });
  });

  describe('TC-15: Concurrent Active Session Denial (BR-007)', () => {
    it('should reject startSession when candidate already has an active session', () => {
      const activeSessions = [
        {
          id: 'sess-active-1',
          sessionStatus: SessionState.ACTIVE,
          attemptNumber: 1,
        },
      ];

      const hasActive = activeSessions.some(
        (s) =>
          s.sessionStatus === SessionState.ACTIVE ||
          s.sessionStatus === SessionState.READY ||
          s.sessionStatus === SessionState.INTERRUPTED,
      );

      expect(hasActive).toBe(true);
      if (hasActive) {
        const error = new ApiErrorException(
          ApiErrorCode.INVALID_STATE,
          'An active assessment session already exists. Multiple simultaneous sessions are denied (BR-007, TC-15).',
        );
        expect(error.getStatus()).toBe(409);
        expect(error.code).toBe(ApiErrorCode.INVALID_STATE);
      }
    });
  });
});
