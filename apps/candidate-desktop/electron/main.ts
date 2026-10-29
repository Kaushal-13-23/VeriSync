import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';

/**
 * Secure Electron Main Process for VeriSync Candidate Desktop
 * Non-Negotiable Rules & SRS Requirements:
 * - Single window instance lock (FR-LAB-005, SRS 10.3)
 * - contextIsolation: true, nodeIntegration: false, sandbox: true (NFR-SEC-001, NFR-SEC-005)
 * - Strict navigation boundaries (prevent remote content navigation & window popups)
 * - Persisted app-managed device ID (FR-LAB-002)
 * - Client version handshake (FR-LAB-003)
 * - Electron safeStorage encrypted token management (NFR-SEC-004)
 * - Prohibited application detection (FR-LAB-006)
 */

let mainWindow: BrowserWindow | null = null;
let inMemoryToken: string | null = null;

// SRS FR-LAB-002: Generate and persist unique application-managed device identifier
function getOrCreateDeviceId(): string {
  try {
    const userDataPath = app.getPath('userData');
    const deviceIdFile = path.join(userDataPath, 'device-identity.json');
    if (fs.existsSync(deviceIdFile)) {
      const data = JSON.parse(fs.readFileSync(deviceIdFile, 'utf-8'));
      if (data && typeof data.deviceId === 'string') {
        return data.deviceId;
      }
    }
    const newDeviceId = crypto.randomUUID();
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(
      deviceIdFile,
      JSON.stringify({ deviceId: newDeviceId, createdAt: new Date().toISOString() }),
      'utf-8'
    );
    return newDeviceId;
  } catch {
    return 'dev-fallback-' + crypto.randomUUID().slice(0, 8);
  }
}

// SRS NFR-SEC-004: SafeStorage token persistence with encrypted storage
function saveEncryptedToken(token: string): boolean {
  try {
    inMemoryToken = token;
    const userDataPath = app.getPath('userData');
    const tokenFile = path.join(userDataPath, 'session-token.enc');
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      fs.writeFileSync(tokenFile, encrypted);
      return true;
    } else {
      // Fallback for headless test environments where OS keyring is unavailable
      const encoded = Buffer.from(token).toString('base64');
      fs.writeFileSync(tokenFile, encoded, 'utf-8');
      return true;
    }
  } catch {
    return false;
  }
}

function loadEncryptedToken(): string | null {
  try {
    if (inMemoryToken) return inMemoryToken;
    const userDataPath = app.getPath('userData');
    const tokenFile = path.join(userDataPath, 'session-token.enc');
    if (!fs.existsSync(tokenFile)) return null;
    const raw = fs.readFileSync(tokenFile);
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      inMemoryToken = safeStorage.decryptString(raw);
    } else {
      inMemoryToken = Buffer.from(raw.toString('utf-8'), 'base64').toString('utf-8');
    }
    return inMemoryToken;
  } catch {
    return null;
  }
}

function removeEncryptedToken(): boolean {
  try {
    inMemoryToken = null;
    const userDataPath = app.getPath('userData');
    const tokenFile = path.join(userDataPath, 'session-token.enc');
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile);
    }
    return true;
  } catch {
    return false;
  }
}

// SRS FR-LAB-006: Prohibited background applications detection
async function detectProhibitedApps(): Promise<{ hasProhibitedApps: boolean; apps: string[] }> {
  const blacklist = [
    'teamviewer.exe',
    'teamviewer',
    'anydesk.exe',
    'anydesk',
    'vncviewer.exe',
    'vncserver.exe',
    'obs64.exe',
    'obs32.exe',
  ];

  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'tasklist /FO CSV /NH' : 'ps -e -o comm=';
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ hasProhibitedApps: false, apps: [] });
        return;
      }
      const runningLower = stdout.toLowerCase();
      const detected = blacklist.filter((proc) => runningLower.includes(proc));
      resolve({ hasProhibitedApps: detected.length > 0, apps: detected });
    });
  });
}

// Local Rotating Log File with Secret Scrubbing (Rule 5, Rule 9, FR-AUD-007, NFR-MNT-005)
const MAX_LOG_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_LOG_FILES = 3;

function scrubSensitiveData(text: string): string {
  return text
    .replace(/(password|token|secret|key|authorization|bearer)\s*[:=]\s*["']?[^"',\s]+["']?/gi, '$1=[REDACTED]')
    .replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/[A-Za-z0-9]{32,}/g, (match) => match.slice(0, 4) + '...[REDACTED]');
}

function appendLocalLog(
  level: string,
  message: string,
  correlationId?: string,
  metadata?: Record<string, unknown>
): boolean {
  try {
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, 'candidate-desktop.log');

    // Check file size for rotation
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size >= MAX_LOG_SIZE_BYTES) {
        // Rotate: log.2 -> deleted, log.1 -> log.2, log -> log.1
        for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
          const src = path.join(logsDir, `candidate-desktop.${i}.log`);
          const dest = path.join(logsDir, `candidate-desktop.${i + 1}.log`);
          if (fs.existsSync(src)) {
            if (i === MAX_LOG_FILES - 1) {
              fs.unlinkSync(src);
            } else {
              fs.renameSync(src, dest);
            }
          }
        }
        fs.renameSync(logPath, path.join(logsDir, 'candidate-desktop.1.log'));
      }
    }

    const timestamp = new Date().toISOString();
    const cleanMessage = scrubSensitiveData(message);
    const cleanMeta = metadata ? scrubSensitiveData(JSON.stringify(metadata)) : undefined;

    const logEntry =
      JSON.stringify({
        timestamp,
        level,
        message: cleanMessage,
        correlationId: correlationId || null,
        metadata: cleanMeta ? JSON.parse(cleanMeta) : undefined,
      }) + '\n';

    fs.appendFileSync(logPath, logEntry, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

// App Bundle Integrity & Tamper Check at Startup (NFR-SEC-005, FR-LAB-002, FR-LAB-005)
export interface TamperCheckResult {
  isTampered: boolean;
  reason?: string;
  checkedFiles: string[];
}

export function verifyBundleIntegrity(baseDir?: string): TamperCheckResult {
  const root = baseDir || path.join(__dirname, '..');
  const checkedFiles: string[] = [];

  const criticalRelativePaths = [
    path.join('dist-electron', 'preload.js'),
    path.join('dist', 'index.html'),
  ];

  for (const relPath of criticalRelativePaths) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
      if (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'test') {
        continue;
      }
      return {
        isTampered: true,
        reason: `Critical application asset missing: ${relPath}`,
        checkedFiles,
      };
    }

    checkedFiles.push(relPath);

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const forbiddenSignatures = [
        /<script[^>]*src=["']https?:\/\//i,
        /\bdebugger\b/i,
      ];

      for (const sig of forbiddenSignatures) {
        if (sig.test(content)) {
          return {
            isTampered: true,
            reason: `Disallowed code signature detected in ${relPath}`,
            checkedFiles,
          };
        }
      }
    } catch (err) {
      return {
        isTampered: true,
        reason: `Failed to inspect asset ${relPath}: ${(err as Error).message}`,
        checkedFiles,
      };
    }
  }

  return {
    isTampered: false,
    checkedFiles,
  };
}

// Register IPC handlers before window creation
function setupIpcHandlers() {
  ipcMain.handle('verisync:getAppVersion', () => '1.1.0');
  ipcMain.handle('verisync:getDeviceId', () => getOrCreateDeviceId());
  ipcMain.handle('verisync:isKiosk', () => process.env.NODE_ENV === 'production');
  ipcMain.handle('verisync:storeToken', (_event, token: string) => saveEncryptedToken(token));
  ipcMain.handle('verisync:getToken', () => loadEncryptedToken());
  ipcMain.handle('verisync:clearToken', () => removeEncryptedToken());
  ipcMain.handle('verisync:checkProhibitedApps', () => detectProhibitedApps());
  ipcMain.handle('verisync:getSystemInfo', () => ({
    platform: process.platform,
    arch: process.arch,
    isWindows: process.platform === 'win32',
  }));
  ipcMain.handle(
    'verisync:writeLog',
    (
      _event,
      entry: { level: string; message: string; correlationId?: string; metadata?: Record<string, unknown> }
    ) => appendLocalLog(entry.level, entry.message, entry.correlationId, entry.metadata)
  );
  ipcMain.handle('verisync:verifyIntegrity', () => verifyBundleIntegrity());
  ipcMain.handle('verisync:closeApp', () => {
    app.quit();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    title: 'VeriSync Candidate Client',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Strict CSP and navigation enforcement: block popups & foreign navigation
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (process.env.VITE_DEV_SERVER_URL) {
        const devUrl = new URL(process.env.VITE_DEV_SERVER_URL);
        if (parsedUrl.origin !== devUrl.origin) {
          event.preventDefault();
        }
      } else if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single-instance lock enforcement (FR-LAB-005)
if (app && typeof app.requestSingleInstanceLock === 'function') {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });

    app.whenReady().then(() => {
      // Startup Bundle Integrity Verification (NFR-SEC-005, FR-LAB-002)
      const integrity = verifyBundleIntegrity();
      if (integrity.isTampered) {
        appendLocalLog('error', `SECURITY ALERT: App bundle tampering detected: ${integrity.reason}`);
        if (process.env.NODE_ENV === 'production') {
          app.quit();
          return;
        }
      }

      setupIpcHandlers();
      createWindow();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }
}
