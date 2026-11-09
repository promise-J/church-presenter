import { useEffect, useRef } from 'react';
import { useStore } from '../../core/state/store.js';

export default function MediaZone({ style }) {
  const media = useStore(s => s.activeMedia);
  const loop = useStore(s => s.mediaLoop);
  const muted = useStore(s => s.mediaMuted);
  const videoRef = useRef(null);

  const src = `media://local/${encodeURIComponent(media.path)}`;

  useEffect(() => {
    if (media?.mediaType === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [media]);

  if (!media) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#333', fontSize: 20,
      }}>No media</div>
    );
  }

  if (media.mediaType === 'image') {
    return (
      <img
        src={src}
        // src={`file://${media.path.replace(/\\/g, '/')}`}
        alt=""
        style={{
          width: '100%', height: '100%',
          objectFit: style?.objectFit || 'contain',
          display: 'block',
        }}
      />
    );
  }

  if (media.mediaType === 'video') {
    return (
      <video
        ref={videoRef}
        src={src}
        // src={`file://${media.path.replace(/\\/g, '/')}`}
        autoPlay
        loop={loop}
        muted={muted}
        playsInline
        style={{
          width: '100%', height: '100%',
          objectFit: style?.objectFit || 'contain',
          display: 'block',
        }}
      />
    );
  }

  return null;
}