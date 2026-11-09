import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const VITE_URL = 'http://localhost:5173';

let outputWindow = null;

export function getOutputWindow() { return outputWindow; }

export function createOutputWindow(displayId) {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.focus();
    return outputWindow;
  }

  const displays = screen.getAllDisplays();
  const useKiosk = displays.length > 1;   // kiosk only if second display exists

  const target = displayId != null
    ? displays.find(d => d.id === displayId) || displays[0]
    : displays[1] || displays[0];

  outputWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,

    fullscreen: useKiosk,
    frame: false,
    kiosk: false,
    alwaysOnTop: useKiosk,
    skipTaskbar: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    show: false,

    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      sandbox: false,
    },
  });

  outputWindow.setMenu(null);

  outputWindow.webContents.on('did-finish-load', () => {
    // outputWindow.webContents.insertCSS('* { cursor: none !important; }');
    outputWindow.webContents.insertCSS('.output-root * { cursor: none !important; }');
  });

  outputWindow.on('close', (e) => {
    if (!outputWindow.allowClose) e.preventDefault();
  });

  const url = isDev
    ? `${VITE_URL}#/output`
    : `file://${path.join(__dirname, '..', '..', 'dist', 'index.html')}#/output`;

  outputWindow.loadURL(url);
  outputWindow.once('ready-to-show', () => outputWindow.show());
  outputWindow.on('closed', () => { outputWindow = null; });

  return outputWindow;
}

export function destroyOutputWindow() {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.allowClose = true;
    outputWindow.close();
  }
}