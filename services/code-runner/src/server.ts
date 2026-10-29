/**
 * Code Runner HTTP Microservice Entry Point
 * Traceability: FR-CODE-005, Non-Negotiable Rule 8
 */

import { createServer } from 'http';
import { handleRequest } from './app.js';
import { config } from './config.js';

export const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[CodeRunner Error]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'INTERNAL_EVALUATION_ERROR',
          message: 'An unexpected evaluation error occurred.',
          correlationId: `cid-srv-${Date.now().toString(36)}`,
        }),
      );
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.info(`[VeriSync] Code Runner microservice listening on port ${config.port}`);
  });
}
