import CameraFeed from '../CameraFeed.jsx';

export default function CameraZone({ style, deviceId, peerId }) {
  return (
    <div className="zone-camera" style={style}>
      <CameraFeed deviceId={deviceId} peerId={peerId} />
    </div>
  );
}