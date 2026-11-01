/**
 * Code Execution Concurrency Control & Semaphore Queue
 * Limits concurrent running child processes, sets queue bounds to prevent
 * memory explosion under load spikes, and implements cost-safe defaults.
 * Traceability: NFR-PERF-005, NFR-SEC-008, Decision 7, SRS 10.4
 */

export class QueueCapacityError extends Error {
  public code = 'QUEUE_CAPACITY_EXCEEDED';
  public retryAfterSeconds = 2;

  constructor(message = 'Execution queue has reached maximum capacity. Please retry shortly.') {
    super(message);
    this.name = 'QueueCapacityError';
  }
}

export class QueueTimeoutError extends Error {
  public code = 'QUEUE_TIMEOUT_EXCEEDED';

  constructor(
    message = 'Request timed out waiting in execution queue for an available runner slot.',
  ) {
    super(message);
    this.name = 'QueueTimeoutError';
  }
}

interface QueuedItem<T> {
  task: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
  enqueuedAt: number;
}

export interface ExecutionQueueOptions {
  maxConcurrent: number;
  maxQueueDepth: number;
  queueTimeoutMs: number;
}

export class ExecutionQueue {
  private activeCount = 0;
  private peakConcurrent = 0;
  private totalProcessed = 0;
  private totalRejected = 0;
  private queue: Array<QueuedItem<unknown>> = [];

  constructor(private options: ExecutionQueueOptions) {}

  /**
   * Schedules a task through the concurrency queue.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.options.maxConcurrent) {
      return this.executeImmediate(task);
    }

    if (this.queue.length >= this.options.maxQueueDepth) {
      this.totalRejected += 1;
      throw new QueueCapacityError(
        `Execution queue depth limit reached (${this.options.maxQueueDepth} pending). Rejecting request to protect server resources (NFR-PERF-005).`,
      );
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove from queue on timeout
        const index = this.queue.findIndex((item) => item.timer === timer);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        this.totalRejected += 1;
        reject(new QueueTimeoutError());
      }, this.options.queueTimeoutMs);

      const queuedItem: QueuedItem<T> = {
        task,
        resolve,
        reject,
        timer,
        enqueuedAt: Date.now(),
      };

      this.queue.push(queuedItem as QueuedItem<unknown>);
    });
  }

  private async executeImmediate<T>(task: () => Promise<T>): Promise<T> {
    this.activeCount += 1;
    if (this.activeCount > this.peakConcurrent) {
      this.peakConcurrent = this.activeCount;
    }

    try {
      const result = await task();
      this.totalProcessed += 1;
      return result;
    } finally {
      this.activeCount -= 1;
      this.dispatchNext();
    }
  }

  private dispatchNext(): void {
    if (this.queue.length === 0 || this.activeCount >= this.options.maxConcurrent) {
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    clearTimeout(nextItem.timer);

    this.activeCount += 1;
    if (this.activeCount > this.peakConcurrent) {
      this.peakConcurrent = this.activeCount;
    }

    Promise.resolve()
      .then(() => nextItem.task())
      .then((res) => {
        this.totalProcessed += 1;
        nextItem.resolve(res);
      })
      .catch((err) => {
        nextItem.reject(err);
      })
      .finally(() => {
        this.activeCount -= 1;
        this.dispatchNext();
      });
  }

  // Telemetry getters
  getActiveCount(): number {
    return this.activeCount;
  }

  getPeakConcurrent(): number {
    return this.peakConcurrent;
  }

  getQueueDepth(): number {
    return this.queue.length;
  }

  getTotalProcessed(): number {
    return this.totalProcessed;
  }

  getTotalRejected(): number {
    return this.totalRejected;
  }

  reset(): void {
    for (const item of this.queue) {
      clearTimeout(item.timer);
      item.reject(new Error('Queue reset'));
    }
    this.queue = [];
    this.activeCount = 0;
    this.peakConcurrent = 0;
    this.totalProcessed = 0;
    this.totalRejected = 0;
  }
}
