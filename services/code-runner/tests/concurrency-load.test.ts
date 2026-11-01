/**
 * Code Runner Concurrency, Queue Limits & Load-Testing Suite
 * Validates concurrent submission handling, queue depth bounds, cost-safe defaults,
 * and capacity rejection under stress.
 * Traceability: NFR-PERF-005, NFR-SEC-008, Decision 7, SRS 10.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionQueue,
  QueueCapacityError,
  QueueTimeoutError,
} from '../src/concurrency/execution-queue.js';
import { ProcessSandboxRunner } from '../src/runners/process-runner.js';
import { SqlSandboxEvaluator } from '../src/sql/sql-sandbox.js';
import { config } from '../src/config.js';
import { runnerQueue } from '../src/app.js';

describe('Code Runner Concurrency & Queue Load Testing (Phase 7)', () => {
  beforeEach(() => {
    runnerQueue.reset();
  });

  describe('1. ExecutionQueue Concurrency Limiter & Capacity Bounds', () => {
    it('enforces maximum concurrency and processes tasks sequentially when slots saturate', async () => {
      const queue = new ExecutionQueue({
        maxConcurrent: 3,
        maxQueueDepth: 20,
        queueTimeoutMs: 5000,
      });

      let currentExecuting = 0;
      let maxObservedExecuting = 0;

      const tasks = Array.from({ length: 12 }, (_, i) => async () => {
        currentExecuting += 1;
        if (currentExecuting > maxObservedExecuting) {
          maxObservedExecuting = currentExecuting;
        }
        // Small delay to simulate evaluation workload
        await new Promise((resolve) => setTimeout(resolve, 30));
        currentExecuting -= 1;
        return `task-${i}-completed`;
      });

      const results = await Promise.all(tasks.map((t) => queue.run(t)));

      expect(results).toHaveLength(12);
      expect(maxObservedExecuting).toBeLessThanOrEqual(3);
      expect(queue.getPeakConcurrent()).toBeLessThanOrEqual(3);
      expect(queue.getTotalProcessed()).toBe(12);
      expect(queue.getQueueDepth()).toBe(0);
      expect(queue.getActiveCount()).toBe(0);
    });

    it('rejects excess requests with QueueCapacityError when maxQueueDepth is exceeded', async () => {
      const queue = new ExecutionQueue({
        maxConcurrent: 2,
        maxQueueDepth: 3, // Capacity = 2 active + 3 queued = 5 total
        queueTimeoutMs: 5000,
      });

      let releaseBlock: () => void = () => {};
      const blockPromise = new Promise<void>((resolve) => {
        releaseBlock = resolve;
      });
      const blockingTask = async () => {
        await blockPromise;
        return 'done';
      };

      // Submit 2 active tasks
      const p1 = queue.run(blockingTask);
      const p2 = queue.run(blockingTask);

      // Submit 3 queued tasks
      const p3 = queue.run(blockingTask);
      const p4 = queue.run(blockingTask);
      const p5 = queue.run(blockingTask);

      // 6th task exceeds queue depth (3 queued) -> must reject immediately!
      await expect(queue.run(blockingTask)).rejects.toThrow(QueueCapacityError);
      expect(queue.getTotalRejected()).toBe(1);

      // Release blocking tasks to drain queue
      releaseBlock();
      const settled = await Promise.all([p1, p2, p3, p4, p5]);
      expect(settled).toHaveLength(5);
      expect(queue.getTotalProcessed()).toBe(5);
    });

    it('triggers QueueTimeoutError when task waits in queue longer than queueTimeoutMs', async () => {
      const queue = new ExecutionQueue({
        maxConcurrent: 1,
        maxQueueDepth: 5,
        queueTimeoutMs: 80, // 80ms timeout
      });

      // Task 1 runs for 200ms
      const slowTask = queue.run(() => new Promise((resolve) => setTimeout(resolve, 200)));

      // Task 2 waits in queue and should timeout after 80ms
      const timedOutTask = queue.run(() => Promise.resolve('fast'));

      await expect(timedOutTask).rejects.toThrow(QueueTimeoutError);
      await slowTask;
    });
  });

  describe('2. Concurrent Real-World Sandbox Executions (Python & SQL Load Test)', () => {
    it('executes 15 concurrent Python and SQLite submissions concurrently without resource exhaustion', async () => {
      const pythonSource = `import sys
lines = sys.stdin.read().split()
if lines:
    nums = [int(x) for x in lines]
    print(sum(nums))
`;

      const pythonSubmission = {
        language: 'python' as const,
        sourceCode: pythonSource,
        timeLimitMs: 3000,
        memoryLimitMb: config.costSafeMemoryLimitMb,
        testCases: [
          {
            id: 'tc-load-1',
            inputData: '10 20 30',
            expectedOutput: '60',
            visibility: 'SAMPLE' as const,
            marks: 5,
          },
          {
            id: 'tc-load-2',
            inputData: '100 -50 25',
            expectedOutput: '75',
            visibility: 'HIDDEN' as const,
            marks: 5,
          },
        ],
      };

      const sqlSubmission = {
        schemaDdl: `
          CREATE TABLE candidates (id INTEGER PRIMARY KEY, name TEXT, score INTEGER);
        `,
        seedDataSql: `
          INSERT INTO candidates VALUES (1, 'Kavya', 95), (2, 'Rohan', 85), (3, 'Aisha', 90);
        `,
        candidateQuery: `SELECT name FROM candidates WHERE score >= 90 ORDER BY score DESC;`,
        referenceQuery: `SELECT name FROM candidates WHERE score >= 90 ORDER BY score DESC;`,
        comparisonMode: 'EXACT_MATCH' as const,
      };

      // Create a batch of 15 simultaneous requests through runnerQueue
      const requests = Array.from({ length: 15 }, (_, i) => {
        if (i % 2 === 0) {
          return runnerQueue.run(() => ProcessSandboxRunner.execute(pythonSubmission));
        } else {
          return runnerQueue.run(async () => SqlSandboxEvaluator.evaluate(sqlSubmission));
        }
      });

      const results = await Promise.all(requests);

      expect(results).toHaveLength(15);

      // Verify Python evaluations
      for (let i = 0; i < 15; i += 2) {
        const pyResult = results[i] as any;
        expect(pyResult.status).toBe('ACCEPTED');
        expect(pyResult.testCasesPassed).toBe(2);
        expect(pyResult.totalScore).toBe(10);
      }

      // Verify SQL evaluations
      for (let i = 1; i < 15; i += 2) {
        const sqlResult = results[i] as any;
        expect(sqlResult.status).toBe('ACCEPTED');
        expect(sqlResult.isMatch).toBe(true);
        expect(sqlResult.rowCount).toBe(2);
      }

      // Peak concurrency must never exceed config.maxConcurrentExecutions
      expect(runnerQueue.getPeakConcurrent()).toBeLessThanOrEqual(config.maxConcurrentExecutions);
      expect(runnerQueue.getTotalProcessed()).toBe(15);
      expect(runnerQueue.getActiveCount()).toBe(0);
      expect(runnerQueue.getQueueDepth()).toBe(0);
    }, 25000); // 25s test budget for concurrent subprocess spawning
  });

  describe('3. Resource Limits & Cost-Safe Defaults Validation', () => {
    it('verifies cost-safe defaults configured according to NFR-SEC-008 and NFR-PERF-005', () => {
      expect(config.costSafeMemoryLimitMb).toBe(128);
      expect(config.maxConcurrentExecutions).toBe(10);
      expect(config.maxQueueDepth).toBe(100);
      expect(config.queueTimeoutMs).toBe(15000);
      expect(config.pidsLimit).toBe(64);
      expect(config.defaultTimeLimitMs).toBe(2000);
      expect(config.maxTimeLimitMs).toBe(10000);
      expect(config.maxSourceSizeBytes).toBe(65536);
      expect(config.maxOutputSizeBytes).toBe(65536);
    });
  });
});
