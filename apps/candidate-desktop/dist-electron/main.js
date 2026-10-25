import { app as o, BrowserWindow as t } from 'electron';
import n from 'node:path';
let e = null;
function i() {
  ((e = new t({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: !1,
    title: 'VeriSync Candidate Client',
    webPreferences: {
      preload: n.join(__dirname, 'preload.js'),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
    },
  })),
    process.env.VITE_DEV_SERVER_URL
      ? e.loadURL(process.env.VITE_DEV_SERVER_URL)
      : e.loadFile(n.join(__dirname, '../dist/index.html')),
    e.once('ready-to-show', () => {
      e == null || e.show();
    }),
    e.on('closed', () => {
      e = null;
    }));
}
const s = o.requestSingleInstanceLock();
s
  ? (o.on('second-instance', () => {
      e && (e.isMinimized() && e.restore(), e.focus());
    }),
    o.whenReady().then(i),
    o.on('window-all-closed', () => {
      process.platform !== 'darwin' && o.quit();
    }),
    o.on('activate', () => {
      t.getAllWindows().length === 0 && i();
    }))
  : o.quit();
