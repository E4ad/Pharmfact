/**
 * Implémentation des adapters pour le navigateur web
 * Utilisé lorsque l'application tourne dans un navigateur classique
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
import { APP_STORAGE_KEY } from '../storage/schema';
import type { GeocodeSuggestion } from '../hooks/useAddressAutocomplete';
import { renderInvoicePdfBlob } from '../services/invoicePdfRenderer';

// ============================================================================
// Adapter de stockage pour le navigateur (localStorage)
// ============================================================================

const browserStorageAdapter: AppStorageAdapter = {
  async loadState(): Promise<AppState | null> {
    try {
      const raw = localStorage.getItem(APP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async saveState(state: AppState): Promise<void> {
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Erreur de sauvegarde dans localStorage:', error);
      throw new Error('Impossible de sauvegarder les données');
    }
  },

  async exportState(): Promise<string> {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    return raw ?? '{}';
  },

  async importState(json: string): Promise<AppState> {
    const state = JSON.parse(json) as AppState;
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    return state;
  },

  async clear(): Promise<void> {
    localStorage.removeItem(APP_STORAGE_KEY);
  },
};

// ============================================================================
// Adapter de fichiers pour le navigateur
// ============================================================================

const browserFileAdapter: AppFileAdapter = {
  async download(params: { data: Blob | string; filename: string; mimeType: string }): Promise<boolean> {
    const { data, filename, mimeType } = params;
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Nettoyer après un délai pour éviter les fuites mémoire
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return true;
  },

  async open(params?: { accept?: string[] }): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (params?.accept) {
        input.accept = params.accept.join(',');
      }
      
      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };
      
      input.click();
    });
  },

  async readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },
};

// ============================================================================
// Adapter PDF pour le navigateur (rendu local du template HTML)
// ============================================================================

const browserPdfAdapter: AppPdfAdapter = {
  async generateInvoicePdf(invoice: Invoice, state: AppState): Promise<Blob> {
    if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
      throw new Error('[Platform Error] browserPlatform.pdf.generateInvoicePdf appelé en mode Tauri. Utilisez getPlatformAsync() ou attendez que tauriPlatform soit initialisé.');
    }

    return renderInvoicePdfBlob(invoice, state);
  },

  async downloadPdf(blob: Blob, filename: string): Promise<boolean> {
    const pdfFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    await browserFileAdapter.download({
      data: blob,
      filename: pdfFilename,
      mimeType: 'application/pdf',
    });
    return true;
  },
};

// ============================================================================
// Adapter système pour le navigateur
// ============================================================================

const browserSystemAdapter: AppSystemAdapter = {
  isDesktop(): boolean {
    return false;
  },

  getPlatformName(): 'browser' | 'tauri' | 'electron' {
    return 'browser';
  },

  async showConfirm(message: string): Promise<boolean> {
    return window.confirm(message);
  },

  async showSaveDialog(): Promise<string | null> {
    // Non supporté dans le navigateur classique
    return null;
  },
};

// ============================================================================
// Adapter API pour le navigateur
// ============================================================================

const browserApiAdapter: AppApiAdapter = {
  async geocode(query: string): Promise<GeocodeSuggestion[]> {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload) ? payload : payload.results ?? [];
    } catch {
      return [];
    }
  },

  async routeDistance(input) {
    try {
      const params = new URLSearchParams({
        fromLat: String(input.fromLat),
        fromLng: String(input.fromLng),
        toLat: String(input.toLat),
        toLng: String(input.toLng),
      });
      const response = await fetch(`/api/route-distance?${params.toString()}`);
      if (!response.ok) return null;
      const payload = await response.json();
      return Number.isFinite(payload.distanceKm) && Number.isFinite(payload.distanceAllerKm)
        ? { distanceKm: payload.distanceKm, distanceAllerKm: payload.distanceAllerKm, source: 'route' as const }
        : null;
    } catch {
      return null;
    }
  },

  async fetchOpqPharmacistRegistry() {
    return [];
  },

  async generateInvoicePdf(invoice: Invoice, state: AppState): Promise<Blob> {
    // Vérifier qu'on n'est pas en mode Tauri
    if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
      throw new Error('[Platform Error] browserPlatform.api.generateInvoicePdf appelé en mode Tauri. Utilisez getPlatformAsync().');
    }
    
    const response = await fetch(`/api/invoices/${invoice.id}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    
    if (!response.ok) {
      throw new Error(`Génération PDF échouée: ${response.status}`);
    }
    
    return response.blob();
  },

  async uploadExpenseReceipt(expenseId: string, file: File): Promise<ExpenseReceipt> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`/mission-expenses/${expenseId}/receipts`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload échoué: ${response.status}`);
    }
    
    return response.json();
  },

  async getExpenseReceipts(expenseId: string): Promise<ExpenseReceipt[]> {
    const response = await fetch(`/mission-expenses/${expenseId}/receipts`);
    if (!response.ok) return [];
    return response.json();
  },

  async deleteExpenseReceipt(receiptId: string): Promise<void> {
    await fetch(`/expense-receipts/${receiptId}`, { method: 'DELETE' });
  },

  getReceiptDownloadUrl(receiptId: string): string {
    return `/expense-receipts/${receiptId}/download`;
  },

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health');
      return response.ok;
    } catch {
      return false;
    }
  },
};

// ============================================================================
// Plateforme navigateur complète
// ============================================================================

export const browserPlatform: AppPlatform = {
  storage: browserStorageAdapter,
  files: browserFileAdapter,
  pdf: browserPdfAdapter,
  system: browserSystemAdapter,
  api: browserApiAdapter,
};
