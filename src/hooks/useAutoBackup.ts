/**
 * Hook pour la sauvegarde automatique de l'état de l'application.
 * Sauvegarde dans IndexedDB avec fallback vers localStorage.
 */

import { useEffect, useRef } from 'react';
import { getAppState, setAppState } from '../storage/localStore';
import { saveToIndexedDB, isIndexedDBSupported } from '../storage/indexedDB';

const AUTO_BACKUP_INTERVAL_MS = 30 * 1000; // 30 secondes
const AUTO_BACKUP_KEY = 'autoBackup';

type Timeout = ReturnType<typeof setTimeout>;

/**
 * Sauvegarde automatique de l'état avec fallback.
 * - Sauvegarde dans IndexedDB si disponible
 * - Sinon, sauvegarde dans localStorage
 * - Utilise une clé différente pour éviter les conflits
 */
async function performAutoBackup(): Promise<void> {
  try {
    const state = getAppState();
    const backupData = {
      state,
      timestamp: new Date().toISOString(),
    };
    
    if (isIndexedDBSupported()) {
      // Sauvegarde dans un store IndexedDB séparé pour les backups
      const dbName = 'missionAppBackups';
      const storeName = 'autoBackups';
      
      return new Promise((resolve) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
        
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const saveRequest = store.put(backupData, AUTO_BACKUP_KEY);
          
          saveRequest.onsuccess = () => {
            // Nettoyage des anciens backups (garder les 5 derniers)
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const allBackups = getAllRequest.result;
              if (allBackups.length > 5) {
                // Supprimer les plus anciens
                const toDelete = allBackups.slice(0, allBackups.length - 5);
                toDelete.forEach(backup => {
                  if (backup.timestamp) {
                    store.delete(backup.timestamp);
                  }
                });
              }
            };
            resolve();
          };
          
          saveRequest.onerror = () => {
            // Fallback vers localStorage
            try {
              localStorage.setItem(`${AUTO_BACKUP_KEY}_${Date.now()}`, JSON.stringify(backupData));
            } catch {
              // Ignorer les erreurs de stockage
            }
            resolve();
          };
        };
        
        request.onerror = () => {
          // Fallback vers localStorage
          try {
            localStorage.setItem(`${AUTO_BACKUP_KEY}_${Date.now()}`, JSON.stringify(backupData));
          } catch {
            // Ignorer les erreurs de stockage
          }
          resolve();
        };
      });
    } else {
      // Sauvegarde directe dans localStorage
      try {
        localStorage.setItem(`${AUTO_BACKUP_KEY}_${Date.now()}`, JSON.stringify(backupData));
      } catch {
        // Ignorer les erreurs de stockage
      }
    }
  } catch {
    // Ignorer les erreurs
  }
}

/**
 * Hook pour gérer la sauvegarde automatique.
 * - Sauvegarde périodiquement (toutes les 30 secondes)
 * - Sauvegarde avant la fermeture de l'onglet (beforeunload)
 * - Respecte les paramètres de sauvegarde automatique de l'utilisateur
 */
export function useAutoBackup(enabled: boolean = true): void {
  const backupTimerRef = useRef<Timeout | null>(null);
  const isBackupEnabledRef = useRef(enabled);

  useEffect(() => {
    isBackupEnabledRef.current = enabled;
    
    if (!enabled) {
      // Arrêter le timer si désactivé
      if (backupTimerRef.current) {
        clearInterval(backupTimerRef.current);
        backupTimerRef.current = null;
      }
      return;
    }

    // Sauvegarde périodique
    backupTimerRef.current = setInterval(() => {
      performAutoBackup().catch(() => {});
    }, AUTO_BACKUP_INTERVAL_MS);

    // Sauvegarde avant la fermeture de l'onglet
    const handleBeforeUnload = () => {
      performAutoBackup().catch(() => {});
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (backupTimerRef.current) {
        clearInterval(backupTimerRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);
}

/**
 * Récupère la dernière sauvegarde automatique si disponible.
 * Utile pour la restauration après un crash.
 */
export async function getLatestAutoBackup(): Promise<unknown | null> {
  try {
    if (isIndexedDBSupported()) {
      const dbName = 'missionAppBackups';
      const storeName = 'autoBackups';
      
      return new Promise((resolve) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = () => resolve(null);
        
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(AUTO_BACKUP_KEY);
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result?.state ?? null);
          };
          
          getRequest.onerror = () => resolve(null);
        };
      });
    } else {
      // Chercher dans localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith(AUTO_BACKUP_KEY));
      if (keys.length === 0) return null;
      
      // Trouver le backup le plus récent
      const latestKey = keys.reduce((latest, key) => {
        const timestamp = parseInt(key.split('_')[1] || '0');
        const latestTimestamp = parseInt(latest.split('_')[1] || '0');
        return timestamp > latestTimestamp ? key : latest;
      }, keys[0]);
      
      const backupData = localStorage.getItem(latestKey);
      return backupData ? JSON.parse(backupData).state : null;
    }
  } catch {
    return null;
  }
}
