export default function ReferenceZone({ label, style }) {
    if (!label) return null;
    return <div className="zone-reference" style={style}>{label}</div>;
  }