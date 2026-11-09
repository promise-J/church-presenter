import { useEffect, useRef, useState, useMemo } from "react";
import { useStore } from "../../core/state/store.js";
import ScriptureZone from "../../output/zones/ScriptureZone.jsx";
import ReferenceZone from "../../output/zones/ReferenceZone.jsx";
import NotesZone from "../../output/zones/NotesZone.jsx";
import CameraFeed from "../../output/CameraFeed.jsx";
import LowerThirdZone from "../../output/zones/LowerThirdZone.jsx";
import "./LivePreview.css";
import MediaZone from "../../output/zones/MediaZone.jsx";

export default function LivePreview() {
  const templates = useStore((s) => s.templates);
  const activeTemplateId = useStore((s) => s.activeTemplateId);
  const verses = useStore((s) => s.activeVerses);
  const altVerses = useStore((s) => s.altVerses);
  const label = useStore((s) => s.activeReferenceLabel);
  const notesText = useStore((s) => s.notesText);
  const isBlank = useStore((s) => s.isBlank);
  const cameraDeviceId = useStore((s) => s.settings.cameraDeviceId);

  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  // const template = useMemo(() => {
  //   if (!Array.isArray(templates)) return null;
  //   return templates.find(t => t.id === activeTemplateId)?.layout || null;
  // }, [templates, activeTemplateId]);

  const template = useMemo(() => {
    if (!Array.isArray(templates)) return null;
    const found = templates.find((t) => t.id === activeTemplateId);
    if (!found) return null;

    let layout = found.layout;
    // Defensive: if layout is missing zones but has a nested layout.zones, unwrap it
    if (layout && !layout.zones && layout.layout?.zones) {
      layout = layout.layout;
    }
    if (!layout?.zones) return null;

    return layout;
  }, [templates, activeTemplateId]);

  // Fit a 1920x1080 virtual canvas into the available preview area

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setScale(Math.min(width / 1920, height / 1080));
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="live-preview">
      <div className="preview-header">Live Preview</div>
      <div className="preview-wrapper" ref={wrapperRef}>
        <div
          className="preview-canvas"
          style={{ transform: `scale(${scale})` }}
        >
          {isBlank ? (
            <div className="preview-blank">BLANK</div>
          ) : !template ? (
            <div className="preview-empty">No template selected</div>
          ) : (
            <div
              className="preview-output-root"
              style={{ background: template.background?.value || "#000" }}
            >
              {template.zones.map((zone) => (
                <div
                  key={zone.id}
                  className="preview-zone"
                  style={{
                    position: "absolute",
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.w}%`,
                    height: `${zone.h}%`,
                    overflow: "hidden",
                    boxSizing: "border-box",
                    ...zone.style,
                  }}
                >
                  {renderZone(zone, {
                    verses,
                    altVerses,
                    label,
                    notesText,
                    cameraDeviceId,
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderZone(zone, ctx) {
  switch (zone.role) {
    case "camera":
      return <CameraFeed deviceId={ctx.cameraDeviceId} />;
    case "scripture":
      return (
        <ScriptureZone
          verses={ctx.verses}
          style={{ width: "100%", height: "100%" }}
        />
      );
    case "scripture-alt":
      return (
        <ScriptureZone
          verses={ctx.altVerses}
          style={{ width: "100%", height: "100%" }}
          variant="alt"
        />
      );
    case "reference":
      return (
        <ReferenceZone
          label={ctx.label}
          style={{ width: "100%", height: "100%" }}
        />
      );
    case "notes":
      return (
        <NotesZone
          text={ctx.notesText}
          style={{ width: "100%", height: "100%" }}
        />
      );
    case "notes":
      return (
        <MediaZone
          text={ctx.notesText}
          style={{ width: "100%", height: "100%" }}
        />
      );
    case "lower-third":
      return (
        <LowerThirdZone
          verses={ctx.verses}
          style={{ width: "100%", height: "100%" }}
        />
      );
    default:
      return null;
  }
}
