// main.js (ESM entry)
import AzureBroadcastApp from './core/broadcast-app.js';
if (typeof window !== 'undefined') window.AzureBroadcastApp = AzureBroadcastApp;

function boot() {
  console.log('🧩 ESM bootstrap: AzureBroadcastApp');
  if (!window.__broadcastApp) {
    window.__broadcastApp = new AzureBroadcastApp();
    window.broadcastApp = window.__broadcastApp;
  }
  if (typeof window.__broadcastApp.init === 'function') {
    window.__broadcastApp.init();
  } else if (typeof window.__broadcastApp.start === 'function') {
    window.__broadcastApp.start();
  } else {
    console.warn('No init/start method found on AzureBroadcastApp');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
