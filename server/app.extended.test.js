import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { createApp } from './app.js';

const servers = [];

async function listen(app) {
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe('Backend API extended', () => {
  describe('pharmaciens CRUD', () => {
    it('returns seeded list', async () => {
      const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));
      const response = await fetch(`${baseUrl}/api/pharmaciens`);

      expect(response.status).toBe(200);
      const list = await response.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it('creates a pharmacien and rejects missing on GET/PUT/DELETE', async () => {
      const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));

      const created = await fetch(`${baseUrl}/api/pharmaciens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ph_new', nom: 'Nouveau', taxStatus: 'REGISTERED' }),
      });
      expect(created.status).toBe(201);

      const get = await fetch(`${baseUrl}/api/pharmaciens/ph_new`);
      const getJson = await get.json().catch(() => null);
      expect(get.status === 200 ? getJson?.nom === 'Nouveau' : get.status === 404).toBe(true);

      const updated = await fetch(`${baseUrl}/api/pharmaciens/ph_new`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: 'Modifié' }),
      });
      expect(updated.status).toBeGreaterThanOrEqual(200);

      const deleted = await fetch(`${baseUrl}/api/pharmaciens/ph_new`, { method: 'DELETE' });
      expect(deleted.status).toBe(204);
      const after = await fetch(`${baseUrl}/api/pharmaciens/ph_new`);
      expect(after.status).toBe(404);
    });
  });

  describe('pharmacies CRUD', () => {
    it('returns seeded list', async () => {
      const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));
      const response = await fetch(`${baseUrl}/api/pharmacies`);

      expect(response.status).toBe(200);
      expect((await response.json()).length).toBeGreaterThan(0);
    });

    it('returns 404 for missing pharmacy', async () => {
      const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));
      const response = await fetch(`${baseUrl}/api/pharmacies/phx-missing`);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'PHARMACIE_NOT_FOUND' });
    });
  });

  describe('PDF filename sanitization', () => {
    it('does not allow path traversal in filename', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n');
      const pdfGenerator = vi.fn().mockResolvedValue(pdfBuffer);
      const baseUrl = await listen(createApp({ generateInvoicePdf: pdfGenerator }));

      const response = await fetch(`${baseUrl}/api/invoices/inv_seed_1/pdf`, {
        headers: { 'x-filename': '../../../etc/passwd.pdf' },
      });

      expect(response.status).toBe(200);
      const disposition = response.headers.get('content-disposition') ?? '';
      expect(disposition).not.toContain('..');
      expect(disposition).toContain('.pdf');
    });
  });

  describe('geocode endpoint', () => {
    const originalEnv = process.env.GEOCODE_DISABLED;

    afterEach(() => {
      process.env.GEOCODE_DISABLED = originalEnv;
    });

    it('returns empty when geocode is disabled', async () => {
      process.env.GEOCODE_DISABLED = 'true';
      const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));
      const response = await fetch(`${baseUrl}/api/geocode?q=montreal`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ results: [] });
    });

    it('rejects too short queries', async () => {
      const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn() }));
      const response = await fetch(`${baseUrl}/api/geocode?q=a`);

      expect(response.status).toBe(400);
    });
  });

  describe('receipt API safety', () => {
    it('returns 404 on missing receipt delete', async () => {
      const { mkdtemp, rm } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const root = await mkdtemp(path.join(tmpdir(), 'mission-receipts-'));
      const baseUrl = await listen(createApp({ generateInvoicePdf: vi.fn(), receiptStorageRoot: root }));

      const response = await fetch(`${baseUrl}/api/expense-receipts/missing`, { method: 'DELETE' });
      expect(response.status).toBe(404);

      await rm(root, { recursive: true, force: true });
    });
  });
});
