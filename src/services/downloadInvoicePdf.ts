import type { AppState, Invoice } from '../storage/schema';
import { getPlatformAsync } from './platformService';

export type DownloadInvoicePdfResult =
  | { status: 'downloaded' }
  | { status: 'cancelled' }
  | { status: 'error'; error: unknown };

async function assertPdfBlob(blob: Blob): Promise<void> {
  if (!blob.size) {
    throw new Error('Le PDF généré est vide.');
  }

  const header = new TextDecoder().decode(await blob.slice(0, 4).arrayBuffer());
  if (header !== '%PDF') {
    throw new Error('Format PDF invalide.');
  }
}

export async function downloadInvoicePdf(invoice: Invoice | undefined, state: AppState): Promise<DownloadInvoicePdfResult> {
  try {
    if (!invoice) {
      throw new Error('Facture introuvable.');
    }

    const platform = await getPlatformAsync();
    const blob = await platform.pdf.generateInvoicePdf(invoice, state);
    await assertPdfBlob(blob);
    const saved = await platform.pdf.downloadPdf(blob, invoice.numero);

    return saved ? { status: 'downloaded' } : { status: 'cancelled' };
  } catch (error) {
    return { status: 'error', error };
  }
}
