/**
 * Types pour l'abstraction de plateforme
 * Permet de supporter web (navigateur) et desktop (Tauri)
 */

import type { AppState, Invoice, Pharmacien, Pharmacie, Mission, ExpenseReceipt, OpqPharmacistRegistryEntry } from '../storage/schema';
import type { GeocodeSuggestion } from '../hooks/useAddressAutocomplete';

export type RouteDistanceInput = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
};

export type RouteDistanceResult = {
  distanceKm: number;
  distanceAllerKm: number;
  source: 'route';
};

// ============================================================================
// Types pour les adapters
// ============================================================================

export interface AppStorageAdapter {
  /** Charger l'état complet de l'application */
  loadState(): Promise<AppState | null>;
  
  /** Sauvegarder l'état complet */
  saveState(state: AppState): Promise<void>;
  
  /** Exporter l'état sous forme de JSON */
  exportState(): Promise<string>;
  
  /** Importer un état depuis JSON */
  importState(json: string): Promise<AppState>;
  
  /** Effacer complètement l'état */
  clear(): Promise<void>;
}

export interface AppFileAdapter {
  /** Télécharger un fichier */
  download(params: {
    data: Blob | string | Uint8Array;
    filename: string;
    mimeType: string;
  }): Promise<boolean>;
  
  /** Ouvrir un dialogue de sélection de fichier */
  open(params?: { accept?: string[] }): Promise<File | null>;
  
  /** Lire un fichier comme Data URL */
  readAsDataURL(file: File): Promise<string>;
  
  /** Lire un fichier comme texte */
  readAsText(file: File): Promise<string>;
}

export interface AppPdfAdapter {
  /** Générer un PDF de facture */
  generateInvoicePdf(invoice: Invoice, state: AppState): Promise<Blob>;
  
  /** Télécharger un PDF */
  downloadPdf(blob: Blob, filename: string): Promise<boolean>;
}

export interface AppSystemAdapter {
  /** Savoir si on est en mode desktop */
  isDesktop(): boolean;
  
  /** Nom de la plateforme */
  getPlatformName(): 'browser' | 'tauri' | 'electron';
  
  /** Afficher une boîte de confirmation */
  showConfirm(message: string): Promise<boolean>;
  
  /** Afficher un dialogue de sauvegarde */
  showSaveDialog(options?: { filename?: string; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null>;
}

export interface AppApiAdapter {
  /** Géocodage d'une adresse */
  geocode(query: string): Promise<GeocodeSuggestion[]>;

  /** Distance routière aller-retour entre deux coordonnées */
  routeDistance(input: RouteDistanceInput): Promise<RouteDistanceResult | null>;

  /** Récupérer l'index public OPQ des pharmaciens, sur action utilisateur */
  fetchOpqPharmacistRegistry(): Promise<OpqPharmacistRegistryEntry[]>;

  /**
   * Génère un PDF de facture
   * @param invoice - Facture à générer
   * @param state - État complet de l'application
   * @returns Blob du PDF
   */
  generateInvoicePdf(invoice: Invoice, state: AppState): Promise<Blob>;

  /**
   * Télécharge un justificatif de dépense
   * @param expenseId - ID de la dépense
   * @param file - Fichier à uploader
   * @returns Justificatif enregistré
   */
  uploadExpenseReceipt(expenseId: string, file: File): Promise<ExpenseReceipt>;

  /**
   * Récupère les justificatifs d'une dépense
   * @param expenseId - ID de la dépense
   * @returns Liste des justificatifs
   */
  getExpenseReceipts(expenseId: string): Promise<ExpenseReceipt[]>;

  /**
   * Supprime un justificatif
   * @param receiptId - ID du justificatif
   */
  deleteExpenseReceipt(receiptId: string): Promise<void>;

  /**
   * Obtient l'URL de téléchargement d'un justificatif
   * @param receiptId - ID du justificatif
   * @returns URL de téléchargement
   */
  getReceiptDownloadUrl(receiptId: string): string;

  /**
   * Vérifie la disponibilité du backend
   * @returns true si le backend est disponible
   */
  checkHealth(): Promise<boolean>;
}

// ============================================================================
// Type principal de la plateforme
// ============================================================================

export interface AppPlatform {
  storage: AppStorageAdapter;
  files: AppFileAdapter;
  pdf: AppPdfAdapter;
  system: AppSystemAdapter;
  api: AppApiAdapter;
}

// ============================================================================
// Type pour la migration et seed data
// ============================================================================

export interface MigrationCandidate {
  version?: number;
  [key: string]: unknown;
}
