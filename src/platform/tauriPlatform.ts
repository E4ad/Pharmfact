/**
 * Implémentation des adapters pour Tauri (desktop)
 * Utilisé lorsque l'application tourne comme une application macOS .app
 */

import type {
  AppPlatform,
  AppStorageAdapter,
  AppFileAdapter,
  AppPdfAdapter,
  AppSystemAdapter,
  AppApiAdapter,
} from './types';
import type { AppState, Invoice, ExpenseReceipt } from '../storage/schema';
import type { GeocodeSuggestion } from '../hooks/useAddressAutocomplete';
import { createId } from '../services/ids';

// Import dynamique pour éviter les erreurs dans un environnement non-Tauri
// Tauri v2 : plugins séparés avec nouvelles APIs
interface TauriApis {
  invoke: <T>(command: string, args?: any) => Promise<T>;
  save: (options: any) => Promise<string | null>;
  open: (options: any) => Promise<string | string[] | null>;
  appDataDir: () => Promise<string>;
  // writeFile en Tauri v2 n'accepte que Uint8Array ou ReadableStream (pas string)
  writeFile: (path: string | URL, data: Uint8Array | ReadableStream<Uint8Array>, options?: any) => Promise<void>;
  readTextFile: (path: string | URL, options?: any) => Promise<string>;
  mkdir: (path: string | URL, options?: any) => Promise<void>;
  exists: (path: string | URL, options?: any) => Promise<boolean>;
  remove: (path: string | URL, options?: any) => Promise<void>;
  // Helper pour normaliser le retour de open (string | string[] | null -> string | null)
  openSingle: (options: any) => Promise<string | null>;
}

let tauriApis: TauriApis | null = null;

async function initTauriApis(): Promise<void> {
  if (tauriApis) return;
  
  // Tauri v2 : utilisation des plugins séparés
  // @tauri-apps/api/tauri est renommé en @tauri-apps/api/core
  // @tauri-apps/api/dialog et @tauri-apps/api/fs sont maintenant des plugins
  const [coreModule, dialogModule, pathModule, fsModule] = await Promise.all([
    import('@tauri-apps/api/core'),
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/api/path'),
    import('@tauri-apps/plugin-fs'),
  ]);
  
  tauriApis = {
    invoke: coreModule.invoke,
    save: dialogModule.save,
    open: dialogModule.open,
    // Helper pour normaliser le retour de open (string | string[] | null -> string | null)
    openSingle: async (options: any) => {
      const result = await dialogModule.open(options);
      return Array.isArray(result) ? result[0] ?? null : result;
    },
    appDataDir: pathModule.appDataDir,
    writeFile: fsModule.writeFile,
    readTextFile: fsModule.readTextFile,
    mkdir: fsModule.mkdir,
    exists: fsModule.exists,
    remove: fsModule.remove,
  };
}

// ============================================================================
// Chemin de stockage pour Tauri
// ============================================================================

const APP_DATA_DIR = 'Pharmfact';
const STATE_FILE = 'app-state.json';

async function getStatePath(): Promise<string> {
  await initTauriApis();
  const appDir = await tauriApis!.appDataDir();
  const dataDir = `${appDir}${APP_DATA_DIR}`;
  await tauriApis!.mkdir(dataDir, { recursive: true });
  return `${dataDir}/${STATE_FILE}`;
}

// ============================================================================
// Adapter de stockage pour Tauri
// ============================================================================

const tauriStorageAdapter: AppStorageAdapter = {
  async loadState(): Promise<AppState | null> {
    try {
      await initTauriApis();
      const statePath = await getStatePath();
      const existsState = await tauriApis!.exists(statePath);
      
      if (!existsState) {
        return null;
      }
      
      const content = await tauriApis!.readTextFile(statePath);
      return JSON.parse(content) as AppState;
    } catch (error) {
      console.error('Erreur de chargement de l\'état:', error);
      return null;
    }
  },

  async saveState(state: AppState): Promise<void> {
    try {
      await initTauriApis();
      const statePath = await getStatePath();
      const stateJson = JSON.stringify(state, null, 2);
      // writeFile en Tauri v2 n'accepte que Uint8Array ou ReadableStream
      const dataBytes = new TextEncoder().encode(stateJson);
      await tauriApis!.writeFile(statePath, dataBytes);
    } catch (error) {
      console.error('Erreur de sauvegarde de l\'état:', error);
      throw new Error('Impossible de sauvegarder les données');
    }
  },

  async exportState(): Promise<string> {
    try {
      const state = await this.loadState();
      return state ? JSON.stringify(state, null, 2) : '{}';
    } catch {
      return '{}';
    }
  },

  async importState(json: string): Promise<AppState> {
    const state = JSON.parse(json) as AppState;
    await this.saveState(state);
    return state;
  },

  async clear(): Promise<void> {
    try {
      await initTauriApis();
      const statePath = await getStatePath();
      await tauriApis!.remove(statePath);
    } catch (error) {
      // Ignorer si le fichier n'existe pas
      if (!String(error).includes('No such file')) {
        console.error('Erreur lors de la suppression de l\'état:', error);
      }
    }
  },
};

// ============================================================================
// Adapter de fichiers pour Tauri
// ============================================================================

const tauriFileAdapter: AppFileAdapter = {
  async download(params: { data: Blob | string; filename: string; mimeType: string }): Promise<void> {
    await initTauriApis();
    const { data, filename, mimeType } = params;
    
    // Convertir les données en Uint8Array
    const dataBytes = data instanceof Blob 
      ? new Uint8Array(await data.arrayBuffer())
      : new TextEncoder().encode(data as string);
    
    // Sauvegarder avec dialogue natif
    const filePath = await tauriApis!.save({
      filters: [{ name: filename, extensions: [mimeType.split('/')[1]] }],
    });
    
    if (filePath) {
      await tauriApis!.writeFile(filePath, dataBytes);
    }
  },

  async open(params?: { accept?: string[] }): Promise<File | null> {
    await initTauriApis();
    try {
      const filePath = await tauriApis!.openSingle({
        multiple: false,
        filters: params?.accept ? [{ name: 'Fichiers autorisés', extensions: params.accept }] : undefined,
      });
      
      if (!filePath) return null;
      
      // Créer un objet File compatible avec le code existant
      // Note: En Tauri, on retourne juste le chemin, le reste sera géré par l'adapter
      return new File([], filePath, { type: 'application/octet-stream' });
    } catch {
      return null;
    }
  },

  async readAsDataURL(file: File): Promise<string> {
    await initTauriApis();
    // En Tauri, file est en fait un objet avec un chemin
    const filePath = (file as unknown as { path?: string }).path;
    if (!filePath) {
      throw new Error('Fichier invalide');
    }
    
    const contents = await tauriApis!.readTextFile(filePath);
    // Retourner comme data URL (simplifié)
    return `data:text/plain;base64,${btoa(contents)}`;
  },

  async readAsText(file: File): Promise<string> {
    await initTauriApis();
    const filePath = (file as unknown as { path?: string }).path;
    if (!filePath) {
      throw new Error('Fichier invalide');
    }
    
    return await tauriApis!.readTextFile(filePath);
  },
};

// ============================================================================
// Adapter PDF pour Tauri
// ============================================================================

const tauriPdfAdapter: AppPdfAdapter = {
  async generateInvoicePdf(invoice: Invoice, state: AppState): Promise<Blob> {
    await initTauriApis();
    
    // Vérifier que Tauri APIs sont bien initialisées
    if (!tauriApis) {
      console.error('[PDF] Erreur: Tauri APIs non initialisées');
      throw new Error('Tauri non disponible');
    }
    
    // Utiliser le backend intégré pour générer le PDF
    
    // Appeler la commande Tauri pour générer le PDF (retourne base64)
    try {
      console.log('[PDF] Début génération PDF pour facture:', invoice.numero);
      console.log('[PDF] Appel invoke de generate_invoice_pdf');
      
      const startTime = Date.now();
      const pdfBase64: string = await tauriApis!.invoke('generate_invoice_pdf', {
        invoice,
        stateJson: JSON.stringify(state),
      });
      console.log('[PDF] invoke terminé en', Date.now() - startTime, 'ms');
      
      // Vérifier que la base64 n'est pas vide
      console.log('[PDF] Base64 reçu, longueur:', pdfBase64?.length);
      if (!pdfBase64 || pdfBase64.length < 100) {
        console.error('[PDF] Erreur: PDF base64 trop court (', pdfBase64?.length, 'bytes)');
        throw new Error('La génération du PDF a produit un résultat vide');
      }
      
      // Vérifier que ça commence par le header PDF après décodage
      let binaryString: string;
      try {
        console.log('[PDF] Début décodage base64, premier 50 chars:', pdfBase64.substring(0, 50));
        binaryString = atob(pdfBase64);
        console.log('[PDF] Base64 décodé avec succès, longueur:', binaryString.length);
      } catch (decodeError) {
        console.error('[PDF] Erreur décodage base64:', decodeError);
        console.error('[PDF] Base64 complet:', pdfBase64);
        throw new Error('Erreur de décodage du PDF');
      }
      
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Vérifier le header PDF (%PDF-)
      const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
      if (header !== '%PDF') {
        console.error('[PDF] Erreur: Buffer ne commence pas par %PDF- (header:', header, ')');
        throw new Error('Format PDF invalide: header manquant');
      }
      
      console.log('[PDF] PDF généré avec succès (', bytes.length, 'bytes, header:', header, ')');
      
      return new Blob([bytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('[PDF] Erreur génération PDF:', error);
      // Ne pas exposer les détails techniques à l'utilisateur
      throw new Error('Impossible de générer le PDF. Veuillez réessayer.');
    }
  },

  async downloadPdf(blob: Blob, filename: string): Promise<void> {
    await initTauriApis();
    
    try {
      console.log('[PDF] Début téléchargement:', filename);
      
      const dataBytes = new Uint8Array(await blob.arrayBuffer());
      
      // Vérifier qu'on a des données
      if (dataBytes.length === 0) {
        console.error('[PDF] Erreur: Blob vide à télécharger');
        throw new Error('Le PDF est vide');
      }
      
      // Vérifier le header PDF
      const header = String.fromCharCode(dataBytes[0], dataBytes[1], dataBytes[2], dataBytes[3]);
      if (header !== '%PDF') {
        console.error('[PDF] Erreur: Blob ne commence pas par %PDF- (header:', header, ')');
        throw new Error('Format PDF invalide');
      }
      
      // Sauvegarder avec dialogue natif
      const filePath = await tauriApis!.save({
        title: `Enregistrer ${filename}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      
      if (!filePath) {
        console.log('[PDF] Téléchargement annulé par l\'utilisateur');
        return; // Utilisateur a annulé
      }
      
      await tauriApis!.writeFile(filePath, dataBytes);
      console.log('[PDF] Téléchargement terminé:', filePath);
      
    } catch (error) {
      console.error('[PDF] Erreur téléchargement:', error);
      // Ne pas exposer les détails techniques
      throw new Error('Impossible d\'enregistrer le PDF. Veuillez réessayer.');
    }
  },
};

// ============================================================================
// Adapter système pour Tauri
// ============================================================================

const tauriSystemAdapter: AppSystemAdapter = {
  isDesktop(): boolean {
    return true;
  },

  getPlatformName(): 'browser' | 'tauri' | 'electron' {
    return 'tauri';
  },

  async showConfirm(message: string): Promise<boolean> {
    await initTauriApis();
    // Utiliser @tauri-apps/plugin-dialog
    const { confirm } = await import('@tauri-apps/plugin-dialog');
    return await confirm(message, { 
      title: 'Confirmation',
      okLabel: 'Oui',
      cancelLabel: 'Non'
    });
  },

  async showSaveDialog(options?: { filename?: string; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null> {
    await initTauriApis();
    try {
      const filePath = await tauriApis!.save({
        defaultPath: options?.filename,
        filters: options?.filters,
      });
      return filePath ?? null;
    } catch {
      return null;
    }
  },
};

// ============================================================================
// Adapter API pour Tauri
// ============================================================================

const tauriApiAdapter: AppApiAdapter = {
  async geocode(query: string): Promise<GeocodeSuggestion[]> {
    // En mode Tauri, le géocodage nécessite une API externe ou un service local
    // Pour l'instant, on retourne vide
    // TODO: Intégrer un service de géocodage comme Nominatim (OpenStreetMap)
    console.warn('[Tauri] Géocodage non implémenté. Utilisez la saisie manuelle.');
    return [];
  },

  async generateInvoicePdf(invoice: Invoice, state: AppState): Promise<Blob> {
    // Utiliser la commande Rust pour générer le PDF
    await initTauriApis();
    
    const pdfBase64: string = await tauriApis!.invoke('generate_invoice_pdf', {
      invoice,
      stateJson: JSON.stringify(state),
    });
    
    // Décoder la base64 et créer un Blob
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: 'application/pdf' });
  },

  async uploadExpenseReceipt(expenseId: string, file: File): Promise<ExpenseReceipt> {
    await initTauriApis();
    
    // Pour l'instant, créer un receipt local
    // TODO: Sauvegarder le fichier dans le système de fichiers Tauri
    // et mettre à jour storageUrl avec le chemin réel
    const receipt: ExpenseReceipt = {
      id: createId('rec'),
      expenseId,
      missionId: '', // À déterminer depuis le contexte
      fileName: file.name,
      fileType: file.type as any,
      fileSizeBytes: file.size,
      storageUrl: `receipts/${expenseId}/${Date.now()}-${file.name}`,
      uploadedAt: new Date().toISOString(),
      ocrStatus: 'NOT_PROCESSED',
    };
    
    return receipt;
  },

  async getExpenseReceipts(expenseId: string): Promise<ExpenseReceipt[]> {
    // TODO: Implémenter la récupération depuis le système de fichiers
    // Pour l'instant, retourner vide
    return [];
  },

  async deleteExpenseReceipt(receiptId: string): Promise<void> {
    // TODO: Supprimer le fichier du système de fichiers
    console.warn('[Tauri] Suppression des reçus non implémentée');
  },

  getReceiptDownloadUrl(receiptId: string): string {
    // En mode Tauri, on ne peut pas servir via HTTP
    // Retourner une URL tauri: ou utiliser le système de fichiers
    // Pour l'instant, retourner une URL factice
    console.warn('[Tauri] Téléchargement des reçus non implémenté');
    return `tauri://receipts/${receiptId}`;
  },

  async checkHealth(): Promise<boolean> {
    // En mode Tauri, le "backend" (Rust) est toujours disponible
    return true;
  },
};

// ============================================================================
// Plateforme Tauri complète
// ============================================================================

export const tauriPlatform: AppPlatform = {
  storage: tauriStorageAdapter,
  files: tauriFileAdapter,
  pdf: tauriPdfAdapter,
  system: tauriSystemAdapter,
  api: tauriApiAdapter,
};
