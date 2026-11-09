import { useEffect, useRef, useState } from 'react';
import { getReceiver, onCameraChange } from '../core/remote/cameraReceiver.js';

export default function CameraFeed({ deviceId, peerId }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [receiverStream, setReceiverStream] = useState(null);

  // If a peerId is given, listen for the matching WebRTC receiver
  useEffect(() => {
    if (!peerId) { setReceiverStream(null); return; }
    const off = onCameraChange((list) => {
      const match = list.find(r => r.peerId === peerId);
      setReceiverStream(match?.stream || null);
    });
    // Also try immediate lookup
    const rec = getReceiver(peerId);
    if (rec) setReceiverStream(rec.stream);
    return () => off && off();
  }, [peerId]);

  // Local camera (getUserMedia) if no peerId
  useEffect(() => {
    if (peerId) return;
    let stream;
    let cancelled = false;

    (async () => {
      try {
        const constraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError(err.message || 'Camera unavailable');
      }
    })();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [deviceId, peerId]);

  // Attach remote stream when it arrives
  useEffect(() => {
    if (!peerId) return;
    if (!videoRef.current) return;
    if (receiverStream) {
      videoRef.current.srcObject = receiverStream;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.srcObject = null;
    }
  }, [receiverStream, peerId]);

  if (error) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#555', fontSize: 20, flexDirection: 'column', gap: 8,
      }}>
        <div>No camera</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>{error}</div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}