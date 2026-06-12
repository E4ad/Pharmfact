/**
 * Types pour l'API backend
 * Standard de l'industrie : Interfaces claires et typées
 */

import type { AppState } from '../../storage/schema';
import type { GeocodeSuggestion } from '../../hooks/useAddressAutocomplete';
import type { ExpenseReceipt } from '../../storage/schema';
import type { RouteDistanceInput, RouteDistanceResult } from '../../platform/types';

export interface AppApiAdapter {
  /**
   * Géocodage d'une adresse
   * @param query - Requête de recherche
   * @returns Liste de suggestions
   */
  geocode(query: string): Promise<GeocodeSuggestion[]>;

  /**
   * Calcule une distance routière aller-retour entre deux coordonnées.
   */
  routeDistance(input: RouteDistanceInput): Promise<RouteDistanceResult | null>;

  /**
   * Génère un PDF de facture
   * @param invoiceId - ID de la facture
   * @param state - État complet de l'application (pour contexte)
   * @returns Blob du PDF
   */
  generateInvoicePdf(invoiceId: string, state: AppState): Promise<Blob>;

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

/**
 * Type pour les adapters de plateforme étendus avec API
 */
export type AppPlatformWithApi = {
  api: AppApiAdapter;
};
