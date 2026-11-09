import { useState } from 'react';
import { splitLyrics } from '../../core/songs/slideSplitter.js';
import './Modal.css';

export default function SongEditorModal({ mode, song, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => ({
    id: song?.id || null,
    title: song?.title || '',
    author: song?.author || '',
    songKey: song?.songKey || '',
    tempo: song?.tempo || '',
    ccliNumber: song?.ccliNumber || '',
    lyrics: song?.lyrics || { raw: '' },
  }));

  const [showPreview, setShowPreview] = useState(false);

  function update(patch) { setDraft(d => ({ ...d, ...patch })); }

  function save() {
    if (!draft.title.trim()) { alert('Title is required'); return; }
    onSave({
      ...draft,
      tempo: draft.tempo ? Number(draft.tempo) : null,
    });
  }

  const slides = splitLyrics(draft.lyrics.raw || '');

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{mode === 'create' ? 'New Song' : 'Edit Song'}</span>
          <button className="icon-btn" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                autoFocus
              />
            </label>
            <label className="field">
              <span>Author</span>
              <input value={draft.author} onChange={(e) => update({ author: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Key</span>
              <input value={draft.songKey} onChange={(e) => update({ songKey: e.target.value })} placeholder="G, Am…" />
            </label>
            <label className="field">
              <span>Tempo</span>
              <input
                type="number"
                value={draft.tempo}
                onChange={(e) => update({ tempo: e.target.value })}
                placeholder="BPM"
              />
            </label>
            <label className="field">
              <span>CCLI</span>
              <input value={draft.ccliNumber} onChange={(e) => update({ ccliNumber: e.target.value })} />
            </label>
          </div>

          <label className="field">
            <span>Lyrics (blank line = new slide)</span>
            <textarea
              rows={12}
              value={draft.lyrics.raw}
              onChange={(e) => update({ lyrics: { ...draft.lyrics, raw: e.target.value } })}
              placeholder={"Amazing grace how sweet the sound\nThat saved a wretch like me\n\nI once was lost but now am found\nWas blind but now I see"}
              style={{ fontFamily: 'inherit' }}
            />
          </label>

          <div className="slide-count">
            {slides.length} slide{slides.length !== 1 ? 's' : ''} detected
            {slides.length > 0 && (
              <button className="link-btn" onClick={() => setShowPreview(v => !v)}>
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            )}
          </div>

          {showPreview && (
            <div className="song-slides">
              {slides.map((slide, i) => (
                <div key={i} className="song-slide">
                  <div className="song-slide-num">Slide {i + 1}</div>
                  <pre className="song-slide-text">{slide.text}</pre>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}