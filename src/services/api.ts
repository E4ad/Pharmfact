import type { AppState } from '../storage/schema';
import { getAppState } from '../storage/localStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

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

export async function downloadInvoicePdf(invoiceId: string, state?: AppState): Promise<Blob> {
  await assertBackendAvailable();
  const resolvedState = state ?? getAppState();
  const stateJson = JSON.parse(JSON.stringify(resolvedState));
  const response = await fetch(apiUrl(`/invoices/${invoiceId}/pdf`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: stateJson }),
  });
  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[qa-pdf-download-failed]', { invoiceId, status: response.status, body: bodyText });
    const error = new Error(`Le PDF n’a pas pu être généré (${response.status}). Vérifiez que le serveur est démarré puis réessayez.`);
    (error as Error & { name?: string }).name = response.status === 503 ? 'BACKEND_UNAVAILABLE' : 'PDF_GENERATION_FAILED';
    throw error;
  }
  return response.blob();
}
