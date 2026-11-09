const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload] File is executing');

const api = {
  // ── Bible ────────────────────────────────────────────────
  bible: {
    translations: () => ipcRenderer.invoke('bible:translations'),
    books: (translationId) => ipcRenderer.invoke('bible:books', { translationId }),
    chapter: (translationId, bookId, chapter) =>
      ipcRenderer.invoke('bible:chapter', { translationId, bookId, chapter }),
    passage: (translationId, bookId, chapter, verseStart, verseEnd) =>
      ipcRenderer.invoke('bible:passage', { translationId, bookId, chapter, verseStart, verseEnd }),
    search: (translationId, query, limit) =>
      ipcRenderer.invoke('bible:search', { translationId, query, limit }),
  },

  // ── Window control ──────────────────────────────────────
  window: {
    createOutput: (displayId) => ipcRenderer.invoke('window:create-output', displayId),
    destroyOutput: () => ipcRenderer.invoke('window:destroy-output'),
    createStage: (displayId) => ipcRenderer.invoke('window:create-stage', displayId),
    getDisplays: () => ipcRenderer.invoke('window:get-displays'),
  },

  // ── Settings ────────────────────────────────────────────
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // ── Templates ───────────────────────────────────────────
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    get: (id) => ipcRenderer.invoke('templates:get', id),
    save: (payload) => ipcRenderer.invoke('templates:save', payload),
    delete: (id) => ipcRenderer.invoke('templates:delete', id),
    duplicate: (id) => ipcRenderer.invoke('templates:duplicate', id),
  },

  // ── Services ────────────────────────────────────────────
  services: {
    list: () => ipcRenderer.invoke('services:list'),
    get: (id) => ipcRenderer.invoke('services:get', id),
    create: (payload) => ipcRenderer.invoke('services:create', payload),
    save: (payload) => ipcRenderer.invoke('services:save', payload),
    delete: (id) => ipcRenderer.invoke('services:delete', id),
    duplicate: (id) => ipcRenderer.invoke('services:duplicate', id),
    export: (id) => ipcRenderer.invoke('services:export', id),
    import: () => ipcRenderer.invoke('services:import'),
  },

  // ── Songs ───────────────────────────────────────────────
  songs: {
    list: () => ipcRenderer.invoke('songs:list'),
    get: (id) => ipcRenderer.invoke('songs:get', id),
    create: (payload) => ipcRenderer.invoke('songs:create', payload),
    save: (payload) => ipcRenderer.invoke('songs:save', payload),
    delete: (id) => ipcRenderer.invoke('songs:delete', id),
    export: (id) => ipcRenderer.invoke('songs:export', id),
  },

  // ── Media ───────────────────────────────────────────────
  media: {
    pick: () => ipcRenderer.invoke('media:pick'),
  },

  // ── Output / stage channels ─────────────────────────────
  output: {
    send: (channel, data) => ipcRenderer.invoke('output:send', channel, data),
    on: (channel, cb) => {
      const listener = (_e, data) => cb(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },

  // ── Remote (phone) ──────────────────────────────────────
  remote: {
    getInfo: () => ipcRenderer.invoke('remote:get-info'),
    onCommand: (cb) => {
      const listener = (_e, data) => cb(data);
      ipcRenderer.on('remote:command', listener);
      return () => ipcRenderer.removeListener('remote:command', listener);
    },
    pushState: (state) => ipcRenderer.invoke('remote:push-state', state),
    onRequestSnapshot: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('remote:request-snapshot', listener);
      return () => ipcRenderer.removeListener('remote:request-snapshot', listener);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);