import { ipcMain, BrowserWindow, dialog } from 'electron';
import { getDb } from '../db/database.js';
import { nanoid } from 'nanoid';
import fs from 'node:fs/promises';


export function registerSongsIPC() {
  const db = getDb();

  ipcMain.handle('songs:list', () => {
    return db.prepare(`
      SELECT id, title, author, song_key, tempo, ccli_number, updated_at
      FROM songs
      ORDER BY title COLLATE NOCASE ASC
    `).all().map(r => ({
      id: r.id,
      title: r.title,
      author: r.author,
      songKey: r.song_key,
      tempo: r.tempo,
      ccliNumber: r.ccli_number,
      updatedAt: r.updated_at,
    }));
  });

  ipcMain.handle('songs:get', (_e, id) => {
    const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      songKey: row.song_key,
      tempo: row.tempo,
      ccliNumber: row.ccli_number,
      lyrics: JSON.parse(row.lyrics_json),
      updatedAt: row.updated_at,
    };
  });

  ipcMain.handle('songs:create', (_e, payload) => {
    const id = `sng_${nanoid(10)}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO songs (id, title, author, song_key, tempo, ccli_number, lyrics_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      payload.title || 'Untitled Song',
      payload.author || null,
      payload.songKey || null,
      payload.tempo || null,
      payload.ccliNumber || null,
      JSON.stringify(payload.lyrics || { raw: '' }),
      now,
      now
    );
    return { id, ...payload, updatedAt: now };
  });

  ipcMain.handle('songs:save', (_e, payload) => {
    const now = Date.now();
    const existing = db.prepare('SELECT id FROM songs WHERE id = ?').get(payload.id);
    if (!existing) throw new Error('Song not found');
    db.prepare(`
      UPDATE songs
      SET title = ?, author = ?, song_key = ?, tempo = ?, ccli_number = ?, lyrics_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      payload.title,
      payload.author || null,
      payload.songKey || null,
      payload.tempo || null,
      payload.ccliNumber || null,
      JSON.stringify(payload.lyrics || { raw: '' }),
      now,
      payload.id
    );
    return { id: payload.id, updatedAt: now };
  });

  ipcMain.handle('songs:delete', (_e, id) => {
    db.prepare('DELETE FROM songs WHERE id = ?').run(id);
    return true;
  });

  ipcMain.handle('songs:export', async (_e, id) => {
    const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
    if (!row) throw new Error('Song not found');

    const exportData = {
      format: 'church-presenter-song',
      version: 1,
      exportedAt: Date.now(),
      song: {
        title: row.title,
        author: row.author,
        songKey: row.song_key,
        tempo: row.tempo,
        ccliNumber: row.ccli_number,
        lyrics: JSON.parse(row.lyrics_json),
      },
    };

    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Song',
      defaultPath: `${row.title.replace(/[^\w\s-]/g, '')}.cpsong.json`,
      filters: [{ name: 'Church Presenter Song', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { path: result.filePath };
  });
}



