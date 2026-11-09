/**
 * Provides a no-op window.api if the preload script failed to attach.
 * This lets the UI render so we can debug why the preload isn't loading.
 * Logs a loud warning so we notice.
 */

if (typeof window !== 'undefined' && !window.api) {
    console.error(
      '[apiFallback] window.api is UNDEFINED — preload script is not loading. ' +
      'Using no-op fallback so the UI can render. Check the Electron terminal ' +
      'for "Unable to load preload script" errors.'
    );
  
    const noop = () => Promise.resolve(null);
    const noopArray = () => Promise.resolve([]);
  
    window.api = {
      bible: {
        translations: noopArray,
        books: noopArray,
        chapter: () => Promise.resolve({ verses: [] }),
        passage: () => Promise.resolve({ verses: [], reference: '' }),
        search: noopArray,
      },
      window: {
        createOutput: noop,
        destroyOutput: noop,
        createStage: noop,
        getDisplays: noopArray,
      },
      settings: {
        get: noop,
        set: noop,
        getAll: () => Promise.resolve({}),
      },
      templates: {
        list: noopArray,
        get: noop,
        save: noop,
        delete: noop,
        duplicate: noop,
      },
      services: {
        list: noopArray,
        get: noop,
        create: noop,
        save: noop,
        delete: noop,
        duplicate: noop,
        export: noop,
        import: noop,
      },
      songs: {
        list: noopArray,
        get: noop,
        create: noop,
        save: noop,
        delete: noop,
        export: noop,
      },
      media: {
        pick: noop,
      },
      output: {
        send: noop,
        on: () => () => {},
      },
      remote: {
        getInfo: noop,
        onCommand: () => () => {},
        pushState: noop,
        onRequestSnapshot: () => () => {},
      },
    };
  }