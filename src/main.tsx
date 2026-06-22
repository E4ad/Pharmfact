import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';

const BOOTSTRAP_FALLBACK_HTML = `
  <main style="min-height:100vh;display:grid;place-items:center;padding:2rem;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#111827;">
    <section style="max-width:34rem;text-align:center;">
      <h1 style="margin:0 0 .75rem;font-size:1.5rem;">Démarrage de Pharmfact</h1>
      <p style="margin:0;color:#4b5563;">Chargement de l’interface...</p>
    </section>
  </main>
`;

let tauriPreloadPromise: Promise<void> | null = null;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && (!!window.__TAURI_INTERNALS__ || !!window.__TAURI__);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderFatalError(error: unknown): void {
  const root = document.getElementById('root');
  if (!root) return;

  const message = escapeHtml(error instanceof Error ? error.message : 'Erreur inconnue');
  root.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:2rem;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff7ed;color:#7c2d12;">
      <section style="max-width:38rem;">
        <p style="margin:0 0 .5rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;">Erreur de chargement</p>
        <h1 style="margin:0 0 .75rem;font-size:1.6rem;color:#7c2d12;">L’application n’a pas pu démarrer.</h1>
        <p style="margin:0 0 1rem;color:#9a3412;">${message}</p>
        <button type="button" onclick="window.location.reload()" style="border:0;border-radius:8px;background:#9a3412;color:white;padding:.75rem 1rem;font-weight:700;cursor:pointer;">Réessayer</button>
      </section>
    </main>
  `;
}

function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    console.error('[Main] Erreur globale:', event.error ?? event.message);
    renderFatalError(event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Main] Promesse rejetée:', event.reason);
    renderFatalError(event.reason);
  });
}

function preloadTauriPlatform(): Promise<void> {
  if (!isTauriRuntime()) return Promise.resolve();
  if (tauriPreloadPromise) return tauriPreloadPromise;

  tauriPreloadPromise = Promise.all([
    import('./platform/tauriPlatform'),
    import('./services/platformService'),
  ]).then(([{ tauriPlatform }, { setPlatform }]) => {
    setPlatform(tauriPlatform);
    console.info('[Main] tauriPlatform pré-chargé avec succès');
  }).catch((error) => {
    console.error('[Main] Échec du pré-chargement de tauriPlatform:', error);
  });

  return tauriPreloadPromise;
}

async function initApp() {
  installGlobalErrorHandlers();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Élement root introuvable dans le DOM');
  }

  rootElement.innerHTML = BOOTSTRAP_FALLBACK_HTML;
  preloadTauriPlatform();

  const { default: App } = await import('./app/App');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

initApp().catch((error) => {
  console.error('[Main] Erreur fatale lors de l\'initialisation:', error);
  renderFatalError(error);
});
