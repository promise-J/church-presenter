import { ipcMain } from "electron";
import { getDb } from "../db/database.js";

// We need a way for the WS hub to reach into the renderer (operator window)
// to run commands. We do that by sending IPC messages to the operator window.
// The operator window listens for these and drives the Zustand store.

let operatorSender = null;

export function setOperatorSender(fn) {
  operatorSender = fn;
}

function sendToOperator(channel, payload) {
  if (operatorSender) {
    try {
      operatorSender(channel, payload);
    } catch (err) {
      console.error("[remote] failed to reach operator:", err);
    }
  }
}

export function attachRemoteWebSocket(wss) {
  wss.on("connection", (ws, req) => {
    // Register the socket as a camera-candidate if requested via query string
    const url = new URL(req.url, "http://localhost");
    const role = url.searchParams.get("role") || "remote";
    ws.role = role;

    console.log(`[remote] client connected (${role})`);

    // Immediately send the current state snapshot
    ws.send(
      JSON.stringify({
        type: "snapshot:request",
        payload: {},
      })
    );

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      const { type, payload } = msg || {};

      switch (type) {
        case "snapshot:request":
          sendToOperator("remote:request-snapshot", {});
          break;
        case "command:next":
          sendToOperator("remote:command", { action: "next" });
          break;
        case "command:prev":
          sendToOperator("remote:command", { action: "prev" });
          break;
        case "command:blank-toggle":
          sendToOperator("remote:command", { action: "blank-toggle" });
          break;
        case "command:blackout-clear":
          sendToOperator("remote:command", { action: "blackout-clear" });
          break;
        case "command:goto-item":
          sendToOperator("remote:command", {
            action: "goto-item",
            index: payload?.index,
          });
          break;
        case "snapshot:state":
          // Operator responds with current state; broadcast to all remotes
          broadcastFromServer(wss, "state:update", payload);
          break;
        case "webrtc:offer":
        case "webrtc:answer":
        case "webrtc:ice":
        case "webrtc:bye":
          // Handled by webrtcSignaling.js
          break;
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        default:
          break;
      }
    });

    ws.on("close", () => {
      console.log("[remote] client disconnected");
    });
  });
}

export function broadcastFromServer(wss, type, payload) {
  const msg = JSON.stringify({ type, payload });
  for (const client of wss.clients) {
    if (client.readyState === 1 && client.role !== "camera") {
      try {
        client.send(msg);
      } catch {}
    }
  }
}
