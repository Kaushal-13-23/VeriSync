import { app as i, BrowserWindow as y, ipcMain as c, safeStorage as l } from 'electron';
import d from 'node:path';
import s from 'node:fs';
import p from 'node:crypto';
import { exec as m } from 'node:child_process';
let t = null,
  a = null;
function g() {
  try {
    const n = i.getPath('userData'),
      e = d.join(n, 'device-identity.json');
    if (s.existsSync(e)) {
      const o = JSON.parse(s.readFileSync(e, 'utf-8'));
      if (o && typeof o.deviceId == 'string') return o.deviceId;
    }
    const r = p.randomUUID();
    return (
      s.mkdirSync(n, { recursive: !0 }),
      s.writeFileSync(
        e,
        JSON.stringify({ deviceId: r, createdAt: /* @__PURE__ */ new Date().toISOString() }),
        'utf-8',
      ),
      r
    );
  } catch {
    return 'dev-fallback-' + p.randomUUID().slice(0, 8);
  }
}
function S(n) {
  try {
    a = n;
    const e = i.getPath('userData'),
      r = d.join(e, 'session-token.enc');
    if (l && l.isEncryptionAvailable()) {
      const o = l.encryptString(n);
      return (s.writeFileSync(r, o), !0);
    } else {
      const o = Buffer.from(n).toString('base64');
      return (s.writeFileSync(r, o, 'utf-8'), !0);
    }
  } catch {
    return !1;
  }
}
function E() {
  try {
    if (a) return a;
    const n = i.getPath('userData'),
      e = d.join(n, 'session-token.enc');
    if (!s.existsSync(e)) return null;
    const r = s.readFileSync(e);
    return (
      l && l.isEncryptionAvailable()
        ? (a = l.decryptString(r))
        : (a = Buffer.from(r.toString('utf-8'), 'base64').toString('utf-8')),
      a
    );
  } catch {
    return null;
  }
}
function k() {
  try {
    a = null;
    const n = i.getPath('userData'),
      e = d.join(n, 'session-token.enc');
    return (s.existsSync(e) && s.unlinkSync(e), !0);
  } catch {
    return !1;
  }
}
async function D() {
  const n = [
    'teamviewer.exe',
    'teamviewer',
    'anydesk.exe',
    'anydesk',
    'vncviewer.exe',
    'vncserver.exe',
    'obs64.exe',
    'obs32.exe',
  ];
  return new Promise((e) => {
    const r = process.platform === 'win32' ? 'tasklist /FO CSV /NH' : 'ps -e -o comm=';
    m(r, { timeout: 3e3 }, (o, u) => {
      if (o || !u) {
        e({ hasProhibitedApps: !1, apps: [] });
        return;
      }
      const v = u.toLowerCase(),
        f = n.filter((w) => v.includes(w));
      e({ hasProhibitedApps: f.length > 0, apps: f });
    });
  });
}
function I() {
  (c.handle('verisync:getAppVersion', () => '1.1.0'),
    c.handle('verisync:getDeviceId', () => g()),
    c.handle('verisync:isKiosk', () => process.env.NODE_ENV === 'production'),
    c.handle('verisync:storeToken', (n, e) => S(e)),
    c.handle('verisync:getToken', () => E()),
    c.handle('verisync:clearToken', () => k()),
    c.handle('verisync:checkProhibitedApps', () => D()),
    c.handle('verisync:getSystemInfo', () => ({
      platform: process.platform,
      arch: process.arch,
      isWindows: process.platform === 'win32',
    })),
    c.handle('verisync:closeApp', () => {
      i.quit();
    }));
}
function h() {
  ((t = new y({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 768,
    show: !1,
    title: 'VeriSync Candidate Client',
    webPreferences: {
      preload: d.join(__dirname, 'preload.js'),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      webSecurity: !0,
      allowRunningInsecureContent: !1,
    },
  })),
    t.webContents.setWindowOpenHandler(() => ({ action: 'deny' })),
    t.webContents.on('will-navigate', (n, e) => {
      try {
        const r = new URL(e);
        if (process.env.VITE_DEV_SERVER_URL) {
          const o = new URL(process.env.VITE_DEV_SERVER_URL);
          r.origin !== o.origin && n.preventDefault();
        } else r.protocol !== 'file:' && n.preventDefault();
      } catch {
        n.preventDefault();
      }
    }),
    process.env.VITE_DEV_SERVER_URL
      ? t.loadURL(process.env.VITE_DEV_SERVER_URL)
      : t.loadFile(d.join(__dirname, '../dist/index.html')),
    t.once('ready-to-show', () => {
      t == null || t.show();
    }),
    t.on('closed', () => {
      t = null;
    }));
}
const _ = i.requestSingleInstanceLock();
_
  ? (i.on('second-instance', () => {
      t && (t.isMinimized() && t.restore(), t.focus());
    }),
    i.whenReady().then(() => {
      (I(), h());
    }),
    i.on('window-all-closed', () => {
      process.platform !== 'darwin' && i.quit();
    }),
    i.on('activate', () => {
      y.getAllWindows().length === 0 && h();
    }))
  : i.quit();
