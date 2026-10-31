import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiErrorException } from '../../common/api-error.exception';
import { ApiErrorCode } from '@verisync/shared';
import { AuthenticatedRequest } from '../../common/correlation-id.middleware';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'Authorization Bearer token is required',
      );
    }

    const token = authHeader.substring(7).trim();

    try {
      const payload = await this.tokenService.verifyAccessToken(token);

      if (payload.type !== 'access') {
        throw new ApiErrorException(
          ApiErrorCode.UNAUTHENTICATED,
          'Invalid token type for API access',
        );
      }

      const isRevoked = await this.tokenService.isTokenRevoked(
        payload.jti,
        payload.sub,
        payload.tokenVersion,
      );

      if (isRevoked) {
        throw new ApiErrorException(
          ApiErrorCode.UNAUTHENTICATED,
          'Token has been revoked or session terminated',
        );
      }

      request.user = payload;
      return true;
    } catch (err: any) {
      if (err instanceof ApiErrorException) {
        throw err;
      }
      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'Invalid or expired authorization token',
      );
    }
  }
}
