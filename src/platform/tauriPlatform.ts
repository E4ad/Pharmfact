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
  RouteDistanceResult,
} from './types';
import type { AppState, Invoice, ExpenseReceipt, OpqPharmacistRegistryEntry } from '../storage/schema';
import type { GeocodeSuggestion } from '../hooks/useAddressAutocomplete';
import { createId } from '../services/ids';
import { renderInvoicePdfBlob } from '../services/invoicePdfRenderer';

// Import dynamique pour éviter les erreurs dans un environnement non-Tauri
// Tauri v2 : plugins séparés avec nouvelles APIs
interface TauriApis {
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
let tauriInvoke: (<T>(command: string, args?: any) => Promise<T>) | null = null;

function ensurePdfFilename(filename: string): string {
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
}

async function initTauriInvoke(): Promise<void> {
  if (tauriInvoke) return;
  const coreModule = await import('@tauri-apps/api/core');
  tauriInvoke = coreModule.invoke;
}

async function initTauriApis(): Promise<void> {
  if (tauriApis) return;
  
  await initTauriInvoke();

  const [pathModule, dialogModule, fsModule] = await Promise.all([
    import('@tauri-apps/api/path'),
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  
  tauriApis = {
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

function parseTauriStatePayload(payload: string | null): AppState | null {
  const trimmed = payload?.trim() ?? '';
  if (!trimmed || trimmed === 'null' || trimmed === '{}') return null;
  return JSON.parse(trimmed) as AppState;
}

// ============================================================================
// Adapter de stockage pour Tauri
// ============================================================================

const tauriStorageAdapter: AppStorageAdapter = {
  async loadState(): Promise<AppState | null> {
    try {
      await initTauriInvoke();
      const payload = await tauriInvoke!<string>('load_state');
      return parseTauriStatePayload(payload);
    } catch (error) {
      console.error('Erreur de chargement de l\'état:', error);
      throw new Error('Impossible de charger les données locales');
    }
  },

  async saveState(state: AppState): Promise<void> {
    try {
      await initTauriInvoke();
      await tauriInvoke!('save_state', { state: JSON.stringify(state, null, 2) });
    } catch (error) {
      console.error('Erreur de sauvegarde de l\'état:', error);
      throw new Error('Impossible de sauvegarder les données');
    }
  },

  async exportState(): Promise<string> {
    try {
      await initTauriInvoke();
      const payload = await tauriInvoke!<string>('export_state');
      return parseTauriStatePayload(payload) ? payload : '{}';
    } catch (error) {
      console.error('Erreur d\'export de l\'état:', error);
      throw new Error('Impossible d\'exporter les données');
    }
  },

  async importState(json: string): Promise<AppState> {
    try {
      const state = JSON.parse(json) as AppState;
      await initTauriInvoke();
      await tauriInvoke!('import_state', { json });
      return state;
    } catch (error) {
      console.error('Erreur d\'import de l\'état:', error);
      throw new Error('Impossible d\'importer les données');
    }
  },

  async clear(): Promise<void> {
    try {
      await initTauriInvoke();
      await tauriInvoke!('clear_state');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'état:', error);
      throw new Error('Impossible d\'effacer les données');
    }
  },
};

// ============================================================================
// Adapter de fichiers pour Tauri
// ============================================================================

const tauriFileAdapter: AppFileAdapter = {
  async download(params: { data: Blob | string | Uint8Array; filename: string; mimeType: string }): Promise<boolean> {
    await initTauriApis();
    const { data, filename, mimeType } = params;
    
    // Convertir les données en Uint8Array
    const dataBytes = data instanceof Blob
      ? new Uint8Array(await data.arrayBuffer())
      : data instanceof Uint8Array
        ? data
        : new TextEncoder().encode(data);
    
    // Sauvegarder avec dialogue natif
    const extension = filename.includes('.') ? filename.split('.').pop() || mimeType.split('/')[1] : mimeType.split('/')[1];
    const filePath = await tauriApis!.save({
      defaultPath: filename,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    
    if (!filePath) {
      return false;
    }

    await tauriApis!.writeFile(filePath, dataBytes);
    return true;
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
    try {
      console.log('[PDF] Début génération PDF pour facture:', invoice.numero);
      return await renderInvoicePdfBlob(invoice, state);
    } catch (error) {
      console.error('[PDF] Erreur génération PDF:', error);
      throw new Error('Impossible de générer le PDF. Veuillez réessayer.');
    }
  },

  async downloadPdf(blob: Blob, filename: string): Promise<boolean> {
    await initTauriApis();
    
    // Vérifier que Tauri APIs sont bien initialisées
    if (!tauriApis) {
      console.error('[PDF] Erreur: APIs desktop non initialisées dans downloadPdf');
      throw new Error('Environnement desktop non disponible');
    }
    
    try {
      console.log('[PDF] Début téléchargement:', filename, 'Blob taille:', blob.size);
      
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
      const pdfFilename = ensurePdfFilename(filename);
      const filePath = await tauriApis!.save({
        title: `Enregistrer ${pdfFilename}`,
        defaultPath: pdfFilename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      
      if (!filePath) {
        console.info('[PDF] Enregistrement annulé par l\'utilisateur');
        return false;
      }
      
      await tauriApis!.writeFile(filePath, dataBytes);
      console.log('[PDF] Téléchargement terminé:', filePath);
      return true;
      
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
    try {
      await initTauriInvoke();
      return await tauriInvoke!<GeocodeSuggestion[]>('geocode_address', { query });
    } catch {
      return [];
    }
  },

  async routeDistance(input) {
    try {
      await initTauriInvoke();
      return await tauriInvoke!<RouteDistanceResult | null>('route_distance', { input });
    } catch {
      return null;
    }
  },

  async fetchOpqPharmacistRegistry(): Promise<OpqPharmacistRegistryEntry[]> {
    try {
      await initTauriInvoke();
      return await tauriInvoke!<OpqPharmacistRegistryEntry[]>('fetch_opq_pharmacist_registry');
    } catch {
      return [];
    }
  },

  async generateInvoicePdf(invoice: Invoice, state: AppState): Promise<Blob> {
    // Utiliser la commande Rust pour générer le PDF
    await initTauriInvoke();
    
    const pdfBase64: string = await tauriInvoke!('generate_invoice_pdf', {
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
