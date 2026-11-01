import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorCode, ApiErrorResponse } from '@verisync/shared';
import { ApiErrorException } from './api-error.exception';
import { AuthenticatedRequest } from './correlation-id.middleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const correlationId =
      request.correlationId || (request.headers['x-correlation-id'] as string) || 'unknown';
    const timestamp = new Date().toISOString();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ApiErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected internal error occurred';
    let details: any = undefined;

    if (exception instanceof ApiErrorException) {
      httpStatus = exception.getStatus();
      errorCode = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message
          ? Array.isArray(resObj.message)
            ? resObj.message.join('; ')
            : String(resObj.message)
          : exception.message;
        details = resObj.error || undefined;
      } else {
        message = String(res);
      }

      // Map standard HTTP status codes to SRS 8.3.3 error codes
      switch (httpStatus as number) {
        case HttpStatus.UNAUTHORIZED:
          errorCode = ApiErrorCode.UNAUTHENTICATED;
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = ApiErrorCode.FORBIDDEN;
          break;
        case HttpStatus.BAD_REQUEST:
          errorCode = ApiErrorCode.VALIDATION_FAILED;
          break;
        case HttpStatus.UNPROCESSABLE_ENTITY:
          errorCode = ApiErrorCode.VALIDATION_FAILED;
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = ApiErrorCode.INVALID_STATE;
          break;
        case HttpStatus.CONFLICT:
          errorCode = ApiErrorCode.INVALID_STATE;
          break;
        case HttpStatus.GONE:
          errorCode = ApiErrorCode.QUESTION_EXPIRED;
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          errorCode = ApiErrorCode.RATE_LIMITED;
          break;
        case 426:
          errorCode = ApiErrorCode.UNSUPPORTED_CLIENT;
          break;
        default:
          errorCode = ApiErrorCode.INTERNAL_ERROR;
      }
    } else {
      const err = exception as Error;
      this.logger.error(`Unhandled Exception [${correlationId}]: ${err?.message}`, err?.stack);
    }

    const errorPayload: ApiErrorResponse = {
      status: 'error',
      code: errorCode,
      message,
      correlationId,
      ...(details ? { details } : {}),
    };

    response.status(httpStatus).json({
      error: errorPayload,
      timestamp,
      correlationId,
    });
  }
}
