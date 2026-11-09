import { useEffect, useMemo } from 'react';
import { useStore } from '../core/state/store.js';
import { subscribe } from '../core/state/sync.js';
import ScriptureZone from './zones/ScriptureZone.jsx';
import ReferenceZone from './zones/ReferenceZone.jsx';
import NotesZone from './zones/NotesZone.jsx';
import CameraZone from './zones/CameraZone.jsx';
import LowerThirdZone from './zones/LowerThirdZone.jsx';
import MediaZone from './zones/MediaZone.jsx';
import CountdownZone from './zones/CountdownZone.jsx';
import Transition from './Transition.jsx';
import { onCameraChange } from '../core/remote/cameraReceiver.js';
import './OutputApp.css';

export default function OutputApp() {
  const templates = useStore(s => s.templates);
  const activeTemplateId = useStore(s => s.activeTemplateId);
  const verses = useStore(s => s.activeVerses);
  const altVerses = useStore(s => s.altVerses);
  const label = useStore(s => s.activeReferenceLabel);
  const notesText = useStore(s => s.notesText);
  const isBlank = useStore(s => s.isBlank);
  const isBlackout = useStore(s => s.isBlackout);
  const cameraDeviceId = useStore(s => s.settings?.cameraDeviceId);
  const cameraPeerId = useStore(s => s.settings?.cameraPeerId);

  // const template = useMemo(() => {
  //   if (!Array.isArray(templates)) return null;
  //   const found = templates.find(t => t.id === activeTemplateId);
  //   return found?.layout || null;
  // }, [templates, activeTemplateId]);

  const template = useMemo(() => {
    if (!Array.isArray(templates)) return null;
    const found = templates.find(t => t.id === activeTemplateId);
    if (!found) return null;
  
    let layout = found.layout;
    // Defensive: if layout is missing zones but has a nested layout.zones, unwrap it
    if (layout && !layout.zones && layout.layout?.zones) {
      layout = layout.layout;
    }
    if (!layout?.zones) return null;
  
    return layout;
  }, [templates, activeTemplateId]);

  // ── Broadcast subscriptions ────────────────────────────────
  useEffect(() => {
    const unsubs = [
      // Templates loaded by operator
      subscribe('output:template-list', ({ templates: list }) => {
        console.log('[output] received template list:', list?.length);
        useStore.setState(s => { s.templates = Array.isArray(list) ? list : []; });
      }),

      // Active template changed
      subscribe('output:set-template', ({ id }) => {
        console.log('[output] switching template to:', id);
        useStore.setState(s => { s.activeTemplateId = id; });
      }),

      // Scripture changed
      subscribe('output:render-passage', (p) => {
        console.log('[output] render passage received:', p?.label, 'verses:', p?.verses?.length);
        useStore.setState(s => {
          s.activeVerses = p?.verses || [];
          s.activeReferenceLabel = p?.label || '';
          s.activeReference = p?.ref || null;
          s.contentKey = (s.contentKey || 0) + 1;
        });
      }),

      // Second translation
      subscribe('output:alt-verses', ({ verses }) => {
        useStore.setState(s => { s.altVerses = verses || []; });
      }),

      // Notes
      subscribe('output:notes-text', ({ text }) => {
        useStore.setState(s => { s.notesText = text || ''; });
      }),

      // Media
      subscribe('output:set-media', ({ media }) => {
        console.log('[output] received media:', media);
        useStore.setState(s => {
          s.activeMedia = media;
          s.contentKey = (s.contentKey || 0) + 1;
        });
      }),
      subscribe('output:set-media-loop', ({ value }) => {
        useStore.setState(s => { s.mediaLoop = value; });
      }),
      subscribe('output:set-media-muted', ({ value }) => {
        useStore.setState(s => { s.mediaMuted = value; });
      }),

      // Countdown
      subscribe('output:countdown-state', (state) => {
        useStore.setState(s => { s.countdown = { ...s.countdown, ...state }; });
      }),

      // Blank / blackout
      subscribe('output:blank', ({ value }) => {
        useStore.setState(s => { s.isBlank = value; });
      }),
      subscribe('output:blackout', ({ value }) => {
        useStore.setState(s => { s.isBlackout = value; });
      }),

      // Transitions
      subscribe('output:set-transition-type', ({ value }) => {
        useStore.setState(s => { s.transitionType = value; });
      }),
      subscribe('output:set-transition-duration', ({ value }) => {
        useStore.setState(s => { s.transitionDuration = value; });
      }),
    ];

    // Ask operator for a snapshot of current state on mount
    const ch = new BroadcastChannel('church-presenter');
    ch.postMessage({ type: 'output:request-state', payload: {}, ts: Date.now() });

    return () => unsubs.forEach(fn => fn && fn());
  }, []);

  // ── IPC panic keys ─────────────────────────────────────────
  useEffect(() => {
    if (!window.api?.output?.on) return;
    const off1 = window.api.output.on('output:blank-toggle', () => {
      useStore.setState(s => { s.isBlank = !s.isBlank; });
    });
    const off2 = window.api.output.on('output:emergency-black', () => {
      useStore.setState(s => { s.isBlackout = true; });
    });
    const off3 = window.api.output.on('output:emergency-clear', () => {
      useStore.setState(s => { s.isBlackout = false; });
    });
    return () => { off1?.(); off2?.(); off3?.(); };
  }, []);

  // ── Broadcast camera receivers to operator ─────────────────
  useEffect(() => {
    if (typeof onCameraChange !== 'function') return;
    const off = onCameraChange((list) => {
      const ch = new BroadcastChannel('church-presenter');
      ch.postMessage({
        type: 'camera:peers-update',
        payload: { peers: list.map(r => ({ peerId: r.peerId, label: r.label })) },
        ts: Date.now(),
      });
    });
    return () => off?.();
  }, []);

  // ── Cursor none only inside output ─────────────────────────
  useEffect(() => {
    document.body.classList.add('output-mode');
    return () => document.body.classList.remove('output-mode');
  }, []);

  // ── Render branches ────────────────────────────────────────
  if (isBlackout) return <div className="output-blackout" />;

  if (isBlank) {
    return (
      <div className="output-root output-blank">
        <div className="blank-indicator">BLANK</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="output-root">
        <div className="output-idle">
          <div className="idle-text">Waiting for template…</div>
        </div>
      </div>
    );
  }

  return (
    <Transition>
      <div
        className="output-root"
        style={backgroundStyle(template.background)}
      >
        {template.zones.map(zone => (
          <div
            key={zone.id}
            className={`output-zone zone-role-${zone.role}`}
            style={zonePosition(zone)}
          >
            {renderZoneContent(zone, {
              verses, altVerses, label, notesText,
              cameraDeviceId, cameraPeerId,
            })}
          </div>
        ))}
      </div>
    </Transition>
  );
}

function backgroundStyle(bg) {
  if (!bg) return { background: '#000' };
  if (bg.type === 'color') return { background: bg.value };
  if (bg.type === 'image') return {
    backgroundImage: `url(${bg.value})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
  return { background: '#000' };
}

function zonePosition(zone) {
  return {
    position: 'absolute',
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.w}%`,
    height: `${zone.h}%`,
    overflow: 'hidden',
    boxSizing: 'border-box',
    ...zone.style,
  };
}

function renderZoneContent(zone, ctx) {
  switch (zone.role) {
    case 'camera':
      return <CameraZone
        style={{ width: '100%', height: '100%' }}
        deviceId={ctx.cameraDeviceId}
        peerId={ctx.cameraPeerId}
      />;
    case 'scripture':
      return <ScriptureZone verses={ctx.verses} style={{ width: '100%', height: '100%' }} />;
    case 'scripture-alt':
      return <ScriptureZone verses={ctx.altVerses} style={{ width: '100%', height: '100%' }} variant="alt" />;
    case 'reference':
      return <ReferenceZone label={ctx.label} style={{ width: '100%', height: '100%' }} />;
    case 'notes':
      return <NotesZone text={ctx.notesText} style={{ width: '100%', height: '100%' }} />;
    case 'lower-third':
      return <LowerThirdZone verses={ctx.verses} style={{ width: '100%', height: '100%' }} />;
    case 'media':
      return <MediaZone style={{ width: '100%', height: '100%', ...zone.style }} />;
    case 'countdown':
      return <CountdownZone style={{ width: '100%', height: '100%', ...zone.style }} />;
    default:
      return null;
  }
}