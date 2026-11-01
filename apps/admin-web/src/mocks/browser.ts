/**
 * MSW Browser Worker Setup
 * Activates API mocks when backend is offline or VITE_USE_MOCKS=true.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function initMocks() {
  // If explicitly pointed to real API, don't register mock worker
  if (import.meta.env.VITE_USE_MOCKS === 'false') {
    return;
  }

  // Register worker in development or test mode
  try {
    await worker.start({
      onUnhandledFrame: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    // eslint-disable-next-line no-console
    console.info('[VeriSync] MSW Mock Service Worker activated for /api/v1');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[VeriSync] Could not initialize Service Worker, falling back to network', err);
  }
}
