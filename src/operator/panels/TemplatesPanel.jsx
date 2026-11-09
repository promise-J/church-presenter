import { useEffect, useState } from 'react';
import { useStore } from '../../core/state/store.js';
import './TemplatesPanel.css';

export default function TemplatesPanel() {
  const templates = useStore(s => s.templates);
  const setTemplates = useStore(s => s.setTemplates);
  const activeTemplateId = useStore(s => s.activeTemplateId);
  const setActiveTemplate = useStore(s => s.setActiveTemplate);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const list = await window.api.templates.list();
    setTemplates(list);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function duplicate(id) {
    await window.api.templates.duplicate(id);
    await refresh();
  }

  async function remove(id) {
    if (!confirm('Delete this template?')) return;
    try {
      await window.api.templates.delete(id);
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="templates-panel">
      <div className="panel-header">
        <span>Templates</span>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <div className="template-list">
          {templates.map(t => (
            <div
              key={t.id}
              className={`template-item ${activeTemplateId === t.id ? 'active' : ''}`}
            >
              <button
                className="template-select"
                onClick={() => setActiveTemplate(t.id)}
              >
                <div className="template-name">{t.name}</div>
                <div className="template-meta">
                  {t.category}{t.builtin ? ' · built-in' : ''}
                </div>
              </button>
              <div className="template-actions">
                <button className="icon-btn" title="Duplicate" onClick={() => duplicate(t.id)}>⎘</button>
                {!t.builtin && (
                  <button className="icon-btn danger" title="Delete" onClick={() => remove(t.id)}>×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}