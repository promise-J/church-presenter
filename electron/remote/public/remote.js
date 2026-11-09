/* Church Presenter — Phone Remote */

const state = {
    ws: null,
    reconnectTimer: null,
    currentState: null,
    peerId: null,
    peerConnection: null,
    localStream: null,
    streaming: false,
    pendingCandidates: [],
    remoteDescriptionSet: false,
  };
  
  const els = {
    status: document.getElementById('status'),
    liveNow: document.getElementById('live-now'),
    liveMeta: document.getElementById('live-meta'),
    itemList: document.getElementById('item-list'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnBlank: document.getElementById('btn-blank'),
    btnBlackout: document.getElementById('btn-blackout-clear'),
    btnCamera: document.getElementById('btn-camera'),
    cameraStatus: document.getElementById('camera-status'),
    cameraPreview: document.getElementById('camera-preview'),
  };
  
  /* ─── WebSocket ────────────────────────────────────────── */
  
  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws?role=remote`;
  
    els.status.textContent = 'Connecting…';
    els.status.className = 'status';
  
    const ws = new WebSocket(url);
    state.ws = ws;
  
    ws.onopen = () => {
      els.status.textContent = 'Connected';
      els.status.className = 'status ok';
      // Ask the operator for the current state
      ws.send(JSON.stringify({ type: 'snapshot:request', payload: {} }));
      // Start heartbeat
      startHeartbeat();
    };
  
    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      handleMessage(msg);
    };
  
    ws.onclose = () => {
      els.status.textContent = 'Disconnected';
      els.status.className = 'status err';
      stopHeartbeat();
      scheduleReconnect();
    };
  
    ws.onerror = () => {
      els.status.textContent = 'Error';
      els.status.className = 'status err';
    };
  }
  
  function scheduleReconnect() {
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connect();
    }, 1500);
  }
  
  let heartbeatTimer = null;
  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (state.ws?.readyState === 1) {
        state.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
  }
  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }
  
  /* ─── Message handling ─────────────────────────────────── */
  
  function handleMessage(msg) {
    const { type, payload } = msg;
  
    switch (type) {
      case 'state:update':
        state.currentState = payload;
        renderState(payload);
        break;
  
      case 'snapshot:request':
        // Server is asking us (the phone) — but actually the phone is the one
        // requesting. The server may also forward this; if we're the phone,
        // we just ask the operator again through the standard channel.
        state.ws?.send(JSON.stringify({ type: 'command:request-snapshot' }));
        break;
  
      case 'pong':
        break;
  
      /* ── WebRTC messages from the desktop ── */
      case 'webrtc:answer':
        handleWebRtcAnswer(payload);
        break;
  
      case 'webrtc:ice':
        handleWebRtcIce(payload);
        break;
  
      case 'webrtc:bye':
        stopStreaming();
        break;
  
      default:
        break;
    }
  }
  
  /* ─── Rendering ────────────────────────────────────────── */
  
  function renderState(s) {
    // Now live
    const liveItem = s.items?.[s.activeItemIndex];
    if (liveItem) {
      els.liveNow.textContent = liveItem.title || '—';
      const meta = [];
      if (liveItem.type) meta.push(liveItem.type);
      if (liveItem.data?.slides?.length > 1) {
        meta.push(`slide ${s.activeSlideIndex + 1} / ${liveItem.data.slides.length}`);
      }
      els.liveMeta.textContent = meta.join(' · ');
    } else {
      els.liveNow.textContent = s.serviceName ? `${s.serviceName} — nothing live` : '—';
      els.liveMeta.textContent = '';
    }
  
    // Blank button state
    els.btnBlank.classList.toggle('active', !!s.isBlank);
    els.btnBlank.textContent = s.isBlank ? 'Unblank' : 'Blank';
  
    // Item list
    renderItems(s.items || [], s.activeItemIndex);
  }
  
  function renderItems(items, activeIndex) {
    if (!items.length) {
      els.itemList.innerHTML = '<div class="empty">No items in this service</div>';
      return;
    }
  
    const html = items.map((item, i) => {
      const live = i === activeIndex;
      const slides = item.data?.slides?.length;
      return `
        <button class="item-row ${live ? 'live' : ''}" data-index="${i}">
          <span class="item-order">${i + 1}</span>
          <span class="item-title">${escapeHtml(item.title || '—')}</span>
          ${slides && slides > 1 ? `<span class="item-slide">${slides}sl</span>` : ''}
        </button>
      `;
    }).join('');
  
    els.itemList.innerHTML = html;
  
    els.itemList.querySelectorAll('.item-row').forEach(el => {
      el.addEventListener('click', () => {
        const index = Number(el.dataset.index);
        sendCommand('command:goto-item', { index });
      });
    });
  }
  
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  
  /* ─── Sending commands ─────────────────────────────────── */
  
  function sendCommand(type, payload = {}) {
    if (state.ws?.readyState !== 1) return;
    state.ws.send(JSON.stringify({ type, payload }));
  }
  
  els.btnNext.addEventListener('click', () => sendCommand('command:next'));
  els.btnPrev.addEventListener('click', () => sendCommand('command:prev'));
  els.btnBlank.addEventListener('click', () => sendCommand('command:blank-toggle'));
  els.btnBlackout.addEventListener('click', () => sendCommand('command:blackout-clear'));
  
  /* ─── Phone as Camera (WebRTC) ─────────────────────────── */
  
  function makePeerId() {
    return 'cam_' + Math.random().toString(36).slice(2, 10);
  }
  
  async function startStreaming() {
    try {
      els.cameraStatus.textContent = 'Requesting camera…';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
  
      state.localStream = stream;
      state.peerId = makePeerId();
      state.streaming = true;
  
      els.cameraPreview.srcObject = stream;
      els.cameraPreview.classList.add('on');
      els.btnCamera.textContent = 'Stop Streaming Camera';
      els.cameraStatus.textContent = 'Starting stream…';
  
      await createPeerConnection();
  
      const offer = await state.peerConnection.createOffer();
      await state.peerConnection.setLocalDescription(offer);
  
      sendCommand('webrtc:offer', {
        peerId: state.peerId,
        sdp: offer,
        label: `Phone camera (${navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android'})`,
      });
  
      // Subscribe the desktop to this peer
      sendCommand('webrtc:subscribe', { peerId: state.peerId });
  
      els.cameraStatus.textContent = 'Streaming live to desktop';
    } catch (err) {
      console.error(err);
      els.cameraStatus.textContent = 'Camera error: ' + (err.message || err);
      stopStreaming();
    }
  }
  
  async function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [
        // On local Wi-Fi, STUN isn't strictly needed, but keep a public one
        // as a fallback. No TURN — we're on the same LAN.
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });
    state.peerConnection = pc;
  
    // Add the camera track
    for (const track of state.localStream.getVideoTracks()) {
      pc.addTrack(track, state.localStream);
    }
  
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCommand('webrtc:ice', {
          peerId: state.peerId,
          candidate: event.candidate,
        });
      }
    };
  
    pc.onconnectionstatechange = () => {
      console.log('[webrtc]', pc.connectionState);
      if (pc.connectionState === 'connected') {
        els.cameraStatus.textContent = 'Connected — live video';
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        els.cameraStatus.textContent = 'Connection lost';
        stopStreaming();
      }
    };
  
    return pc;
  }
  
  async function handleWebRtcAnswer(payload) {
    if (!state.peerConnection) return;
    try {
      await state.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      state.remoteDescriptionSet = true;
      for (const c of state.pendingCandidates) {
        await state.peerConnection.addIceCandidate(new RTCIceCandidate(c));
      }
      state.pendingCandidates = [];
    } catch (err) {
      console.error('[webrtc] setRemoteDescription failed', err);
    }
  }
  
  async function handleWebRtcIce(payload) {
    if (!payload.candidate) return;
    if (!state.peerConnection) return;
    if (!state.remoteDescriptionSet) {
      state.pendingCandidates.push(payload.candidate);
      return;
    }
    try {
      await state.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (err) {
      console.error('[webrtc] addIceCandidate failed', err);
    }
  }
  
  function stopStreaming() {
    if (state.peerConnection) {
      try { state.peerConnection.close(); } catch {}
      state.peerConnection = null;
    }
    if (state.localStream) {
      state.localStream.getTracks().forEach(t => t.stop());
      state.localStream = null;
    }
    state.streaming = false;
    state.remoteDescriptionSet = false;
    state.pendingCandidates = [];
  
    if (state.peerId) {
      sendCommand('webrtc:bye', { peerId: state.peerId });
    }
    state.peerId = null;
  
    els.cameraPreview.srcObject = null;
    els.cameraPreview.classList.remove('on');
    els.btnCamera.textContent = 'Start Streaming Camera';
    els.cameraStatus.textContent = 'Idle';
  }
  
  els.btnCamera.addEventListener('click', () => {
    if (state.streaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  });
  
  /* ─── Boot ─────────────────────────────────────────────── */
  
  window.addEventListener('beforeunload', () => {
    if (state.streaming) stopStreaming();
  });
  
  connect();