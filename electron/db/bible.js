import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let bibleDb = null;

function getBibleDbPath() {
  if (app.isPackaged) {
    // Packaged app: bibles.db sits in Resources/bibles/bibles.db
    const packaged = path.join(process.resourcesPath, 'bibles', 'bibles.db');
    if (fs.existsSync(packaged)) return packaged;
  }
  // Dev: bibles.db sits in the repo at assets/bibles/bibles.db
  return path.join(__dirname, '..', '..', 'assets', 'bibles', 'bibles.db');
}

export function getBibleDb() {
  if (bibleDb) return bibleDb;

  const dbPath = getBibleDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`[bible] Database not found at ${dbPath}`);
    console.error(`[bible] Run 'npm run import:bibles' to build it.`);
    return null;
  }

  console.log(`[bible] Opening ${dbPath}`);
  bibleDb = new Database(dbPath, { readonly: true });
  bibleDb.pragma('journal_mode = WAL');
  return bibleDb;
}