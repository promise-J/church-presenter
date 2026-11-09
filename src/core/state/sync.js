const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('church-presenter')
  : null;

const handlers = new Map();

if (channel) {
  channel.onmessage = (event) => {
    const { type, payload } = event.data || {};
    const list = handlers.get(type) || [];
    for (const fn of list) {
      try { fn(payload); } catch (err) { console.error('sync handler failed', err); }
    }
  };
}

export function broadcast(type, payload) {
  if (channel) channel.postMessage({ type, payload, ts: Date.now() });
}

export function subscribe(type, fn) {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(fn);
  return () => {
    const list = handlers.get(type) || [];
    const idx = list.indexOf(fn);
    if (idx >= 0) list.splice(idx, 1);
  };
}

