import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

// Dev-only: surface unhandled errors visibly on screen
window.onerror = (msg, src, line, col, err) => {
  const div = document.getElementById('dev-error') || (() => {
    const d = document.createElement('div');
    d.id = 'dev-error';
    d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#7f1d1d;color:#fef2f2;padding:12px 16px;font:13px monospace;z-index:99999;white-space:pre-wrap;max-height:40vh;overflow:auto';
    document.body.appendChild(d);
    return d;
  })();
  div.textContent = `[onerror] ${msg}\n  at ${src}:${line}:${col}\n  ${err?.stack || ''}`;
};
window.onunhandledrejection = (e) => {
  window.onerror(`Unhandled promise rejection: ${e.reason}`, '', 0, 0, e.reason);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
