import type { AppState, Invoice } from '../storage/schema';
import { getAppState } from '../storage/localStore';
import { getPlatform } from './platformService';

/**
 * Base URL de l'API - Utilisée UNIQUEMENT en mode browser
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Construit une URL d'API - Utilisée UNIQUEMENT en mode browser
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Vérifie la disponibilité du backend - Utilisée UNIQUEMENT en mode browser
 */
export async function assertBackendAvailable(): Promise<void> {
  try {
    const response = await fetch(apiUrl('/health'));
    if (!response.ok) throw new Error(`Healthcheck failed: ${response.status}`);
  } catch (error) {
    console.error('[qa-backend-healthcheck-failed]', error);
    const unavailable = new Error('Serveur API inaccessible');
    unavailable.name = 'BACKEND_UNAVAILABLE';
    throw unavailable;
  }
}

/**
 * Télécharge un PDF de facture
 * En mode Tauri : utilise l'adapter de plateforme
 * En mode Browser : utilise l'API backend
 */
export async function downloadInvoicePdf(invoiceId: string, state?: AppState): Promise<Blob> {
  // En mode Tauri, utiliser l'adapter de plateforme
  const platform = getPlatform();
  const invoice = (state ?? getAppState()).invoices.find(i => i.id === invoiceId);
  
  if (!invoice) {
    throw new Error(`Facture ${invoiceId} introuvable`);
  }
  
  // Utiliser l'adapter PDF qui gère les deux modes
  return platform.pdf.generateInvoicePdf(invoice, state ?? getAppState());
}
