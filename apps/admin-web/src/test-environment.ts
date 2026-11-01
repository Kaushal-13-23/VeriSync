import type { Environment } from 'vitest';
import { builtinEnvironments } from 'vitest/environments';

export default <Environment>{
  name: 'custom-jsdom',
  transformMode: 'web',
  async setup(global, options) {
    // Preserve Node.js native globals (Node 22/24 undici + MSW compatibility)
    const nativeAbortController = global.AbortController;
    const nativeAbortSignal = global.AbortSignal;
    const nativeRequest = global.Request;
    const nativeResponse = global.Response;
    const nativeFetch = global.fetch;

    const { teardown } = await builtinEnvironments.jsdom.setup(global, options);

    // Restore native web standards to globalThis and window
    global.AbortController = nativeAbortController;
    global.AbortSignal = nativeAbortSignal;
    if (nativeRequest) global.Request = nativeRequest;
    if (nativeResponse) global.Response = nativeResponse;
    if (nativeFetch) global.fetch = nativeFetch;

    return {
      teardown(global) {
        return teardown(global);
      },
    };
  },
};
