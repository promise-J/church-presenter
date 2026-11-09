import { ipcMain } from 'electron';
import { getDb } from '../db/database.js';

export function registerSettingsIPC() {
  const db = getDb();

  ipcMain.handle('settings:get', (_e, key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
  });

  ipcMain.handle('settings:set', (_e, key, value) => {
    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, JSON.stringify(value));
    return true;
  });

  ipcMain.handle('settings:getAll', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) result[row.key] = JSON.parse(row.value);
    return result;
  });
}