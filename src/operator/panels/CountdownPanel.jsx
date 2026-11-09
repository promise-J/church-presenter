import { useEffect, useState } from 'react';
import { useStore } from '../../core/state/store.js';
import './CountdownPanel.css';

export default function CountdownPanel() {
  const countdown = useStore(s => s.countdown);
  const setCountdownDuration = useStore(s => s.setCountdownDuration);
  const setCountdownLabel = useStore(s => s.setCountdownLabel);
  const startCountdown = useStore(s => s.startCountdown);
  const pauseCountdown = useStore(s => s.pauseCountdown);
  const resetCountdown = useStore(s => s.resetCountdown);
  const setActiveTemplate = useStore(s => s.setActiveTemplate);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!countdown.running) return;
    const id = setInterval(() => forceTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [countdown.running]);

  const elapsed = countdown.running && countdown.startedAt ? Date.now() - countdown.startedAt : 0;
  const remaining = Math.max(0, countdown.remainingMs - elapsed);
  const totalSeconds = Math.ceil(remaining / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  function setMinutes(min) {
    const ms = Math.max(0, Number(min) || 0) * 60 * 1000;
    setCountdownDuration(ms);
  }

  return (
    <div className="countdown-panel">
      <div className="countdown-section">
        <div className="section-title">Countdown</div>
        <div className="countdown-display">
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </div>

        <div className="countdown-controls">
          {countdown.running ? (
            <button className="btn" onClick={pauseCountdown}>Pause</button>
          ) : (
            <button className="btn btn-primary" onClick={startCountdown}>Start</button>
          )}
          <button className="btn" onClick={resetCountdown}>Reset</button>
        </div>
      </div>

      <div className="countdown-section">
        <div className="section-title">Duration</div>
        <div className="duration-presets">
          {[1, 2, 3, 5, 10, 15].map(min => (
            <button
              key={min}
              className={`preset-btn ${countdown.durationMs === min * 60000 ? 'active' : ''}`}
              onClick={() => setMinutes(min)}
            >{min} min</button>
          ))}
        </div>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="Custom minutes"
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>

      <div className="countdown-section">
        <div className="section-title">Label</div>
        <input
          type="text"
          value={countdown.label}
          onChange={(e) => setCountdownLabel(e.target.value)}
          placeholder="Service starts in"
        />
      </div>

      <div className="countdown-section">
        <button className="btn btn-primary" onClick={() => setActiveTemplate('countdown')}>
          Show Countdown on Output
        </button>
      </div>
    </div>
  );
}