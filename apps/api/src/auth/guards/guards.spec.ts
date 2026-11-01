import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { TokenService } from '../token.service';
import { UserRole } from '@prisma/client';
import { ApiErrorCode } from '@verisync/shared';

describe('RBAC & Auth Guards (Phase 1 Backend Foundation)', () => {
  let reflector: Reflector;
  let tokenServiceMock: any;
  let jwtAuthGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    tokenServiceMock = {
      verifyAccessToken: jest.fn(),
      isTokenRevoked: jest.fn(),
    };
    jwtAuthGuard = new JwtAuthGuard(reflector, tokenServiceMock as TokenService);
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockContext = (
    headers: Record<string, string> = {},
    user?: any,
    isPublic = false,
    requiredRoles?: UserRole[],
  ): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === 'isPublic') return isPublic;
      if (key === 'roles') return requiredRoles;
      return undefined;
    });

    const req: any = { headers, user, correlationId: 'corr-guard-test' };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('JwtAuthGuard', () => {
    it('TC-GUARD-01: Public endpoints should bypass JWT validation', async () => {
      const context = createMockContext({}, undefined, true);
      const canActivate = await jwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('TC-GUARD-02: Missing Authorization header should throw UNAUTHENTICATED', async () => {
      const context = createMockContext({}, undefined, false);
      await expect(jwtAuthGuard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({ code: ApiErrorCode.UNAUTHENTICATED }),
      );
    });

    it('TC-GUARD-03: Valid Bearer token should populate req.user and allow access', async () => {
      const payload = {
        sub: 'usr_1',
        username: 'admin',
        role: UserRole.SUPER_ADMIN,
        tokenVersion: 1,
        type: 'access',
      };
      tokenServiceMock.verifyAccessToken.mockResolvedValue(payload);
      tokenServiceMock.isTokenRevoked.mockResolvedValue(false);

      const context = createMockContext({ authorization: 'Bearer valid.jwt.token' });
      const canActivate = await jwtAuthGuard.canActivate(context);

      expect(canActivate).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user).toEqual(payload);
    });

    it('TC-GUARD-04: Revoked token should throw UNAUTHENTICATED', async () => {
      const payload = {
        sub: 'usr_1',
        username: 'admin',
        role: UserRole.SUPER_ADMIN,
        tokenVersion: 1,
        type: 'access',
      };
      tokenServiceMock.verifyAccessToken.mockResolvedValue(payload);
      tokenServiceMock.isTokenRevoked.mockResolvedValue(true); // Revoked

      const context = createMockContext({ authorization: 'Bearer revoked.jwt.token' });
      await expect(jwtAuthGuard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({ code: ApiErrorCode.UNAUTHENTICATED }),
      );
    });
  });

  describe('RolesGuard (RBAC)', () => {
    it('TC-RBAC-01: Candidate attempting to access SuperAdmin resource should be rejected with FORBIDDEN', () => {
      const candidateUser = {
        sub: 'cand_1',
        username: 'candidate',
        role: UserRole.CANDIDATE,
      };

      const context = createMockContext({}, candidateUser, false, [UserRole.SUPER_ADMIN]);

      expect(() => rolesGuard.canActivate(context)).toThrow(
        expect.objectContaining({ code: ApiErrorCode.FORBIDDEN }),
      );
    });

    it('TC-RBAC-02: SuperAdmin accessing SuperAdmin resource should succeed', () => {
      const adminUser = {
        sub: 'adm_1',
        username: 'superadmin',
        role: UserRole.SUPER_ADMIN,
      };

      const context = createMockContext({}, adminUser, false, [UserRole.SUPER_ADMIN]);

      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });
  });
});
