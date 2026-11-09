import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { attachRemoteWebSocket } from './ws.js';
import { attachSignaling } from './webrtcSignaling.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 5174;

let httpServer = null;
let wss = null;
let currentInfo = null;

function getLanAddress() {
  const ifaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({ name, address: iface.address });
      }
    }
  }

  // Prefer common private ranges in this order
  const preferred = candidates.find(c => /^192\.168\./.test(c.address))
    || candidates.find(c => /^10\./.test(c.address))
    || candidates.find(c => /^172\.(1[6-9]|2\d|3[01])\./.test(c.address))
    || candidates[0];

  return preferred?.address || '127.0.0.1';
}

export function startRemoteServer(port = PORT) {
  if (httpServer) return;

  const app = express();

  // Serve the remote UI
  app.use(express.static(path.join(__dirname, 'public')));

  // Info endpoint — used by operator panel and remote UI itself
  app.get('/api/info', (_req, res) => {
    res.json({
      url: `http://${getLanAddress()}:${port}`,
      port,
      deviceName: os.hostname(),
      connectedRemotes: wss ? wss.clients.size : 0,
    });
  });

  // Fallback: serve index.html for any unknown GET (SPA)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  httpServer = http.createServer(app);

  wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  attachRemoteWebSocket(wss);
  attachSignaling(wss);

  httpServer.listen(port, '0.0.0.0', () => {
    const addr = getLanAddress();
    currentInfo = {
      url: `http://${addr}:${port}`,
      port,
      deviceName: os.hostname(),
    };
    console.log(`[remote] server listening on ${currentInfo.url}`);
  });

  httpServer.on('error', (err) => {
    console.error('[remote] server error:', err.message);
  });
}

export function getRemoteInfo() {
  return currentInfo
    ? { ...currentInfo, connectedRemotes: wss ? wss.clients.size : 0 }
    : null;
}

export function broadcastToRemotes(type, payload) {
  if (!wss) return;
  const msg = JSON.stringify({ type, payload });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.send(msg); } catch {}
    }
  }
}

export function stopRemoteServer() {
  if (wss) wss.close();
  if (httpServer) httpServer.close();
  wss = null;
  httpServer = null;
  currentInfo = null;
}