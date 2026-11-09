import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const VITE_URL = 'http://localhost:5173';

let stageWindow = null;

export function createStageWindow(displayId) {
  if (stageWindow && !stageWindow.isDestroyed()) {
    stageWindow.focus();
    return stageWindow;
  }

  const displays = screen.getAllDisplays();
  const target = displayId != null
    ? displays.find(d => d.id === displayId) || displays[0]
    : displays[2] || displays[0];

  stageWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: true,
    frame: false,
    backgroundColor: '#0a0a14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const url = isDev
    ? `${VITE_URL}#/stage`
    : `file://${path.join(__dirname, '..', '..', 'dist', 'index.html')}#/stage`;

  stageWindow.loadURL(url);
  stageWindow.once('ready-to-show', () => stageWindow.show());
  stageWindow.on('closed', () => { stageWindow = null; });
  return stageWindow;
}