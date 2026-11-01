/**
 * Docker Container Sandbox Flags Generator
 * Enforces rigid isolation per SRS 10.4, FR-CODE-007, and NFR-SEC-008:
 * - Unprivileged user: 10001:10001
 * - Read-only root filesystem
 * - Small tmpfs workdir: 64MB
 * - Disconnected network: --network none
 * - Cgroup CPU/Memory/PIDs limits
 * - No-new-privileges and capability dropping
 * - Cloud metadata protection
 */

import { SupportedLanguage } from '../types.js';
import { config } from '../config.js';

export interface DockerSandboxOptions {
  language: SupportedLanguage;
  hostWorkDir: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export function buildDockerRunArguments(options: DockerSandboxOptions): string[] {
  const imageName = config.dockerImages[options.language];
  const memoryMb = Math.min(options.memoryLimitMb, config.maxMemoryLimitMb);

  return [
    'run',
    '--rm',
    // 1. Unprivileged non-root user (SRS 10.4)
    '--user',
    '10001:10001',

    // 2. Read-only root filesystem (FR-CODE-007)
    '--read-only',

    // 3. Ephemeral tmpfs mount with strict options
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,size=64m',

    // 4. Absolute network isolation (blocks internet and cloud metadata 169.254.169.254)
    '--network',
    'none',

    // 5. Cgroup resource caps
    '--cpus',
    '1.0',
    '--memory',
    `${memoryMb}m`,
    '--memory-swap',
    `${memoryMb}m`,
    '--pids-limit',
    `${config.pidsLimit}`,

    // 6. Security profile hardening
    '--security-opt',
    'no-new-privileges:true',
    '--cap-drop',
    'ALL',

    // 7. Mount workdir
    '-v',
    `${options.hostWorkDir}:/workspace:ro`,
    '-w',
    '/workspace',

    // Image
    imageName,
  ];
}
