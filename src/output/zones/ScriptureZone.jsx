export default function ScriptureZone({ verses, style, variant = 'primary' }) {
    if (!verses || verses.length === 0) return null;
    return (
      <div className="zone-scripture" style={style}>
        {verses.map(v => (
          <p key={`${variant}-${v.verse}`} style={{ marginBottom: '0.5em' }}>
            <sup style={{
              color: '#8577ff',
              fontWeight: 600,
              fontSize: '0.55em',
              marginRight: '0.5em',
              verticalAlign: 'super',
            }}>{v.verse}</sup>
            {v.text}
          </p>
        ))}
      </div>
    );
  }