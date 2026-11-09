import { useStore } from '../../core/state/store.js';
import { makeMediaItem } from '../../core/services/builders.js';
import './MediaPanel.css';

export default function MediaPanel() {
  const activeMedia = useStore(s => s.activeMedia);
  const setActiveMedia = useStore(s => s.setActiveMedia);
  const clearMedia = useStore(s => s.clearMedia);
  const mediaLoop = useStore(s => s.mediaLoop);
  const setMediaLoop = useStore(s => s.setMediaLoop);
  const mediaMuted = useStore(s => s.mediaMuted);
  const setMediaMuted = useStore(s => s.setMediaMuted);

  async function pickAndShow() {
    const picked = await window.api.media.pick();
    if (!picked) return;
    setActiveMedia(picked);
  }

  function addToService() {
    if (!activeMedia) return;
    const svc = useStore.getState().activeService;
    if (!svc) {
      alert('No active service. Create one in the Schedule panel first.');
      return;
    }
    const item = makeMediaItem({
      path: activeMedia.path,
      mediaType: activeMedia.mediaType,
      title: activeMedia.name,
      templateId: activeMedia.mediaType === 'video' ? 'media-full' : 'media-full',
    });
    const items = [...(svc.items || []), item];
    const updated = { ...svc, items };
    useStore.getState().setActiveService(updated);
    window.api.services.save(updated);
  }

  return (
    <div className="media-panel">
      <div className="media-section">
        <div className="section-title">Currently Playing</div>
        {activeMedia ? (
          <div className="media-current">
            <div className="media-thumb">
              {activeMedia.mediaType === 'image' ? (
                <img
                  src={`media://local/${encodeURIComponent(activeMedia.path)}`}
                  alt=""
                />
              ) : (
                <div className="video-icon">▶</div>
              )}
            </div>
            <div className="media-info">
              <div className="media-name">{activeMedia.name}</div>
              <div className="media-type">{activeMedia.mediaType}</div>
            </div>
            <button className="btn-small btn-danger" onClick={clearMedia}>Stop</button>
          </div>
        ) : (
          <div className="empty">Nothing playing</div>
        )}
      </div>

      <div className="media-section">
        <button className="btn btn-primary" onClick={pickAndShow}>
          📁 Pick File & Play
        </button>
        {activeMedia && (
          <button className="btn" onClick={addToService}>+ Add to Service</button>
        )}
      </div>

      <div className="media-section">
        <div className="section-title">Playback Options</div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={mediaLoop}
            onChange={(e) => setMediaLoop(e.target.checked)}
          />
          <span>Loop videos</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={mediaMuted}
            onChange={(e) => setMediaMuted(e.target.checked)}
          />
          <span>Mute videos</span>
        </label>
      </div>
    </div>
  );
}