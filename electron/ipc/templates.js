import { ipcMain } from 'electron';
import { getDb } from '../db/database.js';
import { BUILTIN_TEMPLATES } from '../../src/core/templates/defaults.js';


// Note: importing from src works because Electron's main process is also bundled by Vite.
// If you hit a module resolution issue, copy the JSONs into electron/db/builtin-templates.js instead.

export function registerTemplatesIPC() {
  const db = getDb();

  // Seed built-ins on first run
  const count = db.prepare('SELECT COUNT(*) as c FROM templates WHERE builtin = 1').get();
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO templates (id, name, category, layout_json, builtin, updated_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `);
    const tx = db.transaction(() => {
      for (const t of BUILTIN_TEMPLATES) {
        // insert.run(t.id, t.name, t.category, JSON.stringify(t), Date.now());
        insert.run(
          t.id,
          t.name,
          t.category,
          JSON.stringify({ background: t.background, zones: t.zones }),
          Date.now()
        );
      }
    });
    tx();
  }

  ipcMain.handle('templates:list', () => {
    return db.prepare(`
      SELECT id, name, category, layout_json, builtin, updated_at
      FROM templates
      ORDER BY builtin DESC, category, name
    `).all().map(row => {
      let parsed;
      try { parsed = JSON.parse(row.layout_json); } catch { parsed = {}; }
  
      // If the parsed layout is actually the whole template, extract the real layout
      let layout;
      if (parsed.layout && parsed.layout.zones) {
        // Nested shape (old bad data)
        layout = parsed.layout;
      } else if (parsed.zones) {
        // Already correct shape
        layout = { background: parsed.background, zones: parsed.zones };
      } else {
        // Unknown shape — return empty
        layout = { background: { type: 'color', value: '#000' }, zones: [] };
      }
  
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        builtin: row.builtin === 1,
        updatedAt: row.updated_at,
        layout,
      };
    });
  });

  ipcMain.handle('templates:get', (_e, id) => {
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      builtin: row.builtin === 1,
      layout: JSON.parse(row.layout_json),
    };
  });

  ipcMain.handle('templates:save', (_e, { id, name, category, layout }) => {
    // Prevent overwriting built-ins
    const existing = db.prepare('SELECT builtin FROM templates WHERE id = ?').get(id);
    if (existing && existing.builtin === 1) {
      throw new Error('Cannot overwrite a built-in template. Duplicate it first.');
    }
    db.prepare(`
      INSERT INTO templates (id, name, category, layout_json, builtin, updated_at)
      VALUES (?, ?, ?, ?, 0, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        layout_json = excluded.layout_json,
        updated_at = excluded.updated_at
    `).run(id, name, category, JSON.stringify(layout), Date.now());
    return true;
  });

  ipcMain.handle('templates:delete', (_e, id) => {
    const existing = db.prepare('SELECT builtin FROM templates WHERE id = ?').get(id);
    if (existing?.builtin === 1) throw new Error('Cannot delete a built-in template');
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    return true;
  });

  ipcMain.handle('templates:duplicate', (_e, id) => {
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    if (!row) throw new Error('Template not found');
    const newId = `${id}-copy-${Date.now()}`;
    const layout = JSON.parse(row.layout_json);
    layout.id = newId;
    layout.name = `${row.name} (Copy)`;
    layout.builtin = false;
    db.prepare(`
      INSERT INTO templates (id, name, category, layout_json, builtin, updated_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(newId, layout.name, row.category, JSON.stringify(layout), Date.now());
    return { id: newId, name: layout.name, category: row.category, layout };
  });
}