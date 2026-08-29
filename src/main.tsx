/*
 * Pad+ — a OneDrive code & text editor inspired by Notepad++.
 * Copyright (C) 2026 The Pad+ authors.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License v3.0 as published by the Free
 * Software Foundation. It is distributed WITHOUT ANY WARRANTY. See the LICENSE
 * file (GNU GPL v3) for the full terms.
 */
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
