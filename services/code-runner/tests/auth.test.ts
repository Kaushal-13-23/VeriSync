/**
 * Internal API Authentication & Dispatcher Tests
 * Traceability: FR-CODE-013, Non-Negotiable Rule 8
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';
import { server } from '../src/server.js';
import { config } from '../src/config.js';

describe('Internal API Authentication & Health Endpoints (FR-CODE-013)', () => {
  let testPort: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      // Listen on ephemeral free port for tests
      server.listen(0, () => {
        const addr = server.address() as { port: number };
        testPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  function makeRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<{ statusCode: number; data: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: testPort,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            try {
              resolve({
                statusCode: res.statusCode || 500,
                data: JSON.parse(responseData || '{}'),
              });
            } catch {
              resolve({ statusCode: res.statusCode || 500, data: responseData });
            }
          });
        },
      );

      req.on('error', reject);
      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  it('serves unprotected /api/v1/health with service telemetry', async () => {
    const res = await makeRequest('GET', '/api/v1/health', {});
    expect(res.statusCode).toBe(200);
    expect(res.data.status).toBe('healthy');
    expect(res.data.service).toBe('code-runner');
    expect(res.data.supportedLanguages).toContain('python');
  });

  it('rejects /api/v1/execute without x-code-runner-token with 401 Unauthorized', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/execute',
      {},
      JSON.stringify({ language: 'python', sourceCode: 'print(1)', testCases: [] }),
    );

    expect(res.statusCode).toBe(401);
    expect(res.data.code).toBe('UNAUTHORIZED_RUNNER_ACCESS');
  });

  it('rejects /api/v1/execute with invalid token', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/execute',
      { 'x-code-runner-token': 'wrong-secret' },
      JSON.stringify({ language: 'python', sourceCode: 'print(1)', testCases: [] }),
    );

    expect(res.statusCode).toBe(401);
    expect(res.data.code).toBe('UNAUTHORIZED_RUNNER_ACCESS');
  });

  it('accepts execution request with valid shared secret token', async () => {
    const res = await makeRequest(
      'POST',
      '/api/v1/execute',
      { 'x-code-runner-token': config.sharedSecret },
      JSON.stringify({
        language: 'javascript',
        sourceCode: 'console.log("HELLO");',
        testCases: [{ inputData: '', expectedOutput: 'HELLO', visibility: 'SAMPLE' }],
      }),
    );

    expect(res.statusCode).toBe(200);
    expect(res.data.status).toBe('ACCEPTED');
  });
});
