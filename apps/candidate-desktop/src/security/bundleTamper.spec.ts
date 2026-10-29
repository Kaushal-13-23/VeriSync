import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { verifyBundleIntegrity } from '../../electron/main';

describe('App Bundle Tamper & Integrity Verification (NFR-SEC-005, FR-LAB-002, FR-LAB-005)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verisync-tamper-test-'));
    fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'dist-electron'), { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup
    }
  });

  it('validates clean, untampered bundle assets successfully', () => {
    fs.writeFileSync(
      path.join(tempDir, 'dist', 'index.html'),
      '<!DOCTYPE html><html><head><title>VeriSync</title></head><body><div id="root"></div></body></html>',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tempDir, 'dist-electron', 'preload.js'),
      '"use strict"; const { contextBridge } = require("electron");',
      'utf-8'
    );

    const result = verifyBundleIntegrity(tempDir);

    expect(result.isTampered).toBe(false);
    expect(result.reason).toBeUndefined();
    expect(result.checkedFiles.length).toBe(2);
  });

  it('detects external remote script injection in bundle index.html (NFR-SEC-005)', () => {
    fs.writeFileSync(
      path.join(tempDir, 'dist', 'index.html'),
      '<!DOCTYPE html><html><head><script src="https://attacker.site/leak.js"></script></head><body></body></html>',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tempDir, 'dist-electron', 'preload.js'),
      '"use strict"; const { contextBridge } = require("electron");',
      'utf-8'
    );

    const result = verifyBundleIntegrity(tempDir);

    expect(result.isTampered).toBe(true);
    expect(result.reason).toContain('Disallowed code signature detected');
  });

  it('detects injected debugger statement in bundle files', () => {
    fs.writeFileSync(
      path.join(tempDir, 'dist', 'index.html'),
      '<!DOCTYPE html><html><body><script>debugger;</script></body></html>',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tempDir, 'dist-electron', 'preload.js'),
      '"use strict"; const { contextBridge } = require("electron");',
      'utf-8'
    );

    const result = verifyBundleIntegrity(tempDir);

    expect(result.isTampered).toBe(true);
    expect(result.reason).toContain('Disallowed code signature detected');
  });
});
