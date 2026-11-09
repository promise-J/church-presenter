import { ipcMain } from 'electron';
import { getBibleDb } from '../db/bible.js';

export function registerBibleIPC() {
  ipcMain.handle('bible:translations', () => {
    const db = getBibleDb();
    if (!db) return [];
    return db.prepare(`
      SELECT id, name, language, license, verse_count
      FROM translations
      ORDER BY name
    `).all();
  });

  ipcMain.handle('bible:books', (_e, { translationId }) => {
    const db = getBibleDb();
    if (!db) return [];
    return db.prepare(`
      SELECT DISTINCT book_id, book_name, book_order
      FROM verses
      WHERE translation_id = ?
      ORDER BY book_order
    `).all(translationId);
  });

  ipcMain.handle('bible:chapter', (_e, { translationId, bookId, chapter }) => {
    const db = getBibleDb();
    if (!db) return { bookName: null, chapter, verses: [] };

    const bookInfo = db.prepare(`
      SELECT DISTINCT book_name FROM verses
      WHERE translation_id = ? AND book_id = ?
    `).get(translationId, bookId);

    const verses = db.prepare(`
      SELECT verse, text FROM verses
      WHERE translation_id = ? AND book_id = ? AND chapter = ?
      ORDER BY verse
    `).all(translationId, bookId, chapter);

    console.log(`[bible:chapter] ${translationId} ${bookId} ${chapter}: ${verses.length} verses`);
    return { bookName: bookInfo?.book_name, chapter, verses };
  });

  ipcMain.handle('bible:passage', (_e, { translationId, bookId, chapter, verseStart, verseEnd }) => {
    const db = getBibleDb();
    if (!db) return { verses: [], reference: '' };

    const end = verseEnd ?? verseStart;

    const bookInfo = db.prepare(`
      SELECT DISTINCT book_name FROM verses
      WHERE translation_id = ? AND book_id = ?
    `).get(translationId, bookId);

    const verses = db.prepare(`
      SELECT verse, text FROM verses
      WHERE translation_id = ?
        AND book_id = ?
        AND chapter = ?
        AND verse BETWEEN ? AND ?
      ORDER BY verse
    `).all(translationId, bookId, chapter, verseStart, end);

    return {
      reference: `${bookInfo?.book_name} ${chapter}:${verseStart}${end !== verseStart ? `-${end}` : ''}`,
      bookName: bookInfo?.book_name,
      chapter,
      verses,
    };
  });

  ipcMain.handle('bible:search', (_e, { translationId, query, limit = 100 }) => {
    const db = getBibleDb();
    if (!db) return [];

    const sanitized = query
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => `${w}*`)
      .join(' ');

    if (!sanitized) return [];

    try {
      return db.prepare(`
        SELECT
          v.book_id, v.book_name, v.book_order,
          v.chapter, v.verse, v.text,
          snippet(verses_fts, 0, '', '', '…', 15) AS snippet
        FROM verses_fts f
        JOIN verses v ON v.id = f.rowid
        WHERE v.translation_id = ? AND verses_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(translationId, sanitized, limit);
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  });
}