import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useStore } from '../../core/state/store.js';
import { subscribe } from '../../core/state/sync.js';

import './RemotePanel.css';

export default function RemotePanel() {
  const [info, setInfo] = useState(null);
  const [qr, setQr] = useState(null);
  const [receivers, setReceivers] = useState([]);
  const updateSettings = useStore(s => s.updateSettings);
  const cameraPeerId = useStore(s => s.settings.cameraPeerId);
  const cameraDeviceId = useStore(s => s.settings.cameraDeviceId);

  async function refresh() {
    const i = await window.api.remote.getInfo();
    setInfo(i);
    if (i?.url) {
      const dataUrl = await QRCode.toDataURL(i.url, { width: 260, margin: 1 });
      setQr(dataUrl);
    }
  }


// inside component:
useEffect(() => {
  const off = subscribe('camera:peers-update', ({ peers }) => {
    setReceivers(peers);
  });
  return () => off?.();
}, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  // Poll local cameraReceiver (it lives in the output window, but the operator
  // can still see the list via the shared BroadcastChannel-based store — for
  // simplicity, we surface what we know here).
  useEffect(() => {
    // The output window keeps the receiver list; ask it via BroadcastChannel.
    // Simpler approach: listen for a "peers:update" broadcast the output sends.
    const { subscribe } = require('../../core/state/sync.js');
    // Not used — we rely on the output window to broadcast peerId updates.
  }, []);

  async function useAsCamera(peerId) {
    updateSettings({ cameraPeerId: peerId, cameraDeviceId: null });
  }

  function useLocalCamera() {
    updateSettings({ cameraPeerId: null });
  }

  return (
    <div className="remote-panel">
      <div className="remote-section">
        <div className="section-title">Phone Remote</div>
        <p className="remote-help">
          Scan this QR code with your phone to open the remote. Same Wi-Fi required.
        </p>
        {qr ? (
          <img src={qr} alt="Scan to open remote" className="remote-qr" />
        ) : (
          <div className="empty">Starting server…</div>
        )}
        {info?.url && <div className="remote-url">{info.url}</div>}
        {info?.connectedRemotes > 0 && (
          <div className="remote-connected">
            {info.connectedRemotes} phone{info.connectedRemotes !== 1 ? 's' : ''} connected
          </div>
        )}
      </div>

      <div className="remote-section">
        <div className="section-title">Camera Source</div>

        <button
          className={`camera-option ${!cameraPeerId && !cameraDeviceId ? 'active' : ''}`}
          onClick={() => updateSettings({ cameraPeerId: null, cameraDeviceId: null })}
        >Default local camera</button>

        <button
          className={`camera-option ${!cameraPeerId && cameraDeviceId ? 'active' : ''}`}
          onClick={useLocalCamera}
        >Selected USB/HDMI camera (set in Camera tab)</button>

        {receivers.length > 0 ? (
          receivers.map(r => (
            <button
              key={r.peerId}
              className={`camera-option ${cameraPeerId === r.peerId ? 'active' : ''}`}
              onClick={() => useAsCamera(r.peerId)}
            >📱 {r.label}</button>
          ))
        ) : (
          <div className="camera-hint">
            No phone cameras connected. Open the remote on your phone and tap "Start Streaming Camera".
          </div>
        )}
      </div>
    </div>
  );
}