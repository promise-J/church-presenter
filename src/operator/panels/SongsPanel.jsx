import { useEffect, useState } from 'react';
import { useStore } from '../../core/state/store.js';
import { splitLyrics } from '../../core/songs/slideSplitter.js';
import { makeSongItem } from '../../core/services/builders.js';
import SongEditorModal from '../modals/SongEditorModal.jsx';
import './SongsPanel.css';

export default function SongsPanel() {
  const activeService = useStore(s => s.activeService);
  const [songs, setSongs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [previewSong, setPreviewSong] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function refresh() {
    if (!window.api?.songs?.list) {
      setSongs([]);
      return;
    }
    try {
      const list = await window.api.songs.list();
      setSongs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('[Songs] refresh failed:', err);
      setSongs([]);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function openSong(songStub) {
    try {
      const full = await window.api.songs.get(songStub.id);
      setPreviewSong(full);
    } catch (err) {
      alert('Failed to open song: ' + err.message);
    }
  }

  async function saveSong(payload) {
    try {
      if (payload.id) {
        await window.api.songs.save(payload);
      } else {
        await window.api.songs.create(payload);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      alert('Failed to save song: ' + err.message);
    }
  }

  async function deleteSong(id) {
    try {
      await window.api.songs.delete(id);
      refresh();
    } catch (err) {
      alert('Failed to delete song: ' + err.message);
    }
  }

  function addToService(song) {
    const svc = useStore.getState().activeService;
    if (!svc) {
      alert('No active service. Create one in the Schedule panel first.');
      return;
    }
    const item = makeSongItem({ song });
    const items = [...(svc.items || []), item];
    const updated = { ...svc, items };
    useStore.getState().setActiveService(updated);
    window.api.services.save(updated);
    setPreviewSong(null);
  }

  async function exportSong(songId) {
    try {
      const res = await window.api.songs.export(songId);
      if (res?.path) console.log('[Songs] Exported to', res.path);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  const filteredSongs = songs.filter(s =>
    !searchQuery ||
    s.title.toLowerCase().includes(searchQuery) ||
    (s.author || '').toLowerCase().includes(searchQuery)
  );

  return (
    <div className="songs-panel">
      <div className="panel-header-row">
        <span className="panel-title">Songs</span>
        <button className="btn-small" onClick={() => setEditing({ mode: 'create' })}>+ New Song</button>
      </div>

      <input
        className="song-search"
        type="text"
        placeholder="Search songs…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
      />

      <div className="song-list">
        {filteredSongs.map(s => (
          <div key={s.id} className="song-item">
            <button className="song-select" onClick={() => openSong(s)}>
              <div className="song-title">{s.title}</div>
              <div className="song-meta">
                {s.author || 'Unknown'}
                {s.songKey ? ` · ${s.songKey}` : ''}
              </div>
            </button>
            <button className="icon-btn danger" onClick={() => deleteSong(s.id)}>×</button>
          </div>
        ))}
        {songs.length === 0 && <div className="empty">No songs yet</div>}
        {songs.length > 0 && filteredSongs.length === 0 && (
          <div className="empty">No songs match "{searchQuery}"</div>
        )}
      </div>

      {editing && (
        <SongEditorModal
          mode={editing.mode}
          song={editing.song}
          onSave={saveSong}
          onCancel={() => setEditing(null)}
        />
      )}

      {previewSong && (
        <SongPreview
          song={previewSong}
          onClose={() => setPreviewSong(null)}
          onEdit={() => { setEditing({ mode: 'edit', song: previewSong }); setPreviewSong(null); }}
          onAdd={() => addToService(previewSong)}
          onExport={() => exportSong(previewSong.id)}
        />
      )}
    </div>
  );
}

// ── Preview modal ────────────────────────────────────────────
function SongPreview({ song, onClose, onEdit, onAdd, onExport }) {
  const slides = splitLyrics(song.lyrics?.raw || '');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{song.title}</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="song-preview-meta">
            {song.author && <span>{song.author}</span>}
            {song.songKey && <span>Key: {song.songKey}</span>}
            <span>{slides.length} slide{slides.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="song-slides">
            {slides.map((slide, i) => (
              <div key={i} className="song-slide">
                <div className="song-slide-num">
                  Slide {i + 1}{slide.label ? ` — ${slide.label}` : ''}
                </div>
                <pre className="song-slide-text">{slide.text}</pre>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onExport}>Export</button>
          <button className="btn" onClick={onEdit}>Edit</button>
          <button className="btn btn-primary" onClick={onAdd}>Add to Service</button>
        </div>
      </div>
    </div>
  );
}