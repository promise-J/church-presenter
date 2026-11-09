import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../core/state/store.js';
import { parseReference } from '../../core/bible/parser.js';
import { BOOKS } from '../../core/bible/books.js';
import { makeScriptureItem } from '../../core/services/builders.js';
import './BiblePanel.css';

export default function BiblePanel() {
  const translations = useStore(s => s.translations || []);
  const activeTranslation = useStore(s => s.activeTranslation);
  const setActiveTranslation = useStore(s => s.setActiveTranslation);
  const books = useStore(s => s.books || []);

  const [referenceInput, setReferenceInput] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterVerses, setChapterVerses] = useState([]);
  const [selectedVerses, setSelectedVerses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mode, setMode] = useState('browse');
  const searchTimer = useRef(null);

  const bookList = books.length > 0
    ? books
    : BOOKS.map(b => ({ book_id: b.id, book_name: b.name, book_order: b.order }));

  // Load chapter when book or chapter changes
  useEffect(() => {
    if (!selectedBook || !chapter || !activeTranslation) return;
    (async () => {
      try {
        const result = await window.api.bible.chapter(
          activeTranslation,
          selectedBook.book_id,
          chapter
        );
        setChapterVerses(result.verses || []);
        setSelectedVerses([]);
      } catch (err) {
        console.error('Failed to load chapter:', err);
      }
    })();
  }, [selectedBook, chapter, activeTranslation]);

  // Debounced search
  useEffect(() => {
    if (mode !== 'search') return;
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await window.api.bible.search(activeTranslation, searchQuery, 100);
        setSearchResults(results || []);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, activeTranslation, mode]);

  function handleReferenceSubmit(e) {
    e.preventDefault();
    const parsed = parseReference(referenceInput);
    if (!parsed) { alert('Could not parse reference: ' + referenceInput); return; }
    const book = bookList.find(b => b.book_id === parsed.bookId);
    if (!book) { alert('Book not found'); return; }
    setSelectedBook(book);
    setChapter(parsed.chapter);
    setMode('browse');
  }

  function toggleVerse(v) {
    setSelectedVerses(prev => {
      const exists = prev.find(x => x.verse === v.verse);
      if (exists) return prev.filter(x => x.verse !== v.verse);
      return [...prev, v].sort((a, b) => a.verse - b.verse);
    });
  }

  function projectSelected() {
    if (!selectedBook || !chapterVerses.length) return;

    // If nothing is selected, project the whole chapter
    const verses = selectedVerses.length > 0 ? selectedVerses : chapterVerses;
    const first = verses[0].verse;
    const last = verses[verses.length - 1].verse;

    const label = selectedVerses.length === 0
      ? `${selectedBook.book_name} ${chapter}`
      : (first === last
        ? `${selectedBook.book_name} ${chapter}:${first}`
        : `${selectedBook.book_name} ${chapter}:${first}-${last}`);

    console.log('[BiblePanel] projectSelected:', {
      count: verses.length,
      firstVerse: verses[0],
      label,
    });

    useStore.getState().setActivePassage(
      { bookId: selectedBook.book_id, chapter, verseStart: first, verseEnd: last },
      verses,
      label
    );
  }

  function addToService() {
    const svc = useStore.getState().activeService;
    if (!svc) {
      alert('No active service. Create one in the Schedule panel first.');
      return;
    }
    if (!selectedBook || !chapterVerses.length) {
      alert('Pick a chapter first.');
      return;
    }
    const verses = selectedVerses.length > 0 ? selectedVerses : chapterVerses;
    const item = makeScriptureItem({
      translationId: activeTranslation,
      bookId: selectedBook.book_id,
      bookName: selectedBook.book_name,
      chapter,
      verses,
    });
    const items = [...(svc.items || []), item];
    const updated = { ...svc, items };
    useStore.getState().setActiveService(updated);
    window.api.services.save(updated);
  }

  return (
    <div className="bible-panel">
      <div className="bible-header">
        <select
          className="translation-select"
          value={activeTranslation || ''}
          onChange={(e) => setActiveTranslation(e.target.value)}
        >
          {translations.map(t => (
            <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
          ))}
        </select>
        <div className="mode-tabs">
          <button className={mode === 'browse' ? 'tab active' : 'tab'} onClick={() => setMode('browse')}>Browse</button>
          <button className={mode === 'search' ? 'tab active' : 'tab'} onClick={() => setMode('search')}>Search</button>
        </div>
      </div>

      {mode === 'browse' && (
        <>
          <form className="reference-input" onSubmit={handleReferenceSubmit}>
            <input
              type="text"
              placeholder="John 3:16, Ps 23, rom 8:28"
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
            />
            <button type="submit" className="btn-small">Go</button>
          </form>

          {!selectedBook && (
            <div className="book-grid">
              {bookList.map(b => (
                <button key={b.book_id} className="book-btn" onClick={() => setSelectedBook(b)}>
                  {b.book_name}
                </button>
              ))}
            </div>
          )}

          {selectedBook && !chapter && (
            <ChapterPicker
              book={selectedBook}
              onPick={(c) => setChapter(c)}
              onBack={() => setSelectedBook(null)}
            />
          )}

          {selectedBook && chapter && (
            <ChapterView
              book={selectedBook}
              chapter={chapter}
              verses={chapterVerses}
              selectedVerses={selectedVerses}
              onToggleVerse={toggleVerse}
              onBack={() => setChapter(null)}
              onProject={projectSelected}
              onAddToService={addToService}
            />
          )}
        </>
      )}

      {mode === 'search' && (
        <>
          <input
            className="search-input"
            type="text"
            placeholder="Search: forgiveness, love, grace…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <div className="search-results">
            {searchResults.map((r, i) => (
              <button
                key={i}
                className="search-result"
                onClick={() => {
                  const book = bookList.find(b => b.book_id === r.book_id);
                  if (book) {
                    setSelectedBook(book);
                    setChapter(r.chapter);
                    setMode('browse');
                  }
                }}
              >
                <div className="search-ref">{r.book_name} {r.chapter}:{r.verse}</div>
                <div className="search-text" dangerouslySetInnerHTML={{ __html: r.snippet || r.text }} />
              </button>
            ))}
            {searchResults.length === 0 && searchQuery && <div className="empty">No results</div>}
          </div>
        </>
      )}
    </div>
  );
}

function ChapterPicker({ book, onPick, onBack }) {
  const chapters = Array.from({ length: 150 }, (_, i) => i + 1);
  return (
    <div className="chapter-picker">
      <div className="panel-subheader">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span>{book.book_name}</span>
      </div>
      <div className="chapter-grid">
        {chapters.map(c => (
          <button key={c} className="chapter-btn" onClick={() => onPick(c)}>{c}</button>
        ))}
      </div>
    </div>
  );
}

function ChapterView({
  book,
  chapter,
  verses,
  selectedVerses,
  onToggleVerse,
  onBack,
  onProject,
  onAddToService,
}) {
  return (
    <div className="chapter-view">
      <div className="panel-subheader">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span>{book.book_name} {chapter}</span>
      </div>

      <div className="chapter-actions">
        <button className="btn-small btn-primary" onClick={onProject}>
          {selectedVerses.length > 0
            ? `Project ${selectedVerses.length} verse${selectedVerses.length !== 1 ? 's' : ''}`
            : 'Project whole chapter'}
        </button>
        <button className="btn-small" onClick={onAddToService}>
          + Add to Service
        </button>
      </div>

      {selectedVerses.length > 0 && (
        <div className="selection-hint">
          Selected: verse{selectedVerses.length !== 1 ? 's' : ''}{' '}
          {selectedVerses.map(v => v.verse).join(', ')}
        </div>
      )}

      <div className="verse-list">
        {verses.length === 0 && (
          <div className="empty">Loading verses…</div>
        )}

        {verses.map(v => {
          const isSelected = selectedVerses.some(x => x.verse === v.verse);
          return (
            <div
              key={v.verse}
              role="button"
              tabIndex={0}
              className={`verse-row ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleVerse(v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleVerse(v);
                }
              }}
            >
              <span className="verse-num">{v.verse}</span>
              <span className="verse-text">{v.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}