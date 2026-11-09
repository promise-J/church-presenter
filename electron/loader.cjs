// CommonJS shim. Runs synchronously before Electron's app-ready check,
// so protocol.registerSchemesAsPrivileged must be called HERE.

const { protocol } = require('electron');

// Must happen before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

// Now load the real ESM main.js
(async () => {
  try {
    await import('./main.js');
  } catch (err) {
    console.error('Failed to load main.js:', err);
    process.exit(1);
  }
})();