import { useEffect, useState } from 'react';
import { useStore } from '../../core/state/store.js';
import QRCode from 'qrcode';
import './CameraPanel.css';

export default function CameraPanel() {
  const [devices, setDevices] = useState([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [phoneUrl, setPhoneUrl] = useState(null);
  const cameraDeviceId = useStore(s => s.settings.cameraDeviceId);
  const updateSettings = useStore(s => s.updateSettings);

  async function requestAccess() {
    try {
      // Prompt for permission by asking for any camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setPermissionGranted(true);
      await enumerate();
    } catch (err) {
      console.error(err);
    }
  }

  async function enumerate() {
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices(list.filter(d => d.kind === 'videoinput'));
  }

  useEffect(() => {
    (async () => {
      // Try to enumerate without prompting first
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter(d => d.kind === 'videoinput');
      // If labels are empty, permission hasn't been granted yet
      const labelsKnown = cams.some(c => c.label);
      setDevices(cams);
      if (labelsKnown) setPermissionGranted(true);
    })();

    const handler = () => enumerate();
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
  }, []);

  async function fetchPhoneUrl() {
    if (!window.api?.remote?.getUrl) return;
    const info = await window.api.remote.getUrl();
    if (!info) return;
    setPhoneUrl(info.url);
    const dataUrl = await QRCode.toDataURL(info.url, { width: 220, margin: 1 });
    setQrDataUrl(dataUrl);
  }

  useEffect(() => { fetchPhoneUrl(); }, []);

  return (
    <div className="camera-panel">
      <div className="camera-section">
        <div className="section-title">Camera Source</div>

        {!permissionGranted && (
          <button className="btn btn-primary" onClick={requestAccess}>
            Enable Camera Access
          </button>
        )}

        {permissionGranted && (
          <div className="camera-list">
            <button
              className={`camera-option ${!cameraDeviceId ? 'active' : ''}`}
              onClick={() => updateSettings({ cameraDeviceId: null })}
            >
              Default (system picks)
            </button>
            {devices.map(d => (
              <button
                key={d.deviceId}
                className={`camera-option ${cameraDeviceId === d.deviceId ? 'active' : ''}`}
                onClick={() => updateSettings({ cameraDeviceId: d.deviceId })}
              >
                {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
              </button>
            ))}
            {devices.length === 0 && (
              <div className="empty">No video devices found.</div>
            )}
          </div>
        )}
      </div>

      <div className="camera-section">
        <div className="section-title">Phone as Camera</div>
        <p className="camera-help">
          Open this URL on your phone (same Wi-Fi). Your phone camera will stream to this app.
        </p>
        {phoneUrl && (
          <>
            <div className="phone-url">{phoneUrl}</div>
            {qrDataUrl && <img src={qrDataUrl} alt="QR code" className="phone-qr" />}
          </>
        )}
      </div>
    </div>
  );
}