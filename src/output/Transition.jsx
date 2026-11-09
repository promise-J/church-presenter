import { useEffect, useRef, useState } from 'react';
import { useStore } from '../core/state/store.js';

export default function Transition({ children }) {
  const contentKey = useStore(s => s.contentKey);
  const type = useStore(s => s.transitionType);
  const duration = useStore(s => s.transitionDuration);

  const [displayed, setDisplayed] = useState(children);
  const [entering, setEntering] = useState(false);
  const prevKey = useRef(contentKey);

  useEffect(() => {
    if (contentKey === prevKey.current) {
      // Content changed without a key bump (e.g. internal update)
      setDisplayed(children);
      return;
    }
    prevKey.current = contentKey;

    if (type === 'none' || duration <= 0) {
      setDisplayed(children);
      return;
    }

    // Fade-out current, then swap and fade-in
    setEntering(false);
    const swapTimer = setTimeout(() => {
      setDisplayed(children);
      setEntering(true);
      const finishTimer = setTimeout(() => setEntering(false), duration);
      return () => clearTimeout(finishTimer);
    }, duration / 2);

    return () => clearTimeout(swapTimer);
  }, [contentKey, children, type, duration]);

  // Keep displayed content in sync when key didn't change but content did
  useEffect(() => {
    if (contentKey === prevKey.current) setDisplayed(children);
  }, [children, contentKey]);

  const transitionClass = `transition transition-${type} ${entering ? 'entering' : 'idle'}`;
  const style = { transitionDuration: `${duration}ms` };

  return (
    <div className={transitionClass} style={style}>
      {displayed}
    </div>
  );
}