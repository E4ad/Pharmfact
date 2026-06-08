import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServerSeedState } from './seedState.js';
import { findInvoice, generateInvoicePdf, sanitizeFilename } from './pdfService.js';
import { deleteReceipt, findReceipt, listReceipts, saveReceipt, streamReceiptFile } from './receiptService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeGeocodeResult(item) {
  const address = item?.address ?? {};
  const lat = Number(item?.lat);
  const lng = Number(item?.lon ?? item?.lng);

  return {
    displayName: String(item?.display_name ?? item?.label ?? ''),
    city: String(address.city ?? address.town ?? address.village ?? address.municipality ?? ''),
    postcode: String(address.postcode ?? ''),
    road: String(address.road ?? address.pedestrian ?? address.footway ?? ''),
    houseNumber: String(address.house_number ?? ''),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

export async function searchAddresses(query, options = {}) {
  if (process.env.GEOCODE_DISABLED === 'true') return [];

  const endpoint = options.geocodeEndpoint ?? process.env.GEOCODE_ENDPOINT ?? 'https://nominatim.openstreetmap.org/search';
  const userAgent = options.geocodeUserAgent ?? process.env.GEOCODE_USER_AGENT ?? 'mission-app-local-prototype/0.1';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const url = new URL(endpoint);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', process.env.GEOCODE_COUNTRYCODES ?? 'ca');
  url.searchParams.set('accept-language', process.env.GEOCODE_LANGUAGE ?? 'fr');
  url.searchParams.set('q', query);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent },
    });

    if (!response.ok) {
      const error = new Error(`Geocode provider returned ${response.status}`);
      error.status = 502;
      throw error;
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload.map(normalizeGeocodeResult).filter((item) => item.displayName).slice(0, 6);
  } finally {
    clearTimeout(timeout);
  }
}

function sendPdfError(res, error) {
  if (error?.status === 404 || error?.code === 'INVOICE_NOT_FOUND') {
    res.status(404).json({ error: 'INVOICE_NOT_FOUND', message: 'Facture introuvable.' });
    return;
  }

  res.status(500).json({ error: 'PDF_GENERATION_FAILED', message: 'Le PDF n’a pas pu être généré.' });
}

export function createApp(options = {}) {
  const app = express();
  const distPath = options.distPath ?? path.resolve(__dirname, '../dist');
  const port = options.port ?? process.env.API_PORT ?? process.env.PDF_SERVER_PORT ?? 3001;
  const frontendPort = process.env.FRONTEND_PORT ?? 5173;
  const hasBuiltFrontend = existsSync(path.join(distPath, 'index.html'));
  const appBaseUrl = options.appBaseUrl
    ?? process.env.FRONTEND_URL
    ?? process.env.APP_BASE_URL
    ?? (hasBuiltFrontend ? `http://localhost:${port}` : `http://localhost:${frontendPort}`);
  const getState = options.getState ?? (() => createServerSeedState());
  const pdfGenerator = options.generateInvoicePdf ?? ((invoiceId, state) => generateInvoicePdf(invoiceId, state, { appBaseUrl, chromium: options.chromium }));
  const receiptStorage = { storageRoot: options.receiptStorageRoot ?? path.resolve(__dirname, '../data/receipts') };

  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(distPath));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/options', (_req, res) => {
    const state = getState(_req);
    res.json({ options: state.options, fiscalSettings: state.fiscalSettings, activePharmacienId: state.activePharmacienId });
  });

  app.put('/api/options', (req, res) => {
    res.json({ status: 'ok', options: req.body });
  });

  app.get('/api/pharmaciens', (req, res) => res.json(getState(req).pharmaciens ?? []));
  app.post('/api/pharmaciens', (req, res) => res.status(201).json(req.body));
  app.get('/api/pharmaciens/:id', (req, res) => {
    const item = getState(req).pharmaciens?.find((pharmacien) => pharmacien.id === req.params.id);
    item ? res.json(item) : res.status(404).json({ error: 'PHARMACIEN_NOT_FOUND' });
  });
  app.put('/api/pharmaciens/:id', (req, res) => res.json({ ...req.body, id: req.params.id }));
  app.delete('/api/pharmaciens/:id', (_req, res) => res.status(204).send());

  app.get('/api/pharmacies', (req, res) => res.json(getState(req).pharmacies ?? []));
  app.post('/api/pharmacies', (req, res) => res.status(201).json(req.body));
  app.get('/api/pharmacies/:id', (req, res) => {
    const item = getState(req).pharmacies?.find((pharmacie) => pharmacie.id === req.params.id);
    item ? res.json(item) : res.status(404).json({ error: 'PHARMACIE_NOT_FOUND' });
  });
  app.put('/api/pharmacies/:id', (req, res) => res.json({ ...req.body, id: req.params.id }));
  app.delete('/api/pharmacies/:id', (_req, res) => res.status(204).send());

  app.post('/api/active-pharmacien', (req, res) => res.json({ activePharmacienId: req.body?.pharmacienId ?? null }));
  app.delete('/api/active-pharmacien', (_req, res) => res.status(204).send());

  app.post('/api/distance', (req, res) => {
    const { homeLat, homeLng, workLat, workLng } = req.body ?? {};
    const toRad = (value) => (Number(value) * Math.PI) / 180;
    if ([homeLat, homeLng, workLat, workLng].every((value) => Number.isFinite(Number(value)))) {
      const earthKm = 6371;
      const dLat = toRad(workLat - homeLat);
      const dLng = toRad(workLng - homeLng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(homeLat)) * Math.cos(toRad(workLat)) * Math.sin(dLng / 2) ** 2;
      const oneWay = earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      res.json({ distanceKm: Math.round(oneWay * 2 * 10) / 10, source: 'calculated' });
      return;
    }
    res.json({ distanceKm: 0, source: 'manual' });
  });

  app.get('/api/distance-references', (req, res) => res.json(getState(req).distanceReferences ?? []));
  app.put('/api/distance-references/:id', (req, res) => res.json({ ...req.body, id: req.params.id }));

  app.post('/api/mission-expenses/:expenseId/receipts', express.raw({ type: '*/*', limit: '11mb' }), async (req, res) => {
    try {
      const receipt = await saveReceipt(receiptStorage, {
        expenseId: req.params.expenseId,
        missionId: String(req.header('x-mission-id') ?? 'unassigned'),
        missionDayId: req.header('x-mission-day-id') ?? undefined,
        fileName: req.header('x-file-name') ?? 'receipt',
        fileType: req.header('content-type')?.split(';')[0] ?? '',
        buffer: Buffer.isBuffer(req.body) ? req.body : Buffer.from([]),
      });
      res.status(201).json(receipt);
    } catch (error) {
      res.status(error.status ?? 500).json(error.payload ?? { error: 'RECEIPT_UPLOAD_FAILED', message: 'Le justificatif n’a pas pu être enregistré.' });
    }
  });

  app.get('/api/mission-expenses/:expenseId/receipts', async (req, res) => {
    res.json({ receipts: await listReceipts(receiptStorage, req.params.expenseId) });
  });

  app.delete('/api/expense-receipts/:receiptId', async (req, res) => {
    const deleted = await deleteReceipt(receiptStorage, req.params.receiptId);
    if (!deleted) {
      res.status(404).json({ error: 'RECEIPT_NOT_FOUND', message: 'Justificatif introuvable.' });
      return;
    }
    res.status(204).send();
  });

  app.get('/api/expense-receipts/:receiptId/download', async (req, res) => {
    const receipt = await findReceipt(receiptStorage, req.params.receiptId);
    if (!receipt) {
      res.status(404).json({ error: 'RECEIPT_NOT_FOUND', message: 'Justificatif introuvable.' });
      return;
    }
    res.setHeader('Content-Type', receipt.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(receipt.fileName)}"`);
    streamReceiptFile(receiptStorage, receipt).on('error', () => res.status(404).end()).pipe(res);
  });

  app.get('/api/invoices/:id/pdf', async (req, res) => {
    const invoiceId = req.params.id;
    const state = getState(req);
    const invoice = findInvoice(state, invoiceId);

    if (!invoice) {
      res.status(404).json({ error: 'INVOICE_NOT_FOUND', message: 'Facture introuvable.' });
      return;
    }

    try {
      const buffer = await pdfGenerator(invoiceId, state);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(invoice.numero)}.pdf"`);
      res.send(buffer);
    } catch (error) {
      console.error('PDF_GENERATION_FAILED', { invoiceId, error });
      sendPdfError(res, error);
    }
  });

  app.post('/api/invoices/:id/pdf', async (req, res) => {
    const invoiceId = req.params.id;
    console.log(`[DEBUG] Génération de PDF pour la facture : ${invoiceId}`);
    const state = req.body?.state;
    const invoice = findInvoice(state, invoiceId);

    if (!invoice) {
      console.log(`[DEBUG] Facture introuvable : ${invoiceId}`);
      res.status(404).json({ error: 'INVOICE_NOT_FOUND', message: 'Facture introuvable.' });
      return;
    }

    try {
      console.log(`[DEBUG] Appel à pdfGenerator pour : ${invoiceId}`);
      const buffer = await pdfGenerator(invoiceId, state);
      console.log(`[DEBUG] PDF généré avec succès pour : ${invoiceId}`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(invoice.numero)}.pdf"`);
      res.send(buffer);
    } catch (error) {
      console.error('[DEBUG] PDF_GENERATION_FAILED', { invoiceId, error });
      sendPdfError(res, error);
    }
  });

  app.get('/api/geocode', async (req, res) => {
    const query = String(req.query.q ?? '').trim();
    if (query.length < 3) {
      res.status(400).json({ message: 'La recherche doit contenir au moins 3 caractères.', results: [] });
      return;
    }

    try {
      const results = await searchAddresses(query, options);
      res.json({ results });
    } catch (error) {
      console.error('[geocode-error]', { query, timestamp: new Date().toISOString(), error });
      res.status(error.status || 502).json({ message: 'Les suggestions d’adresse sont temporairement indisponibles.', results: [] });
    }
  });

  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return app;
}
