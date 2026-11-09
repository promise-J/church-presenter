import React from 'react';
import ReactDOM from 'react-dom/client';
import OperatorApp from './operator/OperatorApp.jsx';
import OutputApp from './output/OutputApp.jsx';
import StageApp from './stage/StageApp.jsx';
import './styles/global.css';
import './core/apiFallback.js';

// Diagnostic — will only print inside Electron
console.log('[renderer] User agent:', navigator.userAgent);
console.log('[renderer] window.api exists?', typeof window.api);

function Router() {
  const route = window.location.hash.replace('#/', '') || 'operator';
  if (route === 'output') return <OutputApp />;
  if (route === 'stage') return <StageApp />;
  return <OperatorApp />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);