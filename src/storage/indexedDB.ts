/**
 * Service IndexedDB pour le stockage des données de l'application.
 * Offre une interface similaire à localStorage mais avec une capacité accrue.
 */

const DB_NAME = 'missionAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const APP_STORAGE_KEY = 'missionAppState';

let db: IDBDatabase | null = null;
let isInitialized = false;

/**
 * Initialise la base de données IndexedDB.
 * Crée la base si elle n'existe pas.
 */
async function initDB(): Promise<IDBDatabase> {
  if (isInitialized && db) {
    return db;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Erreur lors de l\'ouverture de IndexedDB:', event);
      // Fallback : on retourne null et on utilisera localStorage
      isInitialized = true;
      reject(new Error('IndexedDB non disponible'));
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      isInitialized = true;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Créer l'object store si nécessaire
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Sauvegarde l'état dans IndexedDB.
 * Utilise localStorage comme fallback si IndexedDB n'est pas disponible.
 */
export async function saveToIndexedDB(state: unknown): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, APP_STORAGE_KEY);

      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        console.error('Erreur lors de la transaction IndexedDB:', event);
        reject(transaction.error ?? new Error('Transaction IndexedDB échouée'));
      };
      request.onerror = (event) => {
        console.error('Erreur lors de la sauvegarde dans IndexedDB:', event);
        // Fallback vers localStorage
        try {
          localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
          resolve();
        } catch (fallbackError) {
          reject(fallbackError);
        }
      };
    });
  } catch {
    // Si IndexedDB échoue, on utilise localStorage
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans localStorage:', error);
    }
  }
}

/**
 * Charge l'état depuis IndexedDB.
 * Utilise localStorage comme fallback si IndexedDB n'est pas disponible.
 */
export async function loadFromIndexedDB(): Promise<unknown | null> {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(APP_STORAGE_KEY);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Essayer localStorage comme fallback
          const localData = localStorage.getItem(APP_STORAGE_KEY);
          resolve(localData ? JSON.parse(localData) : null);
        }
      };

      request.onerror = () => {
        // Fallback vers localStorage
        const localData = localStorage.getItem(APP_STORAGE_KEY);
        resolve(localData ? JSON.parse(localData) : null);
      };
    });
  } catch {
    // Fallback vers localStorage
    const localData = localStorage.getItem(APP_STORAGE_KEY);
    return localData ? JSON.parse(localData) : null;
  }
}

/**
 * Supprime l'état de IndexedDB et localStorage.
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(APP_STORAGE_KEY);

      request.onsuccess = () => {
        localStorage.removeItem(APP_STORAGE_KEY);
        resolve();
      };
      request.onerror = (event) => {
        console.error('Erreur lors de la suppression dans IndexedDB:', event);
        localStorage.removeItem(APP_STORAGE_KEY);
        resolve();
      };
    });
  } catch {
    localStorage.removeItem(APP_STORAGE_KEY);
  }
}

/**
 * migre les données de localStorage vers IndexedDB.
 * Appelé automatiquement lors du premier chargement.
 */
export async function migrateFromLocalStorageToIndexedDB(): Promise<void> {
  const localData = localStorage.getItem(APP_STORAGE_KEY);
  if (!localData) {
    return;
  }

  try {
    const database = await initDB();
    const state = JSON.parse(localData);
    
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, APP_STORAGE_KEY);

      request.onsuccess = () => {
        // On ne supprime pas localStorage pour garder un fallback
        resolve();
      };

      request.onerror = () => {
        // Échec de migration, on garde localStorage
        resolve();
      };
    });
  } catch {
    // IndexedDB non disponible, on garde localStorage
  }
}

/**
 * Vérifie si IndexedDB est disponible dans le navigateur.
 */
export function isIndexedDBSupported(): boolean {
  try {
    return 'indexedDB' in window && typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
