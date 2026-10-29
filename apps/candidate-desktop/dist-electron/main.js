import { app as o, BrowserWindow as E, ipcMain as c, safeStorage as p } from "electron";
import a from "node:path";
import n from "node:fs";
import S from "node:crypto";
import { exec as b } from "node:child_process";
let i = null, u = null;
function R() {
  try {
    const t = o.getPath("userData"), e = a.join(t, "device-identity.json");
    if (n.existsSync(e)) {
      const s = JSON.parse(n.readFileSync(e, "utf-8"));
      if (s && typeof s.deviceId == "string")
        return s.deviceId;
    }
    const r = S.randomUUID();
    return n.mkdirSync(t, { recursive: !0 }), n.writeFileSync(
      e,
      JSON.stringify({ deviceId: r, createdAt: (/* @__PURE__ */ new Date()).toISOString() }),
      "utf-8"
    ), r;
  } catch {
    return "dev-fallback-" + S.randomUUID().slice(0, 8);
  }
}
function A(t) {
  try {
    u = t;
    const e = o.getPath("userData"), r = a.join(e, "session-token.enc");
    if (p && p.isEncryptionAvailable()) {
      const s = p.encryptString(t);
      return n.writeFileSync(r, s), !0;
    } else {
      const s = Buffer.from(t).toString("base64");
      return n.writeFileSync(r, s, "utf-8"), !0;
    }
  } catch {
    return !1;
  }
}
function L() {
  try {
    if (u) return u;
    const t = o.getPath("userData"), e = a.join(t, "session-token.enc");
    if (!n.existsSync(e)) return null;
    const r = n.readFileSync(e);
    return p && p.isEncryptionAvailable() ? u = p.decryptString(r) : u = Buffer.from(r.toString("utf-8"), "base64").toString("utf-8"), u;
  } catch {
    return null;
  }
}
function P() {
  try {
    u = null;
    const t = o.getPath("userData"), e = a.join(t, "session-token.enc");
    return n.existsSync(e) && n.unlinkSync(e), !0;
  } catch {
    return !1;
  }
}
async function x() {
  const t = [
    "teamviewer.exe",
    "teamviewer",
    "anydesk.exe",
    "anydesk",
    "vncviewer.exe",
    "vncserver.exe",
    "obs64.exe",
    "obs32.exe"
  ];
  return new Promise((e) => {
    const r = process.platform === "win32" ? "tasklist /FO CSV /NH" : "ps -e -o comm=";
    b(r, { timeout: 3e3 }, (s, y) => {
      if (s || !y) {
        e({ hasProhibitedApps: !1, apps: [] });
        return;
      }
      const l = y.toLowerCase(), d = t.filter((h) => l.includes(h));
      e({ hasProhibitedApps: d.length > 0, apps: d });
    });
  });
}
const T = 2 * 1024 * 1024, m = 3;
function w(t) {
  return t.replace(/(password|token|secret|key|authorization|bearer)\s*[:=]\s*["']?[^"',\s]+["']?/gi, "$1=[REDACTED]").replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]").replace(/[A-Za-z0-9]{32,}/g, (e) => e.slice(0, 4) + "...[REDACTED]");
}
function V(t, e, r, s) {
  try {
    const y = o.getPath("userData"), l = a.join(y, "logs");
    n.existsSync(l) || n.mkdirSync(l, { recursive: !0 });
    const d = a.join(l, "candidate-desktop.log");
    if (n.existsSync(d) && n.statSync(d).size >= T) {
      for (let f = m - 1; f >= 1; f--) {
        const g = a.join(l, `candidate-desktop.${f}.log`), _ = a.join(l, `candidate-desktop.${f + 1}.log`);
        n.existsSync(g) && (f === m - 1 ? n.unlinkSync(g) : n.renameSync(g, _));
      }
      n.renameSync(d, a.join(l, "candidate-desktop.1.log"));
    }
    const h = (/* @__PURE__ */ new Date()).toISOString(), k = w(e), v = s ? w(JSON.stringify(s)) : void 0, I = JSON.stringify({
      timestamp: h,
      level: t,
      message: k,
      correlationId: r || null,
      metadata: v ? JSON.parse(v) : void 0
    }) + `
`;
    return n.appendFileSync(d, I, "utf-8"), !0;
  } catch {
    return !1;
  }
}
function j() {
  c.handle("verisync:getAppVersion", () => "1.1.0"), c.handle("verisync:getDeviceId", () => R()), c.handle("verisync:isKiosk", () => process.env.NODE_ENV === "production"), c.handle("verisync:storeToken", (t, e) => A(e)), c.handle("verisync:getToken", () => L()), c.handle("verisync:clearToken", () => P()), c.handle("verisync:checkProhibitedApps", () => x()), c.handle("verisync:getSystemInfo", () => ({
    platform: process.platform,
    arch: process.arch,
    isWindows: process.platform === "win32"
  })), c.handle(
    "verisync:writeLog",
    (t, e) => V(e.level, e.message, e.correlationId, e.metadata)
  ), c.handle("verisync:closeApp", () => {
    o.quit();
  });
}
function D() {
  i = new E({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 768,
    show: !1,
    title: "VeriSync Candidate Client",
    webPreferences: {
      preload: a.join(__dirname, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      webSecurity: !0,
      allowRunningInsecureContent: !1
    }
  }), i.webContents.setWindowOpenHandler(() => ({ action: "deny" })), i.webContents.on("will-navigate", (t, e) => {
    try {
      const r = new URL(e);
      if (process.env.VITE_DEV_SERVER_URL) {
        const s = new URL(process.env.VITE_DEV_SERVER_URL);
        r.origin !== s.origin && t.preventDefault();
      } else r.protocol !== "file:" && t.preventDefault();
    } catch {
      t.preventDefault();
    }
  }), process.env.VITE_DEV_SERVER_URL ? i.loadURL(process.env.VITE_DEV_SERVER_URL) : i.loadFile(a.join(__dirname, "../dist/index.html")), i.once("ready-to-show", () => {
    i == null || i.show();
  }), i.on("closed", () => {
    i = null;
  });
}
const F = o.requestSingleInstanceLock();
F ? (o.on("second-instance", () => {
  i && (i.isMinimized() && i.restore(), i.focus());
}), o.whenReady().then(() => {
  j(), D();
}), o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
}), o.on("activate", () => {
  E.getAllWindows().length === 0 && D();
})) : o.quit();
