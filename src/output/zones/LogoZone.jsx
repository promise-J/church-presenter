export default function LogoZone({ src, style }) {
    if (!src) return null;
    return (
      <div className="zone-logo" style={style}>
        <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    );
  }