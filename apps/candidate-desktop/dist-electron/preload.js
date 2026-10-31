import { contextBridge as i, ipcRenderer as e } from 'electron';
const n = {
  getAppVersion: () => e.invoke('verisync:getAppVersion'),
  getDeviceId: () => e.invoke('verisync:getDeviceId'),
  isKiosk: () => e.invoke('verisync:isKiosk'),
  storeToken: (o) => e.invoke('verisync:storeToken', o),
  getToken: () => e.invoke('verisync:getToken'),
  clearToken: () => e.invoke('verisync:clearToken'),
  checkProhibitedApps: () => e.invoke('verisync:checkProhibitedApps'),
  getSystemInfo: () => e.invoke('verisync:getSystemInfo'),
  writeLog: (o) => e.invoke('verisync:writeLog', o),
  closeApp: () => e.invoke('verisync:closeApp'),
};
i.exposeInMainWorld('verisyncBridge', n);
i.exposeInMainWorld('electronAPI', {
  getAppVersion: () => '1.1.0',
  isKiosk: () => process.env.NODE_ENV === 'production',
  platform: process.platform,
});
