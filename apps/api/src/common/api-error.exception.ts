import { HttpException } from '@nestjs/common';
import { ApiErrorCode, ApiErrorCodeHttpStatus } from '@verisync/shared';

export class ApiErrorException extends HttpException {
  public readonly code: ApiErrorCode;
  public readonly details?: any;

  constructor(code: ApiErrorCode, message: string, details?: any, customHttpStatus?: number) {
    const status = customHttpStatus || ApiErrorCodeHttpStatus[code] || 500;
    super({ code, message, details }, status);
    this.code = code;
    this.details = details;
  }
}
