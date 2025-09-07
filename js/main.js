// main.js (ESM entry)
import AzureBroadcastApp from './core/broadcast-app.js';
if (typeof window !== 'undefined') window.AzureBroadcastApp = AzureBroadcastApp;

export async function boot(msalInstance) {
  console.log('🧩 ESM bootstrap: AzureBroadcastApp (injected MSAL)');
  if (!window.__broadcastApp) {
    window.__broadcastApp = new AzureBroadcastApp({ msalInstance });
    window.broadcastApp = window.__broadcastApp;
  } else if (msalInstance && !window.__broadcastApp.msalInstance) {
    window.__broadcastApp.setMsal(msalInstance);
  }
  if (typeof window.__broadcastApp.init === 'function') {
    await window.__broadcastApp.init();
  } else if (typeof window.__broadcastApp.start === 'function') {
    await window.__broadcastApp.start();
  } else {
    console.warn('No init/start method found on AzureBroadcastApp');
  }
}
