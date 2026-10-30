/**
 * Internal API Authentication Guard
 * Protects code-runner service endpoints using shared secret authentication.
 * Traceability: FR-CODE-013, Non-Negotiable Rule 8
 */

import { IncomingMessage, ServerResponse } from 'http';
import { config } from '../config.js';

export function verifyInternalAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const token =
    req.headers['x-code-runner-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');

  if (!token || token !== config.sharedSecret) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'rejected',
        code: 'UNAUTHORIZED_RUNNER_ACCESS',
        message: 'Invalid or missing internal code runner authentication token.',
        correlationId: `cid-runner-${Date.now().toString(36)}`,
      }),
    );
    return false;
  }

  return true;
}
