import { contextBridge as r, ipcRenderer as e } from "electron";
const t = {
  getAppVersion: () => e.invoke("verisync:getAppVersion"),
  getDeviceId: () => e.invoke("verisync:getDeviceId"),
  isKiosk: () => e.invoke("verisync:isKiosk"),
  storeToken: (n) => e.invoke("verisync:storeToken", n),
  getToken: () => e.invoke("verisync:getToken"),
  clearToken: () => e.invoke("verisync:clearToken"),
  checkProhibitedApps: (n) => e.invoke("verisync:checkProhibitedApps", n),
  getSystemInfo: () => e.invoke("verisync:getSystemInfo"),
  writeLog: (n) => e.invoke("verisync:writeLog", n),
  verifyIntegrity: () => e.invoke("verisync:verifyIntegrity"),
  closeApp: () => e.invoke("verisync:closeApp"),
  // Phase 6 Lockdown Implementations
  setExamActive: (n) => e.invoke("verisync:setExamActive", n),
  isExamActive: () => e.invoke("verisync:isExamActive"),
  onWindowBlur: (n) => {
    const i = () => n();
    return e.on("verisync:onWindowBlur", i), () => {
      e.removeListener("verisync:onWindowBlur", i);
    };
  },
  onWindowMinimize: (n) => {
    const i = () => n();
    return e.on("verisync:onWindowMinimize", i), () => {
      e.removeListener("verisync:onWindowMinimize", i);
    };
  },
  onExitAttempted: (n) => {
    const i = () => n();
    return e.on("verisync:onExitAttempted", i), () => {
      e.removeListener("verisync:onExitAttempted", i);
    };
  },
  onSecurityAlert: (n) => {
    const i = (s, o) => n(o);
    return e.on("verisync:onSecurityAlert", i), () => {
      e.removeListener("verisync:onSecurityAlert", i);
    };
  }
};
r.exposeInMainWorld("verisyncBridge", t);
r.exposeInMainWorld("electronAPI", {
  getAppVersion: () => "1.1.0",
  isKiosk: () => process.env.NODE_ENV === "production",
  platform: process.platform
});
