/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Secret & Credential Leakage Scanner Test
 * SRS Requirements:
 * - NFR-SEC-005: Application bundle integrity and secret-free client builds
 * - Non-Negotiable Rule 5: No secrets, passwords, or tokens in code, logs, or audit metadata
 */

describe('Security Gate: Zero Secrets in Candidate Desktop Bundle (NFR-SEC-005, Rule 5)', () => {
  const srcDir = path.resolve(__dirname, '..');

  function getAllFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'dist-electron') {
          files.push(...getAllFiles(fullPath));
        }
      } else if (/\.(ts|tsx|js|html|json)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const suspiciousPatterns = [
    { pattern: /postgres(ql)?:\/\/[^\s"']+/i, name: 'Database connection string' },
    { pattern: /-----BEGIN\s+PRIVATE\s+KEY-----/, name: 'Private cryptographic key' },
    { pattern: /aws_secret_access_key/i, name: 'AWS secret key' },
    { pattern: /(jwt_secret|app_secret|api_secret)\s*[:=]\s*["'][^"']+["']/i, name: 'Hardcoded secret' },
    { pattern: /password\s*[:=]\s*["'](?!Enter|••••)[a-zA-Z0-9!@#$%^&*]{10,}["']/i, name: 'Hardcoded plaintext password' },
  ];

  it('NFR-SEC-005: ensures no database credentials, private keys, or passwords in source code', () => {
    const files = getAllFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; pattern: string }> = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const { pattern, name } of suspiciousPatterns) {
        if (pattern.test(content)) {
          violations.push({ file: path.relative(srcDir, file), pattern: name });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
