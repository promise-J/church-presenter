import { ipcMain, BrowserWindow } from 'electron';
import { getRemoteInfo, broadcastToRemotes } from '../remote/server.js';
import { setOperatorSender } from '../remote/ws.js';

export function registerRemoteIPC() {
  // Provide the info (URL + QR target) to the operator panel
  ipcMain.handle('remote:get-info', () => getRemoteInfo());

  // Push a state update from the operator to all connected phones
  ipcMain.handle('remote:push-state', (_e, state) => {
    broadcastToRemotes('state:update', state);
    return true;
  });

  // When a phone asks for the current state, we ping the operator window
  // to respond via remote:push-state.
  setOperatorSender((channel, payload) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    }
  });
}