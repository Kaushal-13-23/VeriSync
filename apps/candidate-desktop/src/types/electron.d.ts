/// <reference types="vite/client" />
import type { VeriSyncBridge } from '../../electron/preload';

declare global {
  interface Window {
    verisyncBridge?: VeriSyncBridge;
    electronAPI?: {
      getAppVersion: () => string;
      isKiosk: () => boolean;
      platform: string;
    };
  }
}

export {};
