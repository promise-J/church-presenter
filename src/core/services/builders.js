import { nanoid } from 'nanoid';
import { splitLyrics } from '../songs/slideSplitter.js';

export function makeScriptureItem({ translationId, bookId, bookName, chapter, verses, templateId }) {
  const first = verses[0]?.verse;
  const last = verses[verses.length - 1]?.verse;
  const ref = first === last
    ? `${bookName} ${chapter}:${first}`
    : `${bookName} ${chapter}:${first}-${last}`;
  return {
    id: `itm_${nanoid(10)}`,
    type: 'scripture',
    title: ref,
    templateId: templateId || 'scripture-full',
    altTranslationId: null,
    data: { translationId, bookId, bookName, chapter,
      verseStart: first, verseEnd: last, verses },
  };
}

export function makeSongItem({ song, templateId }) {
  const slides = splitLyrics(song.lyrics?.raw || '');
  return {
    id: `itm_${nanoid(10)}`,
    type: 'song',
    title: song.title,
    templateId: templateId || 'lower-third',
    data: { songId: song.id, slides, songKey: song.songKey },
  };
}

export function makeAnnouncementItem({ text, title, templateId }) {
  return {
    id: `itm_${nanoid(10)}`,
    type: 'announcement',
    title: title || 'Announcement',
    templateId: templateId || 'announcement',
    data: { text },
  };
}

export function makeNoteItem({ text, title }) {
  return {
    id: `itm_${nanoid(10)}`,
    type: 'note',
    title: title || 'Note',
    data: { text },
  };
}

export function makeBlankItem() {
  return {
    id: `itm_${nanoid(10)}`,
    type: 'blank',
    title: 'Blank',
    data: {},
  };
}

export function makeMediaItem({ path, mediaType, title, templateId }) {
  return {
    id: `itm_${nanoid(10)}`,
    type: 'media',
    title: title || path.split(/[\\/]/).pop(),
    templateId: templateId || 'camera-only',
    data: { path, mediaType },
  };
}