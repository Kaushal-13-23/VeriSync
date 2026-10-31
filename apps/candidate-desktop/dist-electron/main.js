import { app as s, BrowserWindow as k, ipcMain as d, safeStorage as f } from "electron";
import c from "node:path";
import r from "node:fs";
import S from "node:crypto";
import { exec as T } from "node:child_process";
let o = null, p = null;
function L() {
  try {
    const t = s.getPath("userData"), e = c.join(t, "device-identity.json");
    if (r.existsSync(e)) {
      const i = JSON.parse(r.readFileSync(e, "utf-8"));
      if (i && typeof i.deviceId == "string")
        return i.deviceId;
    }
    const n = S.randomUUID();
    return r.mkdirSync(t, { recursive: !0 }), r.writeFileSync(
      e,
      JSON.stringify({ deviceId: n, createdAt: (/* @__PURE__ */ new Date()).toISOString() }),
      "utf-8"
    ), n;
  } catch {
    return "dev-fallback-" + S.randomUUID().slice(0, 8);
  }
}
function V(t) {
  try {
    p = t;
    const e = s.getPath("userData"), n = c.join(e, "session-token.enc");
    if (f && f.isEncryptionAvailable()) {
      const i = f.encryptString(t);
      return r.writeFileSync(n, i), !0;
    } else {
      const i = Buffer.from(t).toString("base64");
      return r.writeFileSync(n, i, "utf-8"), !0;
    }
  } catch {
    return !1;
  }
}
function P() {
  try {
    if (p) return p;
    const t = s.getPath("userData"), e = c.join(t, "session-token.enc");
    if (!r.existsSync(e)) return null;
    const n = r.readFileSync(e);
    return f && f.isEncryptionAvailable() ? p = f.decryptString(n) : p = Buffer.from(n.toString("utf-8"), "base64").toString("utf-8"), p;
  } catch {
    return null;
  }
}
function x() {
  try {
    p = null;
    const t = s.getPath("userData"), e = c.join(t, "session-token.enc");
    return r.existsSync(e) && r.unlinkSync(e), !0;
  } catch {
    return !1;
  }
}
async function A() {
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
    const n = process.platform === "win32" ? "tasklist /FO CSV /NH" : "ps -e -o comm=";
    T(n, { timeout: 3e3 }, (i, u) => {
      if (i || !u) {
        e({ hasProhibitedApps: !1, apps: [] });
        return;
      }
      const a = u.toLowerCase(), l = t.filter((y) => a.includes(y));
      e({ hasProhibitedApps: l.length > 0, apps: l });
    });
  });
}
const j = 2 * 1024 * 1024, E = 3;
function w(t) {
  return t.replace(/(password|token|secret|key|authorization|bearer)\s*[:=]\s*["']?[^"',\s]+["']?/gi, "$1=[REDACTED]").replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]").replace(/[A-Za-z0-9]{32,}/g, (e) => e.slice(0, 4) + "...[REDACTED]");
}
function _(t, e, n, i) {
  try {
    const u = s.getPath("userData"), a = c.join(u, "logs");
    r.existsSync(a) || r.mkdirSync(a, { recursive: !0 });
    const l = c.join(a, "candidate-desktop.log");
    if (r.existsSync(l) && r.statSync(l).size >= j) {
      for (let g = E - 1; g >= 1; g--) {
        const v = c.join(a, `candidate-desktop.${g}.log`), b = c.join(a, `candidate-desktop.${g + 1}.log`);
        r.existsSync(v) && (g === E - 1 ? r.unlinkSync(v) : r.renameSync(v, b));
      }
      r.renameSync(l, c.join(a, "candidate-desktop.1.log"));
    }
    const y = (/* @__PURE__ */ new Date()).toISOString(), h = w(e), m = i ? w(JSON.stringify(i)) : void 0, R = JSON.stringify({
      timestamp: y,
      level: t,
      message: h,
      correlationId: n || null,
      metadata: m ? JSON.parse(m) : void 0
    }) + `
`;
    return r.appendFileSync(l, R, "utf-8"), !0;
  } catch {
    return !1;
  }
}
function I(t) {
  const e = t || c.join(__dirname, ".."), n = [], i = [
    c.join("dist-electron", "preload.js"),
    c.join("dist", "index.html")
  ];
  for (const u of i) {
    const a = c.join(e, u);
    if (!r.existsSync(a)) {
      if (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === "test")
        continue;
      return {
        isTampered: !0,
        reason: `Critical application asset missing: ${u}`,
        checkedFiles: n
      };
    }
    n.push(u);
    try {
      const l = r.readFileSync(a, "utf-8"), y = [
        /<script[^>]*src=["']https?:\/\//i,
        /\bdebugger\b/i
      ];
      for (const h of y)
        if (h.test(l))
          return {
            isTampered: !0,
            reason: `Disallowed code signature detected in ${u}`,
            checkedFiles: n
          };
    } catch (l) {
      return {
        isTampered: !0,
        reason: `Failed to inspect asset ${u}: ${l.message}`,
        checkedFiles: n
      };
    }
  }
  return {
    isTampered: !1,
    checkedFiles: n
  };
}
function F() {
  d.handle("verisync:getAppVersion", () => "1.1.0"), d.handle("verisync:getDeviceId", () => L()), d.handle("verisync:isKiosk", () => process.env.NODE_ENV === "production"), d.handle("verisync:storeToken", (t, e) => V(e)), d.handle("verisync:getToken", () => P()), d.handle("verisync:clearToken", () => x()), d.handle("verisync:checkProhibitedApps", () => A()), d.handle("verisync:getSystemInfo", () => ({
    platform: process.platform,
    arch: process.arch,
    isWindows: process.platform === "win32"
  })), d.handle(
    "verisync:writeLog",
    (t, e) => _(e.level, e.message, e.correlationId, e.metadata)
  ), d.handle("verisync:verifyIntegrity", () => I()), d.handle("verisync:closeApp", () => {
    s.quit();
  });
}
function D() {
  o = new k({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 768,
    show: !1,
    title: "VeriSync Candidate Client",
    webPreferences: {
      preload: c.join(__dirname, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      webSecurity: !0,
      allowRunningInsecureContent: !1
    }
  }), o.webContents.setWindowOpenHandler(() => ({ action: "deny" })), o.webContents.on("will-navigate", (t, e) => {
    try {
      const n = new URL(e);
      if (process.env.VITE_DEV_SERVER_URL) {
        const i = new URL(process.env.VITE_DEV_SERVER_URL);
        n.origin !== i.origin && t.preventDefault();
      } else n.protocol !== "file:" && t.preventDefault();
    } catch {
      t.preventDefault();
    }
  }), process.env.VITE_DEV_SERVER_URL ? o.loadURL(process.env.VITE_DEV_SERVER_URL) : o.loadFile(c.join(__dirname, "../dist/index.html")), o.once("ready-to-show", () => {
    o == null || o.show();
  }), o.on("closed", () => {
    o = null;
  });
}
s && typeof s.requestSingleInstanceLock == "function" && (s.requestSingleInstanceLock() ? (s.on("second-instance", () => {
  o && (o.isMinimized() && o.restore(), o.focus());
}), s.whenReady().then(() => {
  const e = I();
  if (e.isTampered && (_("error", `SECURITY ALERT: App bundle tampering detected: ${e.reason}`), process.env.NODE_ENV === "production")) {
    s.quit();
    return;
  }
  F(), D();
}), s.on("window-all-closed", () => {
  process.platform !== "darwin" && s.quit();
}), s.on("activate", () => {
  k.getAllWindows().length === 0 && D();
})) : s.quit());
export {
  I as verifyBundleIntegrity
};
