import { app as o, BrowserWindow as A, ipcMain as l, safeStorage as m } from "electron";
import a from "node:path";
import r from "node:fs";
import E from "node:crypto";
import { exec as I } from "node:child_process";
let e = null, y = null, c = !1;
function R() {
  try {
    const n = o.getPath("userData"), t = a.join(n, "device-identity.json");
    if (r.existsSync(t)) {
      const i = JSON.parse(r.readFileSync(t, "utf-8"));
      if (i && typeof i.deviceId == "string")
        return i.deviceId;
    }
    const s = E.randomUUID();
    return r.mkdirSync(n, { recursive: !0 }), r.writeFileSync(
      t,
      JSON.stringify({ deviceId: s, createdAt: (/* @__PURE__ */ new Date()).toISOString() }),
      "utf-8"
    ), s;
  } catch {
    return "dev-fallback-" + E.randomUUID().slice(0, 8);
  }
}
function O(n) {
  try {
    y = n;
    const t = o.getPath("userData"), s = a.join(t, "session-token.enc");
    if (m && m.isEncryptionAvailable()) {
      const i = m.encryptString(n);
      return r.writeFileSync(s, i), !0;
    } else {
      const i = Buffer.from(n).toString("base64");
      return r.writeFileSync(s, i, "utf-8"), !0;
    }
  } catch {
    return !1;
  }
}
function C() {
  try {
    if (y) return y;
    const n = o.getPath("userData"), t = a.join(n, "session-token.enc");
    if (!r.existsSync(t)) return null;
    const s = r.readFileSync(t);
    return m && m.isEncryptionAvailable() ? y = m.decryptString(s) : y = Buffer.from(s.toString("utf-8"), "base64").toString("utf-8"), y;
  } catch {
    return null;
  }
}
function L() {
  try {
    y = null;
    const n = o.getPath("userData"), t = a.join(n, "session-token.enc");
    return r.existsSync(t) && r.unlinkSync(t), !0;
  } catch {
    return !1;
  }
}
const F = [
  // Remote Desktop / Screen Sharing
  "teamviewer.exe",
  "teamviewer",
  "anydesk.exe",
  "anydesk",
  "vncviewer.exe",
  "vncserver.exe",
  "mstsc.exe",
  "rustdesk.exe",
  "rustdesk",
  "parsec.exe",
  "logmein.exe",
  "ammyy.exe",
  "ultraviewer.exe",
  "chrome-remote-desktop",
  // Screen Recording / Streaming / Meeting
  "obs64.exe",
  "obs32.exe",
  "obs",
  "camtasia.exe",
  "bandicam.exe",
  "fraps.exe",
  "discord.exe",
  "discord",
  "zoom.exe",
  "teams.exe",
  "webex.exe",
  "slack.exe",
  // Cheating / Debugging / Process Inspection
  "wireshark.exe",
  "wireshark",
  "fiddler.exe",
  "fiddler",
  "charles.exe",
  "cheatengine-x86_64.exe",
  "cheatengine.exe",
  "cheatengine",
  "x64dbg.exe",
  "x32dbg.exe",
  "processhacker.exe",
  "procmon.exe",
  "procmon64.exe",
  "procexp.exe",
  "procexp64.exe"
];
async function N(n) {
  const t = Array.from(
    /* @__PURE__ */ new Set([
      ...F,
      ...n && Array.isArray(n) ? n.map((s) => s.toLowerCase().trim()).filter(Boolean) : []
    ])
  );
  return new Promise((s) => {
    const i = process.platform === "win32" ? "tasklist /FO CSV /NH" : "ps -e -o comm=";
    I(i, { timeout: 3e3 }, (p, d) => {
      if (p || !d) {
        s({ hasProhibitedApps: !1, apps: [] });
        return;
      }
      const f = d.toLowerCase(), v = t.filter((g) => f.includes(g.toLowerCase()));
      s({ hasProhibitedApps: v.length > 0, apps: v });
    });
  });
}
const P = 2 * 1024 * 1024, x = 3;
function D(n) {
  return n.replace(
    /(password|token|secret|key|authorization|bearer)\s*[:=]\s*["']?[^"',\s]+["']?/gi,
    "$1=[REDACTED]"
  ).replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]").replace(/[A-Za-z0-9]{32,}/g, (t) => t.slice(0, 4) + "...[REDACTED]");
}
function u(n, t, s, i) {
  try {
    const p = o.getPath("userData"), d = a.join(p, "logs");
    r.existsSync(d) || r.mkdirSync(d, { recursive: !0 });
    const f = a.join(d, "candidate-desktop.log");
    if (r.existsSync(f) && r.statSync(f).size >= P) {
      for (let S = x - 1; S >= 1; S--) {
        const w = a.join(d, `candidate-desktop.${S}.log`), b = a.join(d, `candidate-desktop.${S + 1}.log`);
        r.existsSync(w) && (S === x - 1 ? r.unlinkSync(w) : r.renameSync(w, b));
      }
      r.renameSync(f, a.join(d, "candidate-desktop.1.log"));
    }
    const v = (/* @__PURE__ */ new Date()).toISOString(), g = D(t), h = i ? D(JSON.stringify(i)) : void 0, _ = JSON.stringify({
      timestamp: v,
      level: n,
      message: g,
      correlationId: s || null,
      metadata: h ? JSON.parse(h) : void 0
    }) + `
`;
    return r.appendFileSync(f, _, "utf-8"), !0;
  } catch {
    return !1;
  }
}
function T(n) {
  const t = n || a.join(__dirname, ".."), s = [], i = [
    a.join("dist-electron", "preload.js"),
    a.join("dist", "index.html")
  ];
  for (const p of i) {
    const d = a.join(t, p);
    if (!r.existsSync(d)) {
      if (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === "test")
        continue;
      return {
        isTampered: !0,
        reason: `Critical application asset missing: ${p}`,
        checkedFiles: s
      };
    }
    s.push(p);
    try {
      const f = r.readFileSync(d, "utf-8"), v = [/<script[^>]*src=["']https?:\/\//i, /\bdebugger\b/i];
      for (const g of v)
        if (g.test(f))
          return {
            isTampered: !0,
            reason: `Disallowed code signature detected in ${p}`,
            checkedFiles: s
          };
    } catch (f) {
      return {
        isTampered: !0,
        reason: `Failed to inspect asset ${p}: ${f.message}`,
        checkedFiles: s
      };
    }
  }
  return {
    isTampered: !1,
    checkedFiles: s
  };
}
function V(n) {
  return c = !!n, e && !e.isDestroyed() && (c ? (e.setKiosk(!0), e.setFullScreen(!0), e.setAlwaysOnTop(!0, "screen-saver"), e.focus(), u(
    "info",
    "Assessment lockdown engaged: Kiosk mode, fullscreen, and screen-saver always-on-top active (FR-LAB-005, FR-LAB-008)",
    void 0,
    { isExamActive: !0, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  )) : (e.setAlwaysOnTop(!1), process.env.NODE_ENV !== "production" && (e.setKiosk(!1), e.setFullScreen(!1)), u("info", "Assessment lockdown disengaged", void 0, {
    isExamActive: !1,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }))), !0;
}
function K() {
  return c;
}
function B() {
  l.handle("verisync:getAppVersion", () => "1.1.0"), l.handle("verisync:getDeviceId", () => R()), l.handle("verisync:isKiosk", () => process.env.NODE_ENV === "production" || c), l.handle("verisync:storeToken", (n, t) => O(t)), l.handle("verisync:getToken", () => C()), l.handle("verisync:clearToken", () => L()), l.handle(
    "verisync:checkProhibitedApps",
    (n, t) => N(t)
  ), l.handle("verisync:getSystemInfo", () => ({
    platform: process.platform,
    arch: process.arch,
    isWindows: process.platform === "win32"
  })), l.handle(
    "verisync:writeLog",
    (n, t) => u(t.level, t.message, t.correlationId, t.metadata)
  ), l.handle("verisync:verifyIntegrity", () => T()), l.handle("verisync:closeApp", () => {
    c ? u("warn", "Application close request ignored while exam is active") : o.quit();
  }), l.handle("verisync:setExamActive", (n, t) => V(t)), l.handle("verisync:isExamActive", () => c);
}
function k() {
  e = new A({
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
  }), e.webContents.setWindowOpenHandler(() => ({ action: "deny" })), e.webContents.on("will-attach-webview", (n) => {
    n.preventDefault();
  }), e.webContents.on("context-menu", (n) => {
    (process.env.NODE_ENV === "production" || c) && n.preventDefault();
  }), e.webContents.on("devtools-opened", () => {
    (process.env.NODE_ENV === "production" || c) && (e == null || e.webContents.closeDevTools());
  }), e.webContents.on("before-input-event", (n, t) => {
    const s = t.key === "F12" || (t.control || t.meta) && t.shift && ["I", "i", "J", "j", "C", "c"].includes(t.key), i = t.key === "F5" || (t.control || t.meta) && ["r", "R"].includes(t.key), p = t.alt && t.key === "F4";
    (s || i || p) && (process.env.NODE_ENV === "production" || c) && (n.preventDefault(), c && u(
      "warn",
      `Restricted keyboard shortcut '${t.key}' blocked during active exam (FR-LAB-006, TC18)`,
      void 0,
      { key: t.key, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    ));
  }), e.webContents.on("will-navigate", (n, t) => {
    try {
      const s = new URL(t);
      if (process.env.VITE_DEV_SERVER_URL) {
        const i = new URL(process.env.VITE_DEV_SERVER_URL);
        s.origin !== i.origin && n.preventDefault();
      } else s.protocol !== "file:" && n.preventDefault();
    } catch {
      n.preventDefault();
    }
  }), e.on("blur", () => {
    c && (u(
      "warn",
      "Security Event: Application window lost focus (blur) during active assessment (FR-LAB-006, FR-LAB-008)",
      void 0,
      { eventType: "FOCUS_LOST", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    ), e && !e.isDestroyed() && e.webContents.send("verisync:onWindowBlur"));
  }), e.on("minimize", () => {
    c && (e && !e.isDestroyed() && (e.restore(), e.focus(), e.setAlwaysOnTop(!0, "screen-saver")), u(
      "warn",
      "Security Event: Window minimize attempted during active assessment; immediately restored (FR-LAB-006, TC18)",
      void 0,
      { eventType: "WINDOW_MINIMIZE", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    ), e && !e.isDestroyed() && e.webContents.send("verisync:onWindowMinimize"));
  }), e.on("close", (n) => {
    c && (n.preventDefault(), u(
      "warn",
      "Security Event: Window close prevented by exam lockdown policy (FR-LAB-006, FR-LAB-008)",
      void 0,
      { eventType: "CLOSE_ATTEMPT_BLOCKED", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    ), e && !e.isDestroyed() && e.webContents.send("verisync:onExitAttempted"));
  }), process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile(a.join(__dirname, "../dist/index.html")), e.once("ready-to-show", () => {
    e == null || e.show();
  }), e.on("closed", () => {
    e = null;
  });
}
o && typeof o.requestSingleInstanceLock == "function" && (o.requestSingleInstanceLock() ? (o.on("second-instance", () => {
  e && (e.isMinimized() && e.restore(), e.focus(), c && (e.setAlwaysOnTop(!0, "screen-saver"), u(
    "warn",
    "Security Alert: Second instance launch attempt detected and blocked (FR-LAB-005, TC18)",
    void 0,
    { eventType: "SECOND_INSTANCE_ATTEMPT", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  ), e.webContents.send("verisync:onSecurityAlert", {
    eventType: "SECOND_INSTANCE_ATTEMPT"
  })));
}), o.whenReady().then(() => {
  const t = T();
  if (t.isTampered && (u(
    "error",
    `SECURITY ALERT: App bundle tampering detected: ${t.reason}`
  ), process.env.NODE_ENV === "production")) {
    o.quit();
    return;
  }
  B(), k();
}), o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
}), o.on("activate", () => {
  A.getAllWindows().length === 0 && k();
})) : o.quit());
export {
  F as DEFAULT_PROHIBITED_PROCESSES,
  u as appendLocalLog,
  N as detectProhibitedApps,
  K as getExamActive,
  V as setExamActive,
  T as verifyBundleIntegrity
};
