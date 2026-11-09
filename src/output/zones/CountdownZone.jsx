import { useEffect, useState } from 'react';
import { useStore } from '../../core/state/store.js';

export default function CountdownZone({ style }) {
  const countdown = useStore(s => s.countdown);
  const [, forceTick] = useState(0);

  // Local timer that forces re-renders while running
  useEffect(() => {
    if (!countdown.running) return;
    const id = setInterval(() => forceTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, [countdown.running]);

  const elapsed = countdown.running && countdown.startedAt
    ? Date.now() - countdown.startedAt
    : 0;

  const remaining = Math.max(0, countdown.remainingMs - elapsed);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isFinished = remaining <= 0 && countdown.durationMs > 0;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
      color: isFinished ? '#e74c3c' : (style?.color || '#fff'),
    }}>
      <div>{display}</div>
      {countdown.showLabel && countdown.label && (
        <div style={{
          fontSize: '0.2em',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          opacity: 0.6,
          marginTop: '0.3em',
        }}>{countdown.label}</div>
      )}
    </div>
  );
}