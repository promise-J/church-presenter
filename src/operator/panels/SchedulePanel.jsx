import { useEffect, useState } from 'react';
import { useStore } from '../../core/state/store.js';
import { makeBlankItem } from '../../core/services/builders.js';
import { transposeKey } from '../../core/songs/transpose.js';
import ServiceItemModal from '../modals/ServiceItemModal.jsx';
import PromptModal from '../modals/PromptModal.jsx';
import './SchedulePanel.css';

export default function SchedulePanel() {
  const services = useStore(s => s.services || []);
  const setServices = useStore(s => s.setServices);
  const activeService = useStore(s => s.activeService);
  const setActiveService = useStore(s => s.setActiveService);
  const goLive = useStore(s => s.goLive);
  const advance = useStore(s => s.advance);
  const regress = useStore(s => s.regress);
  const activeItemIndex = useStore(s => s.activeItemIndex);
  const activeSlideIndex = useStore(s => s.activeSlideIndex);

  const [editing, setEditing] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [promptState, setPromptState] = useState(null);

  async function refreshList() {
    if (!window.api?.services?.list) {
      setServices([]);
      return;
    }
    try {
      const list = await window.api.services.list();
      setServices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('[Schedule] refreshList failed:', err);
      setServices([]);
    }
  }

  useEffect(() => { refreshList(); }, []);

  // ── New service via in-app prompt ──────────────────────────
  function newService() {
    setPromptState({
      title: 'Create Service',
      label: 'Service name',
      defaultValue: `Service ${new Date().toLocaleDateString()}`,
      onSave: async (name) => {
        setPromptState(null);
        try {
          const created = await window.api.services.create({ name, serviceDate: Date.now() });
          setActiveService({ ...created, items: [] });
          refreshList();
        } catch (err) {
          alert('Failed to create service: ' + err.message);
        }
      },
      onCancel: () => setPromptState(null),
    });
  }

  async function loadService(id) {
    const svc = await window.api.services.get(id);
    if (svc) setActiveService(svc);
    setShowPicker(false);
  }

  async function persist(nextItems) {
    if (!activeService) return;
    const updated = { ...activeService, items: nextItems };
    setActiveService(updated);
    try {
      await window.api.services.save(updated);
      refreshList();
    } catch (err) {
      console.error('[Schedule] save failed:', err);
    }
  }

  function addItem(item) {
    const items = [...(activeService?.items || []), item];
    persist(items);
  }

  function updateItem(index, item) {
    const items = [...(activeService?.items || [])];
    items[index] = item;
    persist(items);
  }

  function deleteItem(index) {
    const items = (activeService?.items || []).filter((_, i) => i !== index);
    persist(items);
    if (activeItemIndex >= items.length) {
      useStore.setState(s => { s.activeItemIndex = -1; });
    }
  }

  function moveItem(index, delta) {
    const items = [...(activeService?.items || [])];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    persist(items);
  }

  function addBlank() {
    addItem(makeBlankItem());
  }

  // ── Export / Import (fix: use window.api methods) ──────────
  async function exportService() {
    if (!activeService) return;
    try {
      const res = await window.api.services.export(activeService.id);
      if (res?.path) console.log('[Schedule] Exported to', res.path);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  async function importService() {
    try {
      const res = await window.api.services.import();
      if (res?.id) {
        await refreshList();
        const svc = await window.api.services.get(res.id);
        setActiveService(svc);
      }
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  }

  if (!activeService) {
    return (
      <div className="schedule-panel">
        <div className="schedule-empty">
          <p>No service loaded.</p>
          <button className="btn btn-primary" onClick={newService}>Create Service</button>
          <button className="btn" onClick={() => setShowPicker(v => !v)}>Open Existing</button>
          <button className="btn" onClick={importService}>Import Service File</button>
          {showPicker && (
            <div className="service-picker">
              {services.map(s => (
                <button key={s.id} className="service-pick" onClick={() => loadService(s.id)}>
                  <div className="service-pick-name">{s.name}</div>
                  <div className="service-pick-date">
                    {new Date(s.serviceDate).toLocaleDateString()}
                  </div>
                </button>
              ))}
              {services.length === 0 && <div className="empty">No services yet</div>}
            </div>
          )}
        </div>

        {promptState && (
          <PromptModal
            title={promptState.title}
            label={promptState.label}
            defaultValue={promptState.defaultValue}
            onSave={promptState.onSave}
            onCancel={promptState.onCancel}
          />
        )}
      </div>
    );
  }

  const items = activeService.items || [];

  return (
    <div className="schedule-panel">
      <div className="service-header">
        <div className="service-name">{activeService.name}</div>
        <div className="service-actions">
          <button className="btn-small" onClick={exportService}>Export</button>
          <button className="btn-small" onClick={importService}>Import</button>
          <button className="btn-small" onClick={() => { setActiveService(null); refreshList(); }}>Close</button>
          <button className="btn-small btn-primary" onClick={newService}>New</button>
        </div>
      </div>

      <div className="runner-bar">
        <button className="btn-small" onClick={regress}>← Prev</button>
        <button className="btn-small btn-primary" onClick={advance}>Next →</button>
      </div>

      <AltTranslationPicker />
      <TransposeControls />

      <div className="item-list">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`service-item ${activeItemIndex === i ? 'live' : ''}`}
            onClick={() => goLive(i, 0)}
          >
            <div className="item-order">{i + 1}</div>
            <div className="item-info">
              <div className="item-title">{item.title}</div>
              <div className="item-meta">
                {item.type}
                {item.data?.slides?.length > 0 && ` · ${item.data.slides.length} slide${item.data.slides.length !== 1 ? 's' : ''}`}
                {activeItemIndex === i && item.data?.slides?.length > 1 &&
                  ` · slide ${activeSlideIndex + 1}/${item.data.slides.length}`}
              </div>
            </div>
            <div className="item-actions" onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" title="Up" onClick={() => moveItem(i, -1)}>↑</button>
              <button className="icon-btn" title="Down" onClick={() => moveItem(i, 1)}>↓</button>
              <button className="icon-btn" title="Edit" onClick={() => setEditing({ mode: 'edit', index: i, item })}>✎</button>
              <button className="icon-btn danger" title="Delete" onClick={() => deleteItem(i)}>×</button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="empty">No items yet — add scripture, songs, or announcements.</div>
        )}
      </div>

      <div className="add-bar">
        <button className="btn-small" onClick={() => setEditing({ mode: 'create', item: { type: 'announcement' } })}>+ Announcement</button>
        <button className="btn-small" onClick={addBlank}>+ Blank</button>
        <button className="btn-small" onClick={() => setEditing({ mode: 'create', item: { type: 'note' } })}>+ Note</button>
      </div>

      {editing && (
        <ServiceItemModal
          mode={editing.mode}
          item={editing.item}
          onSave={(item) => {
            if (editing.mode === 'create') addItem(item);
            else updateItem(editing.index, item);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {promptState && (
        <PromptModal
          title={promptState.title}
          label={promptState.label}
          defaultValue={promptState.defaultValue}
          onSave={promptState.onSave}
          onCancel={promptState.onCancel}
        />
      )}
    </div>
  );
}

// ── Helper components ────────────────────────────────────────

function AltTranslationPicker() {
  const activeService = useStore(s => s.activeService);
  const activeItemIndex = useStore(s => s.activeItemIndex);
  const translations = useStore(s => s.translations || []);
  const goLive = useStore(s => s.goLive);

  if (!activeService || activeItemIndex < 0) return null;
  const item = activeService.items[activeItemIndex];
  if (!item || item.type !== 'scripture') return null;

  function setAlt(id) {
    const items = [...activeService.items];
    items[activeItemIndex] = { ...item, altTranslationId: id || null };
    const updated = { ...activeService, items };
    useStore.getState().setActiveService(updated);
    window.api.services.save(updated);
    goLive(activeItemIndex, 0);
  }

  return (
    <div className="alt-translation-picker">
      <span className="picker-label">2nd translation</span>
      <select
        value={item.altTranslationId || ''}
        onChange={(e) => setAlt(e.target.value || null)}
      >
        <option value="">— none —</option>
        {translations
          .filter(t => t.id !== item.data.translationId)
          .map(t => (
            <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
          ))}
      </select>
    </div>
  );
}

function TransposeControls() {
  const activeService = useStore(s => s.activeService);
  const activeItemIndex = useStore(s => s.activeItemIndex);
  const transpose = useStore(s => s.songTranspose || 0);
  const setTranspose = useStore(s => s.setSongTranspose);
  const resetTranspose = useStore(s => s.resetSongTranspose);
  const goLive = useStore(s => s.goLive);

  if (!activeService || activeItemIndex < 0) return null;
  const item = activeService.items[activeItemIndex];
  if (!item || item.type !== 'song') return null;

  const originalKey = item.data.songKey || '—';
  const currentKey = originalKey !== '—'
    ? transposeKey(originalKey, transpose)
    : '—';

  function change(delta) {
    setTranspose(transpose + delta);
    goLive(activeItemIndex, useStore.getState().activeSlideIndex);
  }

  return (
    <div className="transpose-bar">
      <span className="transpose-label">Transpose</span>
      <button className="btn-small" onClick={() => change(-1)}>−</button>
      <span className="transpose-value">
        {transpose > 0 ? '+' : ''}{transpose}
      </span>
      <button className="btn-small" onClick={() => change(1)}>+</button>
      {transpose !== 0 && (
        <button className="btn-small" onClick={() => { resetTranspose(); goLive(activeItemIndex, 0); }}>
          Reset
        </button>
      )}
      <span className="transpose-key">Key: {currentKey}</span>
    </div>
  );
}