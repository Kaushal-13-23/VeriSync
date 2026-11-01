/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

const isVitest = !!process.env.VITEST;

export default defineConfig({
  resolve: {
    alias: {
      '@verisync/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  plugins: [
    react(),
    ...(!isVitest
      ? [
          electron([
            {
              entry: 'electron/main.ts',
            },
            {
              entry: 'electron/preload.ts',
              onstart(options) {
                options.reload();
              },
            },
          ]),
          renderer(),
        ]
      : []),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
