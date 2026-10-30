/**
 * Code and Output Sanitization Utilities
 * Traceability: FR-CODE-009, SRS 10.4
 */

import { config } from '../config.js';

export class InputSanitizer {
  /**
   * Validates submitted source code does not exceed max size (64KB).
   */
  static validateSourceCode(sourceCode: string): void {
    if (!sourceCode || typeof sourceCode !== 'string') {
      throw new Error('Source code must be a non-empty string.');
    }
    const byteLength = Buffer.byteLength(sourceCode, 'utf8');
    if (byteLength > config.maxSourceSizeBytes) {
      throw new Error(
        `Source code size (${byteLength} bytes) exceeds maximum permitted limit (${config.maxSourceSizeBytes} bytes).`,
      );
    }
  }

  /**
   * Truncates output strings exceeding maximum allowed size.
   */
  static truncateOutput(output: string, maxBytes: number = config.maxOutputSizeBytes): string {
    if (!output) return '';
    const buffer = Buffer.from(output, 'utf8');
    if (buffer.length <= maxBytes) {
      return output;
    }
    return (
      buffer.subarray(0, maxBytes).toString('utf8') + '\n[Output truncated at maximum size cap]'
    );
  }

  /**
   * Sanitizes diagnostic / compiler / runtime errors to prevent leakage
   * of internal file paths, usernames, or server directory structure (FR-CODE-009).
   */
  static sanitizeErrorMessage(message: string, workDir?: string): string {
    if (!message) return '';
    let sanitized = message;

    if (workDir) {
      // Replace workDir with generic /workspace
      const escaped = workDir.replace(/\\/g, '/');
      sanitized = sanitized.replace(new RegExp(escaped, 'gi'), '/workspace');
      sanitized = sanitized.replace(new RegExp(workDir.replace(/\\/g, '\\\\'), 'gi'), '/workspace');
    }

    // Scrub Windows C:\Users\... or Linux /home/... paths
    sanitized = sanitized.replace(/[a-zA-Z]:\\[^:\n]+/g, '/workspace/solution');
    sanitized = sanitized.replace(/\/home\/[^:\n]+/g, '/workspace/solution');

    return sanitized;
  }
}
