export default function NotesZone({ text, style }) {
    return (
      <div className="zone-notes" style={style}>
        {text ? text.split('\n').map((line, i) => (
          <p key={i} style={{ marginBottom: '0.6em' }}>{line}</p>
        )) : (
          <div style={{ opacity: 0.35, fontStyle: 'italic' }}>
            No notes yet — type in the Notes field in the operator panel.
          </div>
        )}
      </div>
    );
  }