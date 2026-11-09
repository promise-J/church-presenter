export function attachSignaling(wss) {
    wss.on('connection', (ws) => {
      // Wrap the existing message handler by hooking into the raw message event.
      // Because ws.js already handles other message types, we intercept only WebRTC.
      ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        const { type, payload } = msg || {};
  
        if (!type || !type.startsWith('webrtc:')) return;
  
        switch (type) {
          case 'webrtc:offer':
          case 'webrtc:answer':
          case 'webrtc:ice':
          case 'webrtc:bye': {
            const targetPeerId = payload?.peerId;
            if (!targetPeerId) return;
            // Relay to all clients subscribed to that peerId
            const outbound = JSON.stringify({
              type,
              payload: { ...payload, fromPeerId: ws.peerId || null },
            });
            for (const client of wss.clients) {
              if (client === ws) continue;
              if (client.subscribedPeerId === targetPeerId) {
                try { client.send(outbound); } catch {}
              }
            }
            // If this is the camera side and it carries a peerId, remember it
            if (ws.role === 'camera' && payload.peerId) {
              ws.peerId = payload.peerId;
            }
            break;
          }
          case 'webrtc:subscribe': {
            // The desktop side subscribes to a specific camera peer
            ws.subscribedPeerId = payload?.peerId || null;
            break;
          }
          case 'webrtc:unsubscribe': {
            ws.subscribedPeerId = null;
            break;
          }
          default:
            break;
        }
      });
    });
  }