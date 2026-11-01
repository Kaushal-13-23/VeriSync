import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenService } from './token.service';
import { UserRole } from '@prisma/client';
import { ApiErrorCode } from '@verisync/shared';
import { ROLES_KEY } from './decorators/roles.decorator';

describe('Phase 6 Automated Authorization Matrix Test (SRS Section 10, NFR-SEC, RBAC)', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let jwtGuard: JwtAuthGuard;
  let tokenServiceMock: any;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    tokenServiceMock = {
      verifyAccessToken: jest.fn(),
      isTokenRevoked: jest.fn().mockResolvedValue(false),
    };
    jwtGuard = new JwtAuthGuard(reflector, tokenServiceMock as TokenService);
  });

  const createExecutionContext = (user?: { role: UserRole; id?: string }, isPublic = false) => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          headers: user ? { authorization: 'Bearer mock.jwt.token' } : {},
        }),
      }),
    } as unknown as ExecutionContext;
  };

  const setupRouteRoles = (roles?: UserRole[], isPublic = false) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === 'isPublic') return isPublic;
      if (key === ROLES_KEY) return roles;
      return undefined;
    });
  };

  describe('Unauthenticated Access Enforcement', () => {
    it('should reject unauthenticated request with 401 UNAUTHENTICATED on protected routes', async () => {
      setupRouteRoles([UserRole.SUPER_ADMIN], false);
      const context = createExecutionContext(undefined, false);

      await expect(jwtGuard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({ code: ApiErrorCode.UNAUTHENTICATED }),
      );
    });

    it('should allow unauthenticated request on public routes', async () => {
      setupRouteRoles([], true);
      const context = createExecutionContext(undefined, true);
      const canActivate = await jwtGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });
  });

  describe('Exhaustive Role vs Resource Matrix', () => {
    const allRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.TECHNICAL_EVALUATOR,
      UserRole.CANDIDATE,
    ];

    interface MatrixTestCase {
      resource: string;
      allowedRoles: UserRole[];
    }

    const matrix: MatrixTestCase[] = [
      {
        resource: 'Lab Device Registry (/admin/devices - FR-LAB-001..004)',
        allowedRoles: [UserRole.SUPER_ADMIN],
      },
      {
        resource: 'Audit Log & Hash Chain (/admin/audit - FR-AUD-004, NFR-SEC-009)',
        allowedRoles: [UserRole.SUPER_ADMIN],
      },
      {
        resource: 'Data Retention & Purge (/admin/retention - FR-RET-001..004)',
        allowedRoles: [UserRole.SUPER_ADMIN],
      },
      {
        resource: 'Administrative Password Reset & Deactivation (/auth/admin/* - FR-AUTH-006, 009)',
        allowedRoles: [UserRole.SUPER_ADMIN],
      },
      {
        resource: 'Question Authoring & Evaluation (/questions, /evaluation - FR-QB, FR-EVAL)',
        allowedRoles: [UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR],
      },
      {
        resource: 'Candidate Profile Admin (/candidates - FR-CAN-001..007)',
        allowedRoles: [UserRole.SUPER_ADMIN],
      },
      {
        resource:
          'Candidate Exam Session Runtime (/sessions/start, /sessions/heartbeat - FR-UI, FR-ANS, FR-TIME)',
        allowedRoles: [UserRole.CANDIDATE],
      },
      {
        resource: 'Candidate Lockdown Telemetry (/candidate/lockdown-events - FR-LAB-006)',
        allowedRoles: [UserRole.CANDIDATE],
      },
      {
        resource:
          'Coding & SQL Execution Sandboxes (/coding/submit, /sql/execute - FR-CODE, FR-SQL)',
        allowedRoles: [UserRole.CANDIDATE],
      },
    ];

    for (const testCase of matrix) {
      describe(testCase.resource, () => {
        for (const role of allRoles) {
          const isAllowed = testCase.allowedRoles.includes(role);

          it(`Role ${role} should be ${isAllowed ? 'ALLOWED' : 'FORBIDDEN (403)'}`, () => {
            setupRouteRoles(testCase.allowedRoles, false);
            const context = createExecutionContext({ role, id: `user-${role.toLowerCase()}` });

            if (isAllowed) {
              const allowed = rolesGuard.canActivate(context);
              expect(allowed).toBe(true);
            } else {
              expect(() => rolesGuard.canActivate(context)).toThrow(
                expect.objectContaining({ code: ApiErrorCode.FORBIDDEN }),
              );
            }
          });
        }
      });
    }
  });
});
