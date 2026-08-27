import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installGlobalCapture, recordError } from './diagnostics/logbuffer';

// Capture errors/logs into an in-app buffer first, so anything that fails
// (including during startup) is visible without a browser console.
installGlobalCapture();

// Register the service worker only in a top-level window (installed PWA / full
// page). Embedded widget / side-panel iframes skip registration.
if (window.self === window.top && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch((e) => {
      // PWA registration is best-effort; the app works without it.
      recordError('sw-register', e);
    });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
