import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/globals.css';

// Fonction pour initialiser l'application
async function initApp() {
  // Pré-charger tauriPlatform si on est en mode Tauri
  // Cela évite le problème de détection asynchrone de la plateforme
  if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
    try {
      // Charger tauriPlatform et platformService de manière préventive
      const [{ tauriPlatform }, { setPlatform }] = await Promise.all([
        import('./platform/tauriPlatform'),
        import('./services/platformService')
      ]);
      setPlatform(tauriPlatform);
      console.log('[Main] tauriPlatform pré-chargé avec succès');
    } catch (error) {
      console.error('[Main] Échec du pré-chargement de tauriPlatform:', error);
    }
  }
  
  // Démarrer React
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Élement root introuvable dans le DOM');
  }
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// Démarrer l'application
initApp().catch((error) => {
  console.error('[Main] Erreur fatale lors de l\'initialisation:', error);
  // Afficher un message d'erreur à l'utilisateur
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 2rem; color: #d32f2f; font-family: system-ui, sans-serif;">
        <h1>Erreur de chargement</h1>
        <p>Une erreur est survenue lors du chargement de l'application.</p>
      </div>
    `;
  }
});
