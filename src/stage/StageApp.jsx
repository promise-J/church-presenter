import { useStore } from '../core/state/store.js';
import { subscribe } from '../core/state/sync.js';
import { useEffect } from 'react';

export default function StageApp() {
  const verses = useStore(s => s.activeVerses);
  const label = useStore(s => s.activeReferenceLabel);

  useEffect(() => {
    const unsub = subscribe('state:passage-changed', (payload) => {
      useStore.setState(s => {
        s.activeVerses = payload.verses || [];
        s.activeReferenceLabel = payload.label || '';
      });
    });
    return () => unsub && unsub();
  }, []);

  return (
    <div style={{ padding: 60, background: '#0a0a14', color: '#fff', minHeight: '100vh' }}>
      <div style={{ fontSize: 24, color: '#b8b8d0' }}>{label}</div>
      <div style={{ fontSize: 36, lineHeight: 1.4, marginTop: 20 }}>
        {verses.map(v => (
          <p key={v.verse} style={{ marginBottom: 16 }}>
            <sup style={{ color: '#8577ff', marginRight: 8 }}>{v.verse}</sup>{v.text}
          </p>
        ))}
      </div>
    </div>
  );
}