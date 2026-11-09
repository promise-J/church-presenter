import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';

export function registerServicesIPC() {
  const db = getDb();

  ipcMain.handle('services:list', () => {
    return db.prepare(`
      SELECT id, name, service_date, updated_at
      FROM services
      ORDER BY service_date DESC
    `).all().map(r => ({
      id: r.id,
      name: r.name,
      serviceDate: r.service_date,
      updatedAt: r.updated_at,
    }));
  });

  ipcMain.handle('services:get', (_e, id) => {
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      serviceDate: row.service_date,
      items: JSON.parse(row.items_json),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  });

  ipcMain.handle('services:create', (_e, { name, serviceDate }) => {
    const id = `svc_${nanoid(10)}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO services (id, name, service_date, items_json, created_at, updated_at)
      VALUES (?, ?, ?, '[]', ?, ?)
    `).run(id, name || 'Untitled Service', serviceDate || now, now, now);
    return { id, name: name || 'Untitled Service', serviceDate: serviceDate || now, items: [] };
  });

  ipcMain.handle('services:save', (_e, { id, name, serviceDate, items }) => {
    const now = Date.now();
    const existing = db.prepare('SELECT id FROM services WHERE id = ?').get(id);
    if (!existing) {
      db.prepare(`
        INSERT INTO services (id, name, service_date, items_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, name, serviceDate || now, JSON.stringify(items || []), now, now);
    } else {
      db.prepare(`
        UPDATE services
        SET name = ?, service_date = ?, items_json = ?, updated_at = ?
        WHERE id = ?
      `).run(name, serviceDate || now, JSON.stringify(items || []), now, id);
    }
    return { id, updatedAt: now };
  });

  ipcMain.handle('services:delete', (_e, id) => {
    db.prepare('DELETE FROM services WHERE id = ?').run(id);
    return true;
  });

  ipcMain.handle('services:duplicate', (_e, id) => {
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!row) throw new Error('Service not found');
    const newId = `svc_${nanoid(10)}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO services (id, name, service_date, items_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId, `${row.name} (Copy)`, now, row.items_json, now, now);
    return { id: newId };
  });

  ipcMain.handle('services:export', async (_e, id) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!row) throw new Error('Service not found');
  
    const exportData = {
      format: 'church-presenter-service',
      version: 1,
      exportedAt: Date.now(),
      service: {
        name: row.name,
        serviceDate: row.service_date,
        items: JSON.parse(row.items_json),
      },
    };
  
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Service',
      defaultPath: `${row.name.replace(/[^\w\s-]/g, '')}.cpservice.json`,
      filters: [{ name: 'Church Presenter Service', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
  
    const fs = await import('node:fs/promises');
    await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { path: result.filePath };
  });
  
  ipcMain.handle('services:import', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Import Service',
      properties: ['openFile'],
      filters: [{ name: 'Church Presenter Service', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(result.filePaths[0], 'utf-8');
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error('Not a valid JSON file'); }
  
    if (parsed.format !== 'church-presenter-service' || !parsed.service) {
      throw new Error('Not a Church Presenter service file');
    }
  
    const db = getDb();
    const id = `svc_${Date.now().toString(36)}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO services (id, name, service_date, items_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      parsed.service.name || 'Imported Service',
      parsed.service.serviceDate || now,
      JSON.stringify(parsed.service.items || []),
      now,
      now
    );
    return { id, name: parsed.service.name };
  });

  // Song export/import for individual songs
  // ipcMain.handle('songs:export', async (_e, id) => {
  //   const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
  //   if (!row) throw new Error('Song not found');
  //   const exportData = {
  //     format: 'church-presenter-song',
  //     version: 1,
  //     exportedAt: Date.now(),
  //     song: {
  //       title: row.title,
  //       author: row.author,
  //       songKey: row.song_key,
  //       tempo: row.tempo,
  //       ccliNumber: row.ccli_number,
  //       lyrics: JSON.parse(row.lyrics_json),
  //     },
  //   };
  //   const win = BrowserWindow.getFocusedWindow();
  //   const result = await dialog.showSaveDialog(win, {
  //     title: 'Export Song',
  //     defaultPath: `${row.title.replace(/[^\w\s-]/g, '')}.cpsong.json`,
  //     filters: [{ name: 'Church Presenter Song', extensions: ['cpsong.json', 'json'] }],
  //   });
  //   if (result.canceled || !result.filePath) return { canceled: true };
  //   await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  //   return { path: result.filePath };
  // });
}