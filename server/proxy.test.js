import { describe, it, expect, vi } from 'vitest';
import { createApp } from './app.js';
import http from 'node:http';

vi.mock('./pdfService.js', () => ({
  findInvoice: vi.fn((state, invoiceId) => state?.invoices?.find((i) => i.id === invoiceId)),
  generateInvoicePdf: vi.fn(async () => Buffer.from('PDF')),
  sanitizeFilename: vi.fn((value) => String(value || 'facture').replace(/[^a-z0-9-_]+/gi, '_')),
}));

describe('Proxy Vite → Express', () => {
  it('should respond to /api/health with status 200', async () => {
    const app = createApp();
    const server = http.createServer(app);
    const address = server.listen().address();
    const port = address.port;

    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(response.status).toBe(200);

    server.close();
  });

  it('should generate a PDF for /api/invoices/:id/pdf with valid state', async () => {
    const app = createApp();
    const server = http.createServer(app);
    const address = server.listen().address();
    const port = address.port;

    const response = await fetch(`http://127.0.0.1:${port}/api/invoices/inv_1/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: {
          invoices: [
            {
              id: 'inv_1',
              numero: 'FACT-2026-001',
              dateFacture: '2026-06-08',
              amountCents: 10000,
            },
          ],
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');

    server.close();
  });
});
