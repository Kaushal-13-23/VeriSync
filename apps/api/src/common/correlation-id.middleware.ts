import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface AuthenticatedRequest extends Request {
  correlationId?: string;
  user?: any;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const existingCorrelationId = req.headers['x-correlation-id'] as string;
    const correlationId =
      existingCorrelationId && existingCorrelationId.trim().length > 0
        ? existingCorrelationId
        : randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}
