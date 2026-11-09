import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.bible-cache', 'KJV');
const DATA_DIR = path.join(ROOT, 'assets', 'bibles');

const BASE_URL = 'https://raw.githubusercontent.com/aruljohn/Bible-kjv/master';

// Canonical 66-book list with our IDs, names, and file names as used by aruljohn/Bible-kjv
const BOOKS = [
  { id: 'GEN', name: 'Genesis',          file: 'Genesis' },
  { id: 'EXO', name: 'Exodus',           file: 'Exodus' },
  { id: 'LEV', name: 'Leviticus',        file: 'Leviticus' },
  { id: 'NUM', name: 'Numbers',          file: 'Numbers' },
  { id: 'DEU', name: 'Deuteronomy',      file: 'Deuteronomy' },
  { id: 'JOS', name: 'Joshua',           file: 'Joshua' },
  { id: 'JDG', name: 'Judges',           file: 'Judges' },
  { id: 'RUT', name: 'Ruth',             file: 'Ruth' },
  { id: '1SA', name: '1 Samuel',         file: '1Samuel' },
  { id: '2SA', name: '2 Samuel',         file: '2Samuel' },
  { id: '1KI', name: '1 Kings',          file: '1Kings' },
  { id: '2KI', name: '2 Kings',          file: '2Kings' },
  { id: '1CH', name: '1 Chronicles',     file: '1Chronicles' },
  { id: '2CH', name: '2 Chronicles',     file: '2Chronicles' },
  { id: 'EZR', name: 'Ezra',             file: 'Ezra' },
  { id: 'NEH', name: 'Nehemiah',         file: 'Nehemiah' },
  { id: 'EST', name: 'Esther',           file: 'Esther' },
  { id: 'JOB', name: 'Job',              file: 'Job' },
  { id: 'PSA', name: 'Psalms',           file: 'Psalms' },
  { id: 'PRO', name: 'Proverbs',         file: 'Proverbs' },
  { id: 'ECC', name: 'Ecclesiastes',     file: 'Ecclesiastes' },
  { id: 'SNG', name: 'Song of Solomon',  file: 'SongofSolomon' },
  { id: 'ISA', name: 'Isaiah',           file: 'Isaiah' },
  { id: 'JER', name: 'Jeremiah',         file: 'Jeremiah' },
  { id: 'LAM', name: 'Lamentations',     file: 'Lamentations' },
  { id: 'EZK', name: 'Ezekiel',          file: 'Ezekiel' },
  { id: 'DAN', name: 'Daniel',           file: 'Daniel' },
  { id: 'HOS', name: 'Hosea',            file: 'Hosea' },
  { id: 'JOL', name: 'Joel',             file: 'Joel' },
  { id: 'AMO', name: 'Amos',             file: 'Amos' },
  { id: 'OBA', name: 'Obadiah',          file: 'Obadiah' },
  { id: 'JON', name: 'Jonah',            file: 'Jonah' },
  { id: 'MIC', name: 'Micah',            file: 'Micah' },
  { id: 'NAM', name: 'Nahum',            file: 'Nahum' },
  { id: 'HAB', name: 'Habakkuk',         file: 'Habakkuk' },
  { id: 'ZEP', name: 'Zephaniah',        file: 'Zephaniah' },
  { id: 'HAG', name: 'Haggai',           file: 'Haggai' },
  { id: 'ZEC', name: 'Zechariah',        file: 'Zechariah' },
  { id: 'MAL', name: 'Malachi',          file: 'Malachi' },
  { id: 'MAT', name: 'Matthew',          file: 'Matthew' },
  { id: 'MRK', name: 'Mark',             file: 'Mark' },
  { id: 'LUK', name: 'Luke',             file: 'Luke' },
  { id: 'JHN', name: 'John',             file: 'John' },
  { id: 'ACT', name: 'Acts',             file: 'Acts' },
  { id: 'ROM', name: 'Romans',           file: 'Romans' },
  { id: '1CO', name: '1 Corinthians',    file: '1Corinthians' },
  { id: '2CO', name: '2 Corinthians',    file: '2Corinthians' },
  { id: 'GAL', name: 'Galatians',        file: 'Galatians' },
  { id: 'EPH', name: 'Ephesians',        file: 'Ephesians' },
  { id: 'PHP', name: 'Philippians',      file: 'Philippians' },
  { id: 'COL', name: 'Colossians',       file: 'Colossians' },
  { id: '1TH', name: '1 Thessalonians',  file: '1Thessalonians' },
  { id: '2TH', name: '2 Thessalonians',  file: '2Thessalonians' },
  { id: '1TI', name: '1 Timothy',        file: '1Timothy' },
  { id: '2TI', name: '2 Timothy',        file: '2Timothy' },
  { id: 'TIT', name: 'Titus',            file: 'Titus' },
  { id: 'PHM', name: 'Philemon',         file: 'Philemon' },
  { id: 'HEB', name: 'Hebrews',          file: 'Hebrews' },
  { id: 'JAS', name: 'James',            file: 'James' },
  { id: '1PE', name: '1 Peter',          file: '1Peter' },
  { id: '2PE', name: '2 Peter',          file: '2Peter' },
  { id: '1JN', name: '1 John',           file: '1John' },
  { id: '2JN', name: '2 John',           file: '2John' },
  { id: '3JN', name: '3 John',           file: '3John' },
  { id: 'JUD', name: 'Jude',             file: 'Jude' },
  { id: 'REV', name: 'Revelation',       file: 'Revelation' },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
      return resolve(dest);
    }
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function ensureBookDownloaded(book) {
  const cachePath = path.join(CACHE_DIR, `${book.file}.json`);
  const url = `${BASE_URL}/${book.file}.json`;
  await download(url, cachePath);
  return cachePath;
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const dbPath = path.join(DATA_DIR, 'bibles.db');
  if (fs.existsSync(dbPath)) {
    console.log(`Removing existing ${dbPath}`);
    fs.unlinkSync(dbPath);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Reuse the same schema your app expects
  const schema = fs.readFileSync(
    path.join(ROOT, 'electron', 'db', 'schema.sql'),
    'utf-8'
  );
  db.exec(schema);

  console.log('\nImporting KJV — King James Version');
  console.log('  Downloading 66 book files…');

  // Download all books first (parallel with concurrency limit)
  const CONCURRENCY = 6;
  let downloaded = 0;
  const queue = [...BOOKS];
  async function worker() {
    while (queue.length > 0) {
      const book = queue.shift();
      await ensureBookDownloaded(book);
      downloaded++;
      process.stdout.write(`\r  ${downloaded}/66 downloaded`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log('');

  // Now insert everything into SQLite
  const insertTranslation = db.prepare(`
    INSERT OR REPLACE INTO translations
      (id, name, language, license, verse_count, imported_at)
    VALUES (?, ?, 'en', 'public-domain', ?, ?)
  `);

  const insertVerse = db.prepare(`
    INSERT INTO verses
      (translation_id, book_id, book_name, book_order, chapter, verse, text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let totalVerses = 0;

  const importAll = db.transaction(() => {
    // 1. Insert the translation row FIRST so the foreign key resolves
    insertTranslation.run('KJV', 'King James Version', 0, Date.now());
  
    // 2. Now insert every verse
    BOOKS.forEach((book, bookIndex) => {
      const cachePath = path.join(CACHE_DIR, `${book.file}.json`);
      const raw = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      const chapters = raw.chapters || [];
  
      for (const ch of chapters) {
        const chapterNum = Number(ch.chapter);
        const verses = ch.verses || [];
        for (const v of verses) {
          insertVerse.run(
            'KJV',
            book.id,
            book.name,
            bookIndex + 1,
            chapterNum,
            Number(v.verse),
            String(v.text).trim()
          );
          totalVerses++;
        }
      }
    });
  
    // 3. Update the verse count now that we know it
    db.prepare('UPDATE translations SET verse_count = ? WHERE id = ?')
      .run(totalVerses, 'KJV');
  });
  
  importAll();

  db.close();

  console.log(`  ${totalVerses.toLocaleString()} verses imported`);
  console.log(`\nDone. Bible database at ${dbPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});