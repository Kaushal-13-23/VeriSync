/**
 * Functional Code Evaluation Tests
 * Traceability: FR-CODE-001..011, TC-10, UC-11
 */

import { describe, it, expect } from 'vitest';
import { ProcessSandboxRunner } from '../src/runners/process-runner.js';
import { TestCase } from '../src/types.js';

describe('Code Evaluation Engine (FR-CODE-001..011, UC-11)', () => {
  const sampleTestCase: TestCase = {
    id: 'tc-sample-1',
    inputData: '3 5\n',
    expectedOutput: '8',
    visibility: 'SAMPLE',
    marks: 5,
  };

  const hiddenTestCase: TestCase = {
    id: 'tc-hidden-1',
    inputData: '100 250\n',
    expectedOutput: '350',
    visibility: 'HIDDEN',
    marks: 10,
  };

  it('evaluates passing Python solution with weighted marks (FR-CODE-001, FR-CODE-011)', async () => {
    const pythonCode = `
import sys
input_data = sys.stdin.read().split()
if input_data:
    a, b = int(input_data[0]), int(input_data[1])
    print(a + b)
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'python',
      sourceCode: pythonCode,
      testCases: [sampleTestCase, hiddenTestCase],
      timeLimitMs: 2000,
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.testCasesPassed).toBe(2);
    expect(result.totalScore).toBe(15);
    expect(result.maxScore).toBe(15);
  });

  it('strictly conceals hidden test case inputs and outputs per TC-10 and FR-CODE-009', async () => {
    const failingCode = `
import sys
print("42")
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'python',
      sourceCode: failingCode,
      testCases: [sampleTestCase, hiddenTestCase],
      timeLimitMs: 2000,
    });

    expect(result.status).toBe('WRONG_ANSWER');

    // 1. Sample case reveals actual output
    const sampleResult = result.results.find((r) => r.visibility === 'SAMPLE');
    expect(sampleResult).toBeDefined();
    expect(sampleResult?.actualOutput).toContain('42');

    // 2. Hidden case MUST NEVER reveal actualOutput or expected output!
    const hiddenResult = result.results.find((r) => r.visibility === 'HIDDEN');
    expect(hiddenResult).toBeDefined();
    expect(hiddenResult?.actualOutput).toBeUndefined();
    expect(hiddenResult?.status).toBe('WRONG_ANSWER');
  });

  it('classifies unhandled exceptions as RUNTIME_ERROR (FR-CODE-008)', async () => {
    const errorJsCode = `
throw new Error('Candidate algorithmic crash');
`;

    const result = await ProcessSandboxRunner.execute({
      language: 'javascript',
      sourceCode: errorJsCode,
      testCases: [sampleTestCase],
      timeLimitMs: 2000,
    });

    expect(result.status).toBe('RUNTIME_ERROR');
    expect(result.results[0]?.status).toBe('RUNTIME_ERROR');
    expect(result.results[0]?.errorMessage).toContain('Candidate algorithmic crash');
  });
});
