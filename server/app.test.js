import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './app.js';
import { createServerSeedState } from './seedState.js';
import { generateInvoicePdf } from './pdfService.js';

const servers = [];
const tempDirs = [];

async function listen(app) {
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempReceiptStorage() {
  const dir = await mkdtemp(path.join(tmpdir(), 'mission-receipts-'));
  tempDirs.push(dir);
  return dir;
}

describe('PDF API', () => {
  it('returns health status', async () => {
    const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));

    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('returns 404 for an unknown invoice', async () => {
    const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));

    const response = await fetch(`${baseUrl}/api/invoices/unknown/pdf`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'INVOICE_NOT_FOUND', message: 'Facture introuvable.' });
  });

  it('returns a PDF for an existing invoice', async () => {
    const pdf = Buffer.from('%PDF-1.4\n% test pdf\n');
    const pdfGenerator = vi.fn().mockResolvedValue(pdf);
    const baseUrl = await listen(createApp({ generateInvoicePdf: pdfGenerator }));

    const response = await fetch(`${baseUrl}/api/invoices/inv_seed_1/pdf`);
    const body = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('.pdf');
    expect(body.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdfGenerator).toHaveBeenCalledWith('inv_seed_1', expect.objectContaining({ invoices: expect.any(Array) }));
  });

  it('returns 500 when Playwright PDF generation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const pdfGenerator = vi.fn().mockRejectedValue(new Error('chromium failed'));
    const baseUrl = await listen(createApp({ generateInvoicePdf: pdfGenerator }));

    const response = await fetch(`${baseUrl}/api/invoices/inv_seed_1/pdf`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'PDF_GENERATION_FAILED', message: 'Le PDF n’a pas pu être généré.' });
    consoleError.mockRestore();
  });

  it('uses POST state snapshots for browser-local invoices', async () => {
    const state = createServerSeedState();
    state.invoices[0].id = 'inv_local_1';
    const pdfGenerator = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4\n% local pdf\n'));
    const baseUrl = await listen(createApp({ generateInvoicePdf: pdfGenerator }));

    const response = await fetch(`${baseUrl}/api/invoices/inv_local_1/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');
  });
});

describe('generateInvoicePdf', () => {
  it('closes Chromium even when page rendering fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const close = vi.fn();
    const chromium = {
      launch: vi.fn().mockResolvedValue({
        close,
        newPage: vi.fn().mockResolvedValue({
          addInitScript: vi.fn(),
          goto: vi.fn().mockRejectedValue(new Error('render failed')),
          emulateMedia: vi.fn(),
          pdf: vi.fn(),
        }),
      }),
    };

    await expect(generateInvoicePdf('inv_seed_1', createServerSeedState(), { appBaseUrl: 'http://127.0.0.1:5173', chromium })).rejects.toThrow('render failed');

    expect(close).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

describe('Receipt API', () => {
  it('uploads, lists, downloads, and deletes an expense receipt', async () => {
    const receiptStorageRoot = await tempReceiptStorage();
    const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn(), receiptStorageRoot }));

    // Créer un buffer JPEG minimal (FF D8 FF = signature JPEG)
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);

    const upload = await fetch(`${baseUrl}/api/mission-expenses/fee_1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-File-Name': 'recu stationnement.jpg',
        'X-Mission-Id': 'mis_1',
        'X-Mission-Day-Id': 'day_1',
      },
      body: jpegBuffer,
    });

    expect(upload.status).toBe(201);
    const receipt = await upload.json();
    expect(receipt).toEqual(expect.objectContaining({ expenseId: 'fee_1', missionId: 'mis_1', fileType: 'image/jpeg', fileName: 'recu-stationnement.jpg' }));
    expect(receipt.storageUrl).toBe(`/api/expense-receipts/${receipt.id}/download`);
    expect(receipt.relativePath).toBeUndefined();

    const list = await fetch(`${baseUrl}/api/mission-expenses/fee_1/receipts`);
    expect(await list.json()).toEqual({ receipts: [receipt] });

    const download = await fetch(`${baseUrl}${receipt.storageUrl}`);
    expect(download.status).toBe(200);
    expect(download.headers.get('content-type')).toContain('image/jpeg');
    expect(Buffer.from(await download.arrayBuffer())).toEqual(jpegBuffer);

    const deleted = await fetch(`${baseUrl}/api/expense-receipts/${receipt.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);

    const afterDelete = await fetch(`${baseUrl}/api/mission-expenses/fee_1/receipts`);
    expect(await afterDelete.json()).toEqual({ receipts: [] });
  });

  it('rejects unsupported receipt mime types', async () => {
    const receiptStorageRoot = await tempReceiptStorage();
    const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn(), receiptStorageRoot }));

    const response = await fetch(`${baseUrl}/api/mission-expenses/fee_1/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-File-Name': 'note.txt', 'X-Mission-Id': 'mis_1' },
      body: Buffer.from('not a receipt'),
    });

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: 'UNSUPPORTED_RECEIPT_TYPE', message: 'Format refusé. Utilisez JPG, PNG ou PDF.' });
  });

  it('rejects receipts larger than 10 MB', async () => {
    const receiptStorageRoot = await tempReceiptStorage();
    const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn(), receiptStorageRoot }));

    const response = await fetch(`${baseUrl}/api/mission-expenses/fee_1/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', 'X-File-Name': 'large.png', 'X-Mission-Id': 'mis_1' },
      body: Buffer.alloc(10 * 1024 * 1024 + 1),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'RECEIPT_TOO_LARGE', message: 'Fichier trop lourd. Limite: 10 Mo.' });
  });
});
