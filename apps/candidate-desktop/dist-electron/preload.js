import { contextBridge as o } from 'electron';
o.exposeInMainWorld('electronAPI', {
  getAppVersion: () => '1.1.0',
  isKiosk: () => process.env.NODE_ENV === 'production',
  platform: process.platform,
});
