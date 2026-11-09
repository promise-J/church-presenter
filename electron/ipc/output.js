import { ipcMain, screen } from 'electron';
import { getOutputWindow, createOutputWindow, destroyOutputWindow } from '../windows/outputWindow.js';

export function registerOutputIPC() {
  ipcMain.handle('window:get-displays', () => {
    return screen.getAllDisplays().map(d => ({
      id: d.id,
      label: d.label || `Display ${d.id}`,
      bounds: d.bounds,
      primary: d.id === screen.getPrimaryDisplay().id,
    }));
  });

  ipcMain.handle('output:send', (_e, channel, data) => {
    const win = getOutputWindow();
    if (win) win.webContents.send(channel, data);
  });
}