import { useState } from 'react';
import './Modal.css';

export default function PromptModal({ title, label, defaultValue = '', onSave, onCancel }) {
  const [value, setValue] = useState(defaultValue);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="icon-btn" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          {label && <label className="field"><span>{label}</span>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          </label>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>OK</button>
        </div>
      </div>
    </div>
  );
}