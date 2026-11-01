/**
 * Code Runner HTTP Application Dispatcher
 * Traceability: FR-CODE-005, FR-CODE-008, FR-CODE-013, FR-SQL-002, NFR-PERF-005, NFR-SEC-008, Decision 7, SRS 10.4
 */

import { IncomingMessage, ServerResponse } from 'http';
import { verifyInternalAuth } from './security/auth-guard.js';
import { ProcessSandboxRunner } from './runners/process-runner.js';
import { SqlSandboxEvaluator } from './sql/sql-sandbox.js';
import { CodeExecutionRequest, CodeExecutionResponse, SqlExecutionRequest } from './types.js';
import {
  ExecutionQueue,
  QueueCapacityError,
  QueueTimeoutError,
} from './concurrency/execution-queue.js';
import { config } from './config.js';

// Global execution queue instance enforcing concurrency limits and queue capacity bounds
export const runnerQueue = new ExecutionQueue({
  maxConcurrent: config.maxConcurrentExecutions,
  maxQueueDepth: config.maxQueueDepth,
  queueTimeoutMs: config.queueTimeoutMs,
});

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const method = (req.method || 'GET').toUpperCase();

  // Health check endpoint (unprotected, exposes runner & queue telemetry)
  if (method === 'GET' && url.pathname === '/api/v1/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'code-runner',
        timestamp: new Date().toISOString(),
        supportedLanguages: ['c', 'cpp', 'java', 'python', 'javascript'],
        sandbox: 'isolated',
        limits: {
          costSafeMemoryLimitMb: config.costSafeMemoryLimitMb,
          defaultTimeLimitMs: config.defaultTimeLimitMs,
          pidsLimit: config.pidsLimit,
        },
        queue: {
          activeCount: runnerQueue.getActiveCount(),
          queueDepth: runnerQueue.getQueueDepth(),
          maxConcurrent: config.maxConcurrentExecutions,
          maxQueueDepth: config.maxQueueDepth,
          totalProcessed: runnerQueue.getTotalProcessed(),
          totalRejected: runnerQueue.getTotalRejected(),
        },
      }),
    );
    return;
  }

  // All other endpoints require internal shared secret token authentication (FR-CODE-013)
  if (!verifyInternalAuth(req, res)) {
    return;
  }

  // POST /api/v1/execute
  if (method === 'POST' && url.pathname === '/api/v1/execute') {
    try {
      const body = await parseJsonBody<CodeExecutionRequest>(req);
      const result = await runnerQueue.run(() => ProcessSandboxRunner.execute(body));

      const response: CodeExecutionResponse = {
        status: result.status,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        testCasesPassed: result.testCasesPassed,
        totalTestCases: result.totalTestCases,
        compilerOutput: result.compilerOutput,
        results: result.results,
        correlationId: `cid-run-${Date.now().toString(36)}`,
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (err) {
      if (err instanceof QueueCapacityError) {
        res.writeHead(503, {
          'Content-Type': 'application/json',
          'Retry-After': String(err.retryAfterSeconds),
        });
        res.end(
          JSON.stringify({
            status: 'QUEUE_CAPACITY_EXCEEDED',
            error: err.message,
            retryAfter: err.retryAfterSeconds,
            correlationId: `cid-cap-${Date.now().toString(36)}`,
          }),
        );
        return;
      }

      if (err instanceof QueueTimeoutError) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'QUEUE_TIMEOUT_EXCEEDED',
            error: err.message,
            correlationId: `cid-tout-${Date.now().toString(36)}`,
          }),
        );
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'INTERNAL_EVALUATION_ERROR',
          error: (err as Error).message,
          correlationId: `cid-err-${Date.now().toString(36)}`,
        }),
      );
    }
    return;
  }

  // POST /api/v1/execute-sql
  if (method === 'POST' && url.pathname === '/api/v1/execute-sql') {
    try {
      const body = await parseJsonBody<SqlExecutionRequest>(req);
      const result = await runnerQueue.run(async () => SqlSandboxEvaluator.evaluate(body));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      if (err instanceof QueueCapacityError) {
        res.writeHead(503, {
          'Content-Type': 'application/json',
          'Retry-After': String(err.retryAfterSeconds),
        });
        res.end(
          JSON.stringify({
            status: 'QUEUE_CAPACITY_EXCEEDED',
            error: err.message,
            retryAfter: err.retryAfterSeconds,
            correlationId: `cid-cap-${Date.now().toString(36)}`,
          }),
        );
        return;
      }

      if (err instanceof QueueTimeoutError) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'QUEUE_TIMEOUT_EXCEEDED',
            error: err.message,
            correlationId: `cid-tout-${Date.now().toString(36)}`,
          }),
        );
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'INTERNAL_EVALUATION_ERROR',
          error: (err as Error).message,
          correlationId: `cid-err-${Date.now().toString(36)}`,
        }),
      );
    }
    return;
  }

  // 404 Route Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found.' }));
}

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        // 1MB request body limit
        reject(new Error('Request body payload exceeded maximum size limit.'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}') as T;
        resolve(parsed);
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}
