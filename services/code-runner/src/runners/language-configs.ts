/**
 * Language Configuration Definitions
 * Traceability: FR-CODE-001, FR-CODE-006, SRS 10.4
 */

import { SupportedLanguage } from '../types.js';

export interface LanguageDefinition {
  language: SupportedLanguage;
  sourceFileName: string;
  isCompiled: boolean;
  getCompileCommand?: (workDir: string) => { command: string; args: string[] };
  getRunCommand: (workDir: string) => { command: string; args: string[] };
}

export const LANGUAGE_DEFINITIONS: Record<SupportedLanguage, LanguageDefinition> = {
  c: {
    language: 'c',
    sourceFileName: 'solution.c',
    isCompiled: true,
    getCompileCommand: (workDir) => ({
      command: 'gcc',
      args: ['-O2', '-Wall', '-std=c17', `${workDir}/solution.c`, '-o', `${workDir}/solution`],
    }),
    getRunCommand: (workDir) => ({
      command: process.platform === 'win32' ? `${workDir}/solution.exe` : `${workDir}/solution`,
      args: [],
    }),
  },
  cpp: {
    language: 'cpp',
    sourceFileName: 'solution.cpp',
    isCompiled: true,
    getCompileCommand: (workDir) => ({
      command: 'g++',
      args: ['-O2', '-Wall', '-std=c++20', `${workDir}/solution.cpp`, '-o', `${workDir}/solution`],
    }),
    getRunCommand: (workDir) => ({
      command: process.platform === 'win32' ? `${workDir}/solution.exe` : `${workDir}/solution`,
      args: [],
    }),
  },
  java: {
    language: 'java',
    sourceFileName: 'Solution.java',
    isCompiled: true,
    getCompileCommand: (workDir) => ({
      command: 'javac',
      args: ['-d', workDir, `${workDir}/Solution.java`],
    }),
    getRunCommand: (workDir) => ({
      command: 'java',
      args: ['-Xmx256m', '-cp', workDir, 'Solution'],
    }),
  },
  python: {
    language: 'python',
    sourceFileName: 'solution.py',
    isCompiled: false,
    getRunCommand: (workDir) => ({
      command: process.platform === 'win32' ? 'python' : 'python3',
      args: [`${workDir}/solution.py`],
    }),
  },
  javascript: {
    language: 'javascript',
    sourceFileName: 'solution.js',
    isCompiled: false,
    getRunCommand: (workDir) => ({
      command: 'node',
      args: ['--max-old-space-size=256', `${workDir}/solution.js`],
    }),
  },
};
