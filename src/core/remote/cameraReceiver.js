/* Accept WebRTC camera streams from phones, expose them as MediaStreams.
   Lives in whichever renderer needs them (we put it in the output window). */

   const receivers = new Map(); // peerId -> { pc, stream, label }
   const listeners = new Set();
   
   let ws = null;
   let reconnectTimer = null;
   
   function connectSignaling() {
     if (ws && ws.readyState === 1) return;
   
     const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
     // In a browser environment we know the host; in Electron renderer we
     // assume the remote server is at 127.0.0.1:5174
     const host = location.hostname === 'localhost' ? '127.0.0.1:5174' : `${location.hostname}:5174`;
     const url = `${proto}//${host}/ws?role=desktop-camera`;
   
     try {
       ws = new WebSocket(url);
     } catch {
       scheduleReconnect();
       return;
     }
   
     ws.onopen = () => {
       console.log('[cameraReceiver] connected to signaling');
     };
   
     ws.onmessage = async (event) => {
       let msg;
       try { msg = JSON.parse(event.data); } catch { return; }
       await handleSignalingMessage(msg);
     };
   
     ws.onclose = () => {
       scheduleReconnect();
     };
   
     ws.onerror = () => {
       // Silent — server may not be running yet
     };
   }
   
   function scheduleReconnect() {
     if (reconnectTimer) return;
     reconnectTimer = setTimeout(() => {
       reconnectTimer = null;
       connectSignaling();
     }, 2000);
   }
   
   async function handleSignalingMessage(msg) {
     const { type, payload } = msg;
   
     if (type === 'webrtc:offer') {
       await handleOffer(payload);
     } else if (type === 'webrtc:ice') {
       const rec = receivers.get(payload.peerId);
       if (!rec) return;
       if (!rec.remoteDescriptionSet) {
         rec.pending.push(payload.candidate);
         return;
       }
       try {
         await rec.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
       } catch (err) {
         console.error('[cameraReceiver] addIceCandidate failed', err);
       }
     } else if (type === 'webrtc:bye') {
       const rec = receivers.get(payload.peerId);
       if (rec) {
         try { rec.pc.close(); } catch {}
         receivers.delete(payload.peerId);
         notify();
       }
     }
   }
   
   async function handleOffer(payload) {
     const peerId = payload.peerId;
     if (!peerId || !payload.sdp) return;
   
     // Replace any existing receiver for this peer
     const existing = receivers.get(peerId);
     if (existing) {
       try { existing.pc.close(); } catch {}
       receivers.delete(peerId);
     }
   
     const pc = new RTCPeerConnection({
       iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
     });
   
     const rec = {
       pc,
       stream: new MediaStream(),
       label: payload.label || 'Phone camera',
       pending: [],
       remoteDescriptionSet: false,
     };
     receivers.set(peerId, rec);
   
     pc.ontrack = (event) => {
       const [stream] = event.streams;
       if (stream) {
         rec.stream = stream;
       } else {
         rec.stream.addTrack(event.track);
       }
       notify();
     };
   
     pc.onicecandidate = (event) => {
       if (event.candidate) {
         sendSignal('webrtc:ice', {
           peerId,
           candidate: event.candidate,
         });
       }
     };
   
     pc.onconnectionstatechange = () => {
       console.log('[cameraReceiver] state', pc.connectionState);
       if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
         receivers.delete(peerId);
         notify();
       }
     };
   
     try {
       await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
       rec.remoteDescriptionSet = true;
       for (const c of rec.pending) {
         try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
       }
       rec.pending = [];
   
       const answer = await pc.createAnswer();
       await pc.setLocalDescription(answer);
       sendSignal('webrtc:answer', { peerId, sdp: answer });
   
       // Also subscribe to future ICE from this peer
       sendSignal('webrtc:subscribe', { peerId });
     } catch (err) {
       console.error('[cameraReceiver] offer handling failed', err);
       receivers.delete(peerId);
     }
   }
   
   function sendSignal(type, payload) {
     if (ws?.readyState === 1) {
       ws.send(JSON.stringify({ type, payload }));
     }
   }
   
   function notify() {
     for (const fn of listeners) {
       try { fn(listReceivers()); } catch {}
     }
   }
   
   export function listReceivers() {
     const out = [];
     for (const [peerId, rec] of receivers.entries()) {
       out.push({ peerId, label: rec.label, stream: rec.stream });
     }
     return out;
   }
   
   export function onCameraChange(fn) {
     listeners.add(fn);
     // Fire immediately with current list
     fn(listReceivers());
     return () => listeners.delete(fn);
   }
   
   export function getReceiver(peerId) {
     return receivers.get(peerId) || null;
   }
   
   // Auto-connect when module loads
   connectSignaling();