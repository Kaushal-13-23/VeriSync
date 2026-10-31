import { contextBridge as o, ipcRenderer as e } from 'electron';
const n = {
  getAppVersion: () => e.invoke('verisync:getAppVersion'),
  getDeviceId: () => e.invoke('verisync:getDeviceId'),
  isKiosk: () => e.invoke('verisync:isKiosk'),
  storeToken: (i) => e.invoke('verisync:storeToken', i),
  getToken: () => e.invoke('verisync:getToken'),
  clearToken: () => e.invoke('verisync:clearToken'),
  checkProhibitedApps: () => e.invoke('verisync:checkProhibitedApps'),
  getSystemInfo: () => e.invoke('verisync:getSystemInfo'),
  closeApp: () => e.invoke('verisync:closeApp'),
};
o.exposeInMainWorld('verisyncBridge', n);
o.exposeInMainWorld('electronAPI', {
  getAppVersion: () => '1.1.0',
  isKiosk: () => process.env.NODE_ENV === 'production',
  platform: process.platform,
});
