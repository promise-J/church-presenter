import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useStore } from '../../core/state/store.js';
import './Modal.css';

export default function ServiceItemModal({ mode, item, onSave, onCancel }) {
  const templates = useStore(s => s.templates);
  const [draft, setDraft] = useState(() => ({
    id: item.id || `itm_${nanoid(10)}`,
    type: item.type || 'announcement',
    title: item.title || '',
    templateId: item.templateId || 'scripture-full',
    altTranslationId: item.altTranslationId || null,
    data: item.data || {},
  }));

  function update(patch) {
    setDraft(d => ({ ...d, ...patch }));
  }

  function updateData(patch) {
    setDraft(d => ({ ...d, data: { ...d.data, ...patch } }));
  }

  function save() {
    if (!draft.title) {
      alert('Give this item a title');
      return;
    }
    onSave(draft);
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{mode === 'create' ? 'Add Item' : 'Edit Item'}</span>
          <button className="icon-btn" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Display name in service list"
            />
          </label>

          {draft.type !== 'note' && draft.type !== 'blank' && (
            <label className="field">
              <span>Template</span>
              <select
                value={draft.templateId}
                onChange={(e) => update({ templateId: e.target.value })}
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          )}

          {draft.type === 'announcement' && (
            <label className="field">
              <span>Text</span>
              <textarea
                rows={6}
                value={draft.data.text || ''}
                onChange={(e) => updateData({ text: e.target.value })}
                placeholder="One line per projected line"
              />
            </label>
          )}

          {draft.type === 'note' && (
            <label className="field">
              <span>Note (operator only — not projected)</span>
              <textarea
                rows={4}
                value={draft.data.text || ''}
                onChange={(e) => updateData({ text: e.target.value })}
              />
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            {mode === 'create' ? 'Add to Service' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}