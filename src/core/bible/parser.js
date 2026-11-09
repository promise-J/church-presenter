import { BOOKS, BOOK_ALIASES } from './books.js';

/**
 * Parse a scripture reference string.
 * Examples:
 *   "John 3:16"
 *   "jn 3:16-18"
 *   "1 Cor 13"
 *   "Psalm 23"
 *   "romans 8:28"
 *   "gen 1:1-2:3"   (multi-chapter ranges handled as chapter-only)
 */
export function parseReference(input) {
  if (!input || typeof input !== 'string') return null;

  const text = input.trim().toLowerCase();
  if (!text) return null;

  // Match: [book] [chapter]:[verse[-end]]  or  [book] [chapter]
  const match = text.match(/^([1-3]?\s*[a-z]+(?:\s+[a-z]+)?)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/);

  if (!match) return null;

  const [, rawBook, chapterStr, verseStr, endStr] = match;
  const bookKey = rawBook.replace(/\s+/g, '').trim();

  const bookId = BOOK_ALIASES.get(bookKey);
  if (!bookId) return null;

  const chapter = parseInt(chapterStr, 10);
  const verseStart = verseStr ? parseInt(verseStr, 10) : 1;
  const verseEnd = endStr ? parseInt(endStr, 10) : (verseStr ? verseStart : 999);

  return {
    bookId,
    chapter,
    verseStart,
    verseEnd,
    isChapterOnly: !verseStr,
    raw: input,
  };
}

/**
 * Parse multiple references separated by ; or newlines.
 */
export function parseReferences(input) {
  if (!input) return [];
  return input
    .split(/[;\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseReference)
    .filter(Boolean);
}