import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ApiErrorException } from '../../common/api-error.exception';
import { ApiErrorCode } from '@verisync/shared';
import { AuthenticatedRequest } from '../../common/correlation-id.middleware';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user || !user.role) {
      throw new ApiErrorException(
        ApiErrorCode.FORBIDDEN,
        'Access denied: authenticated identity does not contain role metadata',
      );
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ApiErrorException(
        ApiErrorCode.FORBIDDEN,
        `Access denied: required role (${requiredRoles.join(', ')}) but user has (${user.role})`,
      );
    }

    return true;
  }
}
