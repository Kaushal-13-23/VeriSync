/**
 * Code Runner Service Configuration
 * Traceability: FR-CODE-001, FR-CODE-006, FR-CODE-007, FR-CODE-013, NFR-SEC-008
 */

export const config = {
  port: parseInt(process.env.CODE_RUNNER_PORT || '5050', 10),
  sharedSecret: process.env.CODE_RUNNER_SHARED_SECRET || 'verisync-internal-runner-secret-key',
  maxSourceSizeBytes: parseInt(process.env.MAX_SOURCE_SIZE_BYTES || '65536', 10), // 64 KB
  maxOutputSizeBytes: parseInt(process.env.MAX_OUTPUT_SIZE_BYTES || '65536', 10), // 64 KB
  defaultTimeLimitMs: 2000,
  maxTimeLimitMs: 10000,
  defaultMemoryLimitMb: 256,
  maxMemoryLimitMb: 512,
  pidsLimit: 64, // Mitigates fork bombs
  dockerImages: {
    c: 'verisync-runner-c:13.2.0',
    cpp: 'verisync-runner-cpp:13.2.0',
    java: 'verisync-runner-java:21.0.2',
    python: 'verisync-runner-python:3.11.8',
    javascript: 'verisync-runner-javascript:20.11.1',
  },
  // Blocked cloud metadata IP (AWS, GCP, Azure metadata service)
  blockedMetadataIp: '169.254.169.254',
};
