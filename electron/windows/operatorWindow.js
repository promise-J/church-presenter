import { BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const VITE_URL = 'http://localhost:5173';


const url = isDev
? VITE_URL
: `file://${path.join(__dirname, '..', '..', 'dist', 'index.html')}`;

let operatorWindow = null;

export function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Church Presenter',
    backgroundColor: '#0a0a12',
    show: false,                 // ← don't show until ready
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  
  operatorWindow.loadURL(url);
  
  operatorWindow.once('ready-to-show', () => {
    console.log('[operatorWindow] ready-to-show');
    operatorWindow.show();
  });
  
  operatorWindow.on('closed', () => { operatorWindow = null; });


  operatorWindow.once('ready-to-show', () => operatorWindow.show());

  if (isDev) operatorWindow.webContents.openDevTools({ mode: 'detach' });

  return operatorWindow;
}