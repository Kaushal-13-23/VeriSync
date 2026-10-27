import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Synchronize JSDOM globals with Node's native undici globals (Node 22/24 + MSW fix)
if (typeof window !== 'undefined') {
  window.AbortController = globalThis.AbortController;
  window.AbortSignal = globalThis.AbortSignal;
  window.Request = globalThis.Request;
  window.Response = globalThis.Response;
  window.fetch = globalThis.fetch;
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
