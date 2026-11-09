import { broadcast } from '../state/sync.js';
import { useStore } from '../state/store.js';
import { transposeLyrics } from '../songs/transpose.js';

/**
 * Push the given item + slide index to the output.
 */
export function pushItemToOutput(item, slideIndex = 0) {
  if (!item) return;

  // Always switch template first (if the item has one)
  if (item.templateId) {
    useStore.getState().setActiveTemplate(item.templateId);
  }

  switch (item.type) {
    case 'scripture': {
      const d = item.data;
      useStore.getState().setActivePassage(
        { bookId: d.bookId, chapter: d.chapter, verseStart: d.verseStart, verseEnd: d.verseEnd },
        d.verses,
        item.title
      );
      // Second translation
      if (item.altTranslationId) {
        window.api.bible.passage(
          item.altTranslationId, d.bookId, d.chapter, d.verseStart, d.verseEnd
        ).then(passage => {
          useStore.getState().setAltVerses(passage.verses || []);
        });
      } else {
        useStore.getState().setAltVerses([]);
      }
      break;
    }

    case 'song': {
      const slides = item.data.slides || [];
      const slide = slides[slideIndex];
      if (slide) {
        const verses = [{ verse: 1, text: slide.text }];
        useStore.getState().setActivePassage(
          { bookId: null, chapter: null },
          verses,
          item.title
        );
      }
      break;
    }

    case 'song': {
        const slides = item.data.slides || [];
        const slide = slides[slideIndex];
        const transpose = useStore.getState().songTranspose || 0;
        if (slide) {
          const text = transpose ? transposeLyrics(slide.text, transpose) : slide.text;
          const verses = [{ verse: 1, text }];
          useStore.getState().setActivePassage(
            { bookId: null, chapter: null },
            verses,
            item.title
          );
        }
        break;
      }

    case 'media': {
        useStore.getState().setActiveMedia({
          path: item.data.path,
          mediaType: item.data.mediaType,
          name: item.title,
        });
        useStore.getState().setActivePassage(null, [], item.title);
        break;
      }

    case 'announcement': {
      const verses = (item.data.text || '').split('\n').filter(Boolean)
        .map((line, i) => ({ verse: i + 1, text: line }));
      useStore.getState().setActivePassage(
        { bookId: null, chapter: null },
        verses,
        item.title
      );
      break;
    }

    case 'media': {
      // Media will be handled in Module D (video/image zones).
      // For now: clear scripture and set title.
      useStore.getState().setActivePassage(
        { bookId: null, chapter: null },
        [],
        item.title
      );
      break;
    }

    case 'blank': {
      useStore.setState(s => { s.isBlank = true; });
      broadcast('output:blank', { value: true });
      break;
    }

    case 'note': {
      // Notes are operator-only; don't touch output
      return;
    }
  }
}

export function clearOutput() {
  useStore.getState().setActivePassage(null, [], '');
  useStore.getState().setAltVerses([]);
}