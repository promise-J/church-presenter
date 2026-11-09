const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'Cb': 'B', 'Fb': 'E',
};

const MAJOR_KEYS = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11,
};

function normalizeNote(note) {
  if (FLAT_TO_SHARP[note]) return FLAT_TO_SHARP[note];
  return note;
}

function noteFromIndex(i) {
  const idx = ((i % 12) + 12) % 12;
  return SHARP_NOTES[idx];
}

/**
 * Transpose a chord string by `semitones`.
 * Handles: C, Cm, C7, Cmaj7, Csus4, C/G, Cadd9, Cm7b5, etc.
 */
export function transposeChord(chord, semitones) {
  return chord.replace(
    /^([A-G])([#b]?)/,
    (_, letter, accidental) => {
      const original = letter + (accidental || '');
      const normalized = normalizeNote(original);
      const idx = SHARP_NOTES.indexOf(normalized);
      if (idx === -1) return original;
      return noteFromIndex(idx + semitones);
    }
  );
}

/**
 * Transpose an entire lyrics body — only chord lines are touched.
 * A chord line is one that contains only chord tokens and whitespace.
 */
export function transposeLyrics(text, semitones) {
  if (!text || semitones === 0) return text;
  return text.split('\n').map(line => {
    if (isChordLine(line)) {
      return line.replace(/[A-G][#b]?[a-zA-Z0-9]*(?:\/[A-G][#b]?)?/g, m => transposeChord(m, semitones));
    }
    return line;
  }).join('\n');
}

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Chord line: only letters A-G, #, b, digits, /, m, a, j, s, u, d, dim, aug, sus, +, -, space, parens
  const chordRegex = /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|\d|\/[A-G][#b]?)*(\s+|$))+$/;
  return chordRegex.test(trimmed);
}

/**
 * Get the key after transposing by N semitones.
 */
export function transposeKey(key, semitones) {
  if (!key || semitones === 0) return key;
  const base = key.replace(/m$/, '');
  const isMinor = key.endsWith('m');
  const idx = SHARP_NOTES.indexOf(normalizeNote(base));
  if (idx === -1) return key;
  const newRoot = noteFromIndex(idx + semitones);
  return isMinor ? `${newRoot}m` : newRoot;
}

/**
 * Compute the semitone difference between two keys.
 */
export function semitoneDiff(fromKey, toKey) {
  if (!fromKey || !toKey) return 0;
  const from = MAJOR_KEYS[fromKey] ?? MAJOR_KEYS[fromKey.replace(/m$/, '')];
  const to = MAJOR_KEYS[toKey] ?? MAJOR_KEYS[toKey.replace(/m$/, '')];
  if (from === undefined || to === undefined) return 0;
  return ((to - from + 12) % 12);
}