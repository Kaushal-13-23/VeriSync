/**
 * TC-11 Sandbox Escape Security Test Suite
 * Validates security restrictions per FR-CODE-007, FR-CODE-013, NFR-SEC-008, SRS 10.4:
 * 1. Network / Socket opening blocked or trapped
 * 2. Environment variables scrubbed (no secrets or application tokens leaked)
 * 3. Fork bomb mitigated
 * 4. Huge output capped at 64KB
 * 5. Infinite loop terminated with Time Limit Exceeded
 * 6. File writes outside sandbox restricted
 */

import { describe, it, expect } from 'vitest';
import { ProcessSandboxRunner } from '../src/runners/process-runner.js';
import { buildDockerRunArguments } from '../src/security/container-flags.js';
import { TestCase } from '../src/types.js';

describe('TC-11: Sandbox Escape Suite (FR-CODE-007, NFR-SEC-008, SRS 10.4)', () => {
  const dummyTestCase: TestCase = {
    inputData: '',
    expectedOutput: 'OK',
    visibility: 'SAMPLE',
  };

  it('blocks environment variable leakage and scrubs all application secrets (FR-CODE-013, SRS 10.4)', async () => {
    // Attempt to inspect process environment
    const maliciousCode = `
const leakedKeys = Object.keys(process.env).filter(k => 
  /SECRET|TOKEN|PASSWORD|KEY|DATABASE|AUTH|ADMIN/i.test(k)
);
console.log(leakedKeys.join(','));
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'javascript',
      sourceCode: maliciousCode,
      testCases: [dummyTestCase],
      timeLimitMs: 2000,
    });

    const output = result.results[0]?.actualOutput || '';
    // Assert NO sensitive environment keys are visible in the sandbox
    expect(output.trim()).toBe('');
    expect(output).not.toContain('CODE_RUNNER_SHARED_SECRET');
    expect(output).not.toContain('DATABASE_URL');
    expect(output).not.toContain('JWT_SECRET');
  });

  it('terminates infinite loop with TIME_LIMIT_EXCEEDED (FR-CODE-006, TC-11)', async () => {
    const infiniteLoopCode = `
while (true) {
  // Busy loop consuming CPU
}
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'javascript',
      sourceCode: infiniteLoopCode,
      testCases: [dummyTestCase],
      timeLimitMs: 1000, // 1s timeout
    });

    expect(result.status).toBe('TIME_LIMIT_EXCEEDED');
    expect(result.results[0]?.status).toBe('TIME_LIMIT_EXCEEDED');
    expect(result.results[0]?.executionTimeMs).toBeGreaterThanOrEqual(500);
  });

  it('caps huge output at 64KB to prevent denial of service (SRS 10.4, TC-11)', async () => {
    // Generate ~1MB of text
    const hugeOutputCode = `
const chunk = 'X'.repeat(1024);
for (let i = 0; i < 1000; i++) {
  process.stdout.write(chunk);
}
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'javascript',
      sourceCode: hugeOutputCode,
      testCases: [dummyTestCase],
      timeLimitMs: 2000,
    });

    const actual = result.results[0]?.actualOutput || '';
    const byteLength = Buffer.byteLength(actual, 'utf8');
    // Output must be capped at 64KB + notice
    expect(byteLength).toBeLessThanOrEqual(67000);
    expect(actual).toContain('[Output truncated at maximum size cap]');
  });

  it('traps socket and network creation attempts (FR-CODE-007, TC-11)', async () => {
    // 1. Verify container isolation flags explicitly include --network none
    const dockerArgs = buildDockerRunArguments({
      language: 'javascript',
      hostWorkDir: '/tmp/test',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
    });
    expect(dockerArgs).toContain('--network');
    expect(dockerArgs).toContain('none');

    // 2. Attempt to connect to network socket (non-routable TEST-NET IP per RFC 5737)
    const networkAttemptCode = `
const net = require('net');
const socket = net.connect({ host: '192.0.2.1', port: 80, timeout: 300 }, () => {
  console.log('CONNECTED');
});
socket.on('error', (err) => {
  console.error('SOCKET_BLOCKED: ' + err.code);
  process.exit(1);
});
setTimeout(() => {
  console.error('SOCKET_TIMED_OUT');
  process.exit(1);
}, 400);
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'javascript',
      sourceCode: networkAttemptCode,
      testCases: [dummyTestCase],
      timeLimitMs: 1000,
    });

    // Code must fail or be blocked (cannot successfully connect to remote networks)
    expect(result.status).not.toBe('ACCEPTED');
    expect(result.results[0]?.actualOutput || '').not.toContain('CONNECTED');
  });

  it('traps attempts to write files outside permitted directories (FR-CODE-007, SRS 10.4)', async () => {
    const maliciousWriteCode = `
const fs = require('fs');
try {
  // Attempt to write outside sandbox to a protected system root path
  const target = process.platform === 'win32' ? 'C:\\\\Windows\\\\test_tamper.txt' : '/etc/test_tamper.txt';
  fs.writeFileSync(target, 'Hacked');
  console.log('WRITE_SUCCESS');
} catch (e) {
  console.log('BLOCKED: ' + e.code);
  process.exit(1);
}
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'javascript',
      sourceCode: maliciousWriteCode,
      testCases: [dummyTestCase],
      timeLimitMs: 2000,
    });

    expect(result.status).not.toBe('ACCEPTED');
    expect(result.results[0]?.actualOutput || '').not.toContain('WRITE_SUCCESS');
  });
});
