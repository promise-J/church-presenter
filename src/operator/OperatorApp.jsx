import { useEffect, useState } from 'react';
import { useStore } from '../core/state/store.js';
import { broadcast, subscribe } from '../core/state/sync.js';
import BiblePanel from './panels/BiblePanel.jsx';
import SongsPanel from './panels/SongsPanel.jsx';
import MediaPanel from './panels/MediaPanel.jsx';
import CameraPanel from './panels/CameraPanel.jsx';
import CountdownPanel from './panels/CountdownPanel.jsx';
import LivePreview from './panels/LivePreview.jsx';
import TemplatesPanel from './panels/TemplatesPanel.jsx';
import SchedulePanel from './panels/SchedulePanel.jsx';
import RemotePanel from './panels/RemotePanel.jsx';
import './OperatorApp.css';

export default function OperatorApp() {
  const outputWindowOpen = useStore(s => s.outputWindowOpen);
  const setOutputWindowOpen = useStore(s => s.setOutputWindowOpen);
  const toggleBlank = useStore(s => s.toggleBlank);
  const isBlank = useStore(s => s.isBlank);
  const setBlackout = useStore(s => s.setBlackout);
  const notesText = useStore(s => s.notesText);
  const setNotesText = useStore(s => s.setNotesText);
  const transitionType = useStore(s => s.transitionType);
  const setTransitionType = useStore(s => s.setTransitionType);
  const transitionDuration = useStore(s => s.transitionDuration);
  const setTransitionDuration = useStore(s => s.setTransitionDuration);

  const [leftTab, setLeftTab] = useState('bible');
  const [rightTab, setRightTab] = useState('schedule');
  const [displays, setDisplays] = useState([]);
  const [diag, setDiag] = useState({});
  const outputDisplayId = useStore(s => s.settings.outputDisplayId);
  const updateSettings = useStore(s => s.updateSettings);

  // ── Initial load ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        console.log('[operator] Loading translations…');
        const translations = await window.api.bible.translations();
        console.log('[operator] Translations loaded:', translations.length);
        useStore.getState().setTranslations(translations);
        if (translations.length > 0 && !translations.find(t => t.id === useStore.getState().activeTranslation)) {
          useStore.getState().setActiveTranslation(translations[0].id);
        }

        console.log('[operator] Loading templates…');
        const templates = await window.api.templates.list();
        console.log('[operator] Templates loaded:', templates.length);
        useStore.getState().setTemplates(templates);
        broadcast('output:template-list', { templates });
        console.log('[operator] Broadcast template list');

        const displaysList = await window.api.window.getDisplays();
        setDisplays(displaysList);

        setDiag({
          translationsCount: translations.length,
          templatesCount: templates.length,
          displaysCount: displaysList.length,
        });
      } catch (err) {
        console.error('[operator] init failed:', err);
      }
    })();
  }, []);

  // ── Books on translation change ────────────────────────────
  const activeTranslation = useStore(s => s.activeTranslation);
  useEffect(() => {
    if (!activeTranslation) return;
    (async () => {
      try {
        const books = await window.api.bible.books(activeTranslation);
        useStore.getState().setBooks(books);
        console.log('[operator] Books loaded:', books.length);
      } catch (err) {
        console.error('[operator] failed to load books:', err);
      }
    })();
  }, [activeTranslation]);

  // ── IPC listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!window.api?.output?.on) return;

    const off1 = window.api.output.on('output:blank-toggle', () => toggleBlank());
    const off2 = window.api.output.on('output:emergency-black', () => setBlackout(true));
    const off3 = window.api.output.on('output:emergency-clear', () => {
      useStore.setState(s => { s.isBlackout = false; });
    });
    const off4 = window.api.output.on('displays:changed', async () => {
      const list = await window.api.window.getDisplays();
      setDisplays(list);
    });
    const off5 = window.api.output.on('operator:rebroadcast-state', () => {
      console.log('[operator] Rebroadcast requested');
      const s = useStore.getState();
      broadcast('output:template-list', { templates: s.templates });
      broadcast('output:set-template', { id: s.activeTemplateId });
      broadcast('output:render-passage', {
        ref: s.activeReference,
        verses: s.activeVerses,
        label: s.activeReferenceLabel,
      });
      broadcast('output:notes-text', { text: s.notesText });
      broadcast('output:alt-verses', { verses: s.altVerses });
      broadcast('output:set-media', { media: s.activeMedia });
      broadcast('output:countdown-state', { ...s.countdown });
      broadcast('output:set-transition-type', { value: s.transitionType });
      broadcast('output:set-transition-duration', { value: s.transitionDuration });
    });

    return () => {
      off1?.(); off2?.(); off3?.(); off4?.(); off5?.();
    };
  }, [toggleBlank, setBlackout]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        useStore.getState().advance();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        useStore.getState().regress();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Window controls ────────────────────────────────────────
  async function openOutput() {
    try {
      await window.api.window.createOutput(outputDisplayId);
      setOutputWindowOpen(true);
    } catch (err) {
      console.error('[operator] createOutput failed:', err);
    }
  }

  async function closeOutput() {
    try {
      await window.api.window.destroyOutput();
      setOutputWindowOpen(false);
    } catch (err) {
      console.error('[operator] destroyOutput failed:', err);
    }
  }

  // ── Test button: send sample passage to output ─────────────
  function testBroadcast() {
    const sampleVerses = [
      { verse: 1, text: 'In the beginning God created the heaven and the earth.' },
      { verse: 2, text: 'And the earth was without form, and void; and darkness was upon the face of the deep.' },
    ];
    console.log('[operator] Sending test passage broadcast');
    useStore.getState().setActivePassage(
      { bookId: 'GEN', chapter: 1, verseStart: 1, verseEnd: 2 },
      sampleVerses,
      'Genesis 1:1-2 (TEST)'
    );
  }

  return (
    <div className="operator-app">
      <header className="operator-header">
        <div className="brand">Church Presenter</div>

        <div className="header-actions">
          <div className="transition-controls">
            <select
              value={transitionType}
              onChange={(e) => setTransitionType(e.target.value)}
              title="Transition type"
            >
              <option value="none">No transition</option>
              <option value="fade">Fade</option>
              <option value="slide-up">Slide up</option>
              <option value="zoom">Zoom</option>
            </select>
            <input
              type="number"
              min="0"
              max="2000"
              step="50"
              value={transitionDuration}
              onChange={(e) => setTransitionDuration(Number(e.target.value))}
              style={{ width: 70 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>ms</span>
          </div>

          <select
            value={outputDisplayId ?? ''}
            onChange={(e) => updateSettings({
              outputDisplayId: e.target.value === '' ? null : Number(e.target.value),
            })}
            title="Output display"
            style={{ fontSize: 12, padding: '6px 8px' }}
          >
            <option value="">Auto (2nd display)</option>
            {displays.map(d => (
              <option key={d.id} value={d.id}>
                {d.label} — {d.bounds.width}×{d.bounds.height}{d.primary ? ' (primary)' : ''}
              </option>
            ))}
          </select>

          <button className="btn" onClick={testBroadcast} title="Send a test passage">
            Test Broadcast
          </button>

          <button
            className={`btn ${isBlank ? 'btn-active' : ''}`}
            onClick={toggleBlank}
            title="Ctrl+Shift+B"
          >{isBlank ? 'Unblank' : 'Blank'}</button>

          {outputWindowOpen ? (
            <button className="btn btn-danger" onClick={closeOutput}>Close Output</button>
          ) : (
            <button className="btn btn-primary" onClick={openOutput}>Open Output</button>
          )}
        </div>
      </header>

      <main className="operator-body">
        <aside className="left-panel">
          <div className="panel-tabs">
            <button className={leftTab === 'bible' ? 'tab active' : 'tab'} onClick={() => setLeftTab('bible')}>Bible</button>
            <button className={leftTab === 'songs' ? 'tab active' : 'tab'} onClick={() => setLeftTab('songs')}>Songs</button>
            <button className={leftTab === 'media' ? 'tab active' : 'tab'} onClick={() => setLeftTab('media')}>Media</button>
            <button className={leftTab === 'camera' ? 'tab active' : 'tab'} onClick={() => setLeftTab('camera')}>Camera</button>
            <button className={leftTab === 'countdown' ? 'tab active' : 'tab'} onClick={() => setLeftTab('countdown')}>Timer</button>
          </div>
          {leftTab === 'bible' && <BiblePanel />}
          {leftTab === 'songs' && <SongsPanel />}
          {leftTab === 'media' && <MediaPanel />}
          {leftTab === 'camera' && <CameraPanel />}
          {leftTab === 'countdown' && <CountdownPanel />}
        </aside>

        <section className="center-panel">
          <LivePreview />
          <div className="notes-editor">
            <div className="notes-label">Notes (shown in Notes zone)</div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Type notes for the congregation here…"
              rows={4}
            />
          </div>
        </section>

        <aside className="right-panel">
          <div className="panel-tabs">
            <button className={rightTab === 'schedule' ? 'tab active' : 'tab'} onClick={() => setRightTab('schedule')}>Schedule</button>
            <button className={rightTab === 'templates' ? 'tab active' : 'tab'} onClick={() => setRightTab('templates')}>Templates</button>
            <button className={rightTab === 'remote' ? 'tab active' : 'tab'} onClick={() => setRightTab('remote')}>Remote</button>
          </div>
          {rightTab === 'schedule' && <SchedulePanel />}
          {rightTab === 'templates' && <TemplatesPanel />}
          {rightTab === 'remote' && <RemotePanel />}
        </aside>
      </main>

      {/* ── Diagnostic footer (remove once fixed) ──────────── */}
      <div className="diag-bar">
        <span>Templates: {diag.templatesCount ?? '?'}</span>
        <span>Translations: {diag.translationsCount ?? '?'}</span>
        <span>Books: {useStore(s => s.books?.length ?? 0)}</span>
        <span>Active template: {useStore(s => s.activeTemplateId)}</span>
        <span>Live verses: {useStore(s => s.activeVerses?.length ?? 0)}</span>
        <span>Output: {outputWindowOpen ? 'open' : 'closed'}</span>
      </div>
    </div>
  );
}