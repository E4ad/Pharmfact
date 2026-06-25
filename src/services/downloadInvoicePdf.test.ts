import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppPlatform } from '../platform/types';
import type { AppState, Invoice } from '../storage/schema';
import { downloadInvoicePdf } from './downloadInvoicePdf';
import { getPlatformAsync } from './platformService';

vi.mock('./platformService', () => ({
  getPlatformAsync: vi.fn(),
}));

const invoice: Invoice = {
  id: 'inv_1',
  numero: 'FAC-2026-0001',
  missionId: 'mis_1',
  missionIds: ['mis_1'],
  pharmacienId: 'ph_1',
  pharmacieId: 'pha_1',
  dateFacture: '2026-06-05',
  dateEcheance: '2026-07-05',
  status: 'draft',
  paymentStatus: 'to_collect',
  hours: 8,
  amountCents: 80000,
  paidAmountCents: 0,
  balanceDue: 80000,
  createdAt: '2026-06-05T00:00:00.000Z',
};

const state = { invoices: [invoice] } as AppState;

function platformMock(blob: Blob, saved = true): AppPlatform {
  return {
    pdf: {
      generateInvoicePdf: vi.fn().mockResolvedValue(blob),
      downloadPdf: vi.fn().mockResolvedValue(saved),
    },
  } as unknown as AppPlatform;
}

describe('downloadInvoicePdf', () => {
  beforeEach(() => {
    vi.mocked(getPlatformAsync).mockReset();
  });

  it('generates then downloads a valid PDF', async () => {
    const platform = platformMock(new Blob(['%PDF-1.7 content'], { type: 'application/pdf' }));
    vi.mocked(getPlatformAsync).mockResolvedValue(platform);

    await expect(downloadInvoicePdf(invoice, state)).resolves.toEqual({ status: 'downloaded' });
    expect(platform.pdf.generateInvoicePdf).toHaveBeenCalledWith(invoice, state);
    expect(platform.pdf.downloadPdf).toHaveBeenCalledWith(expect.any(Blob), invoice.numero);
  });

  it('returns cancelled when the save dialog is cancelled', async () => {
    vi.mocked(getPlatformAsync).mockResolvedValue(platformMock(new Blob(['%PDF-1.7 content'], { type: 'application/pdf' }), false));

    await expect(downloadInvoicePdf(invoice, state)).resolves.toEqual({ status: 'cancelled' });
  });

  it('returns an error for a missing invoice', async () => {
    const result = await downloadInvoicePdf(undefined, state);

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.error).toBeInstanceOf(Error);
  });

  it('rejects empty blobs before download', async () => {
    const platform = platformMock(new Blob([], { type: 'application/pdf' }));
    vi.mocked(getPlatformAsync).mockResolvedValue(platform);

    const result = await downloadInvoicePdf(invoice, state);

    expect(result.status).toBe('error');
    expect(platform.pdf.downloadPdf).not.toHaveBeenCalled();
  });

  it('rejects non-PDF blobs before download', async () => {
    const platform = platformMock(new Blob(['not a pdf'], { type: 'text/plain' }));
    vi.mocked(getPlatformAsync).mockResolvedValue(platform);

    const result = await downloadInvoicePdf(invoice, state);

    expect(result.status).toBe('error');
    expect(platform.pdf.downloadPdf).not.toHaveBeenCalled();
  });
});
