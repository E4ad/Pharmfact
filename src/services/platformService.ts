/**
 * Service d'injection de plateforme
 * Détecte automatiquement si l'application tourne dans un navigateur ou Tauri
 * et fournit les adapters appropriés
 * 
 * Standard de l'industrie :
 * - Chargement dynamique des modules spécifiques à la plateforme
 * - Évite les erreurs de build en mode non-Tauri
 * - Détection d'environnement au runtime
 */

import { browserPlatform } from '../platform/browserPlatform';
import type { AppPlatform } from '../platform/types';

// Détection de Tauri v2
function isTauri(): boolean {
  return typeof window !== 'undefined' && (
    !!window.__TAURI_INTERNALS__ || 
    !!window.__TAURI__
  );
}

// Cache pour la plateforme Tauri (chargée dynamiquement)
let tauriPlatformCache: AppPlatform | null = null;
let platformInitializationPromise: Promise<AppPlatform> | null = null;

// Initialiser la plateforme Tauri de manière lazy
async function ensureTauriPlatform(): Promise<AppPlatform> {
  if (tauriPlatformCache) {
    return tauriPlatformCache;
  }
  
  if (!platformInitializationPromise) {
    platformInitializationPromise = (async () => {
      const { tauriPlatform } = await import('../platform/tauriPlatform');
      tauriPlatformCache = tauriPlatform;
      console.log('[Platform] Tauri détecté, utilisation des adapters desktop');
      return tauriPlatformCache;
    })();
  }
  
  return platformInitializationPromise;
}

// Déterminer la plateforme actuelle (synchrone si déjà chargée)
function getResolvedPlatformSync(): AppPlatform {
  // Si on est en mode browser, retourner directement
  if (!isTauri()) {
    return browserPlatform;
  }
  
  // Si on est en mode Tauri et que tauriPlatform est déjà chargé, le retourner
  if (tauriPlatformCache) {
    return tauriPlatformCache;
  }
  
  ensureTauriPlatform().catch((error) => {
    console.error('[Platform] Échec du chargement des adapters desktop:', error);
  });
  
  // Retourner browserPlatform comme fallback
  // Note: browserPlatform va détecter qu'on est en desktop et lever une erreur claire
  console.warn('[Platform] Environnement desktop détecté mais adapters non chargés');
  return browserPlatform;
}

// Version asynchrone pour une utilisation sûre
async function getResolvedPlatformAsync(): Promise<AppPlatform> {
  if (isTauri()) {
    return ensureTauriPlatform();
  }
  return browserPlatform;
}

// ============================================================================
// Fonctions d'accès
// ============================================================================

/**
 * Définir manuellement la plateforme (pour les tests)
 * Note: En production, la plateforme est déterminée automatiquement
 */
export function setPlatform(platform: AppPlatform): void {
  // En mode test, on peut forcer une plateforme
  tauriPlatformCache = platform;
  platformInitializationPromise = Promise.resolve(platform);
}

/**
 * Obtenir la plateforme actuelle (version synchrone)
 * 
 * @returns La plateforme (browserPlatform si Tauri n'est pas initialisé)
 * @remarks En mode Tauri, si la plateforme n'est pas encore chargée,
 *         cette fonction retourne browserPlatform qui va lever une erreur
 *         si on essaie d'utiliser des fonctionnalités Tauri.
 *         Utilisez getPlatformAsync() pour une version asynchrone sûre.
 */
export function getPlatform(): AppPlatform {
  return getResolvedPlatformSync();
}

/**
 * Obtenir la plateforme actuelle (version asynchrone sûre)
 * 
 * @returns Promise résolue avec la plateforme
 * @remarks Cette version garantit que tauriPlatform est chargé en mode Tauri
 */
export async function getPlatformAsync(): Promise<AppPlatform> {
  return getResolvedPlatformAsync();
}

/**
 * Savoir si on est en mode desktop
 */
export function isDesktop(): boolean {
  return getPlatform().system.isDesktop();
}

// ============================================================================
// Export des adapters pour commodité
// ============================================================================

// Adapters synchrones (utilisent getPlatform() synchrone)
export const storage = { get: () => getPlatform().storage };
export const files = { get: () => getPlatform().files };
export const pdf = { get: () => getPlatform().pdf };
export const system = { get: () => getPlatform().system };
export const api = { get: () => getPlatform().api };

// ============================================================================
// Hook React pour utiliser la plateforme
// ============================================================================

import { useEffect, useState } from 'react';

export function usePlatform(): AppPlatform {
  // Utiliser getPlatform() qui retourne la plateforme synchronement
  // Si tauriPlatform n'est pas encore chargé, ça retournera browserPlatform
  // et se rechargera quand tauriPlatform sera disponible
  const [platform, setPlatform] = useState<AppPlatform>(() => getPlatform());
  
  useEffect(() => {
    // Vérifier périodiquement si la plateforme a changé
    // (par exemple, après le chargement de tauriPlatform)
    const interval = setInterval(() => {
      const current = getPlatform();
      if (current !== platform) {
        setPlatform(current);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [platform]);
  
  return platform;
}

export default {
  getPlatform,
  getPlatformAsync,
  setPlatform,
  isDesktop,
  storage,
  files,
  pdf,
  system,
  api,
};
