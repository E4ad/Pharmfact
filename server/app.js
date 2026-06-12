import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServerSeedState } from './seedState.js';
import { findInvoice, generateInvoicePdf, sanitizeFilename } from './pdfService.js';
import { deleteReceipt, findReceipt, listReceipts, saveReceipt, streamReceiptFile } from './receiptService.js';
import { createPharmacieSchema, updatePharmacieSchema, createPharmacienSchema, updatePharmacienSchema, validateRequest } from './schemas/index.js';
import { monitoringMiddleware, createMetricsRouter, trackPdfGeneration, trackReceiptUpload } from './monitoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration du logger Pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

function normalizeGeocodeResult(item) {
  const address = item?.address ?? {};
  const lat = Number(item?.lat);
  const lng = Number(item?.lon ?? item?.lng);
  const road = String(
    item?.street ??
    item?.road ??
    address.road ??
    address.pedestrian ??
    address.footway ??
    ''
  );
  const houseNumber = String(item?.housenumber ?? item?.house_number ?? address.house_number ?? '');
  const displayName = String(item?.formatted ?? item?.display_name ?? item?.label ?? item?.address_line1 ?? '');
  const addressLine = item?.address_line1 ?? item?.addressLine ?? [houseNumber, road].filter(Boolean).join(' ');

  return {
    displayName,
    addressLine: String(addressLine || displayName),
    city: String(item?.city ?? address.city ?? address.town ?? address.village ?? address.municipality ?? ''),
    province: String(item?.state ?? item?.province ?? address.state ?? ''),
    postcode: String(item?.postcode ?? address.postcode ?? ''),
    countryCode: String(item?.country_code ?? item?.countryCode ?? address.country_code ?? ''),
    road,
    houseNumber,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    source: String(item?.source ?? item?.provider ?? 'nominatim'),
  };
}

function isQuebecGeocodeResult(item) {
  const province = item.province.toLowerCase();
  const countryCode = item.countryCode.toLowerCase();
  const display = item.displayName.toLowerCase();
  return (countryCode === '' || countryCode === 'ca') &&
    (province.includes('québec') || province.includes('quebec') || display.includes('québec') || display.includes('quebec')) &&
    Number.isFinite(item.lat) &&
    Number.isFinite(item.lng);
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
  url.searchParams.set('q', `${query}, Québec, Canada`);

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
    return payload.map(normalizeGeocodeResult).filter(isQuebecGeocodeResult).slice(0, 6);
  } finally {
    clearTimeout(timeout);
  }
}

function parseCoordinate(value) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export async function calculateRouteDistance(input, options = {}) {
  if (process.env.ROUTE_DISTANCE_DISABLED === 'true') return null;
  const endpoint = options.routeDistanceEndpoint ?? process.env.ROUTE_DISTANCE_ENDPOINT ?? 'https://router.project-osrm.org/route/v1/driving';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const coordinates = `${input.fromLng},${input.fromLat};${input.toLng},${input.toLat}`;
  const url = new URL(`${endpoint}/${coordinates}`);
  url.searchParams.set('overview', 'false');

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Route provider returned ${response.status}`);
      error.status = 502;
      throw error;
    }
    const payload = await response.json();
    const meters = Number(payload?.routes?.[0]?.distance);
    if (!Number.isFinite(meters) || meters <= 0) return null;
    const distanceAllerKm = Math.max(1, Math.round(meters / 1000));
    return {
      distanceAllerKm,
      distanceKm: distanceAllerKm * 2,
      source: 'route',
    };
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

  // Middleware de sécurité : Helmet
  app.use(helmet());

  // Middleware CORS avec configuration sécurisée
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173', `http://localhost:${frontendPort}`];
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Mission-Id', 'X-Mission-Day-Id', 'X-File-Name', 'Content-Type'],
  }));

  // Middleware Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite à 100 requêtes par fenêtre
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.' },
  });
  app.use(limiter);

  // Middleware de logging HTTP structuré
  app.use(pinoHttp({ logger }));

  // Middleware de monitoring Prometheus (doit être avant les routes)
  app.use(monitoringMiddleware);

  // Endpoint pour les métriques Prometheus
  app.use('/metrics', createMetricsRouter());

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
  app.post('/api/pharmaciens', validateRequest(createPharmacienSchema), (req, res) => {
    logger.info({ pharmacien: req.validatedBody.nom }, 'Création d\'un nouveau pharmacien');
    res.status(201).json(req.validatedBody);
  });
  app.get('/api/pharmaciens/:id', (req, res) => {
    const item = getState(req).pharmaciens?.find((pharmacien) => pharmacien.id === req.params.id);
    item ? res.json(item) : res.status(404).json({ error: 'PHARMACIEN_NOT_FOUND' });
  });
  app.put('/api/pharmaciens/:id', validateRequest(updatePharmacienSchema), (req, res) => {
    logger.info({ id: req.params.id }, 'Mise à jour d\'un pharmacien');
    res.json({ ...req.validatedBody, id: req.params.id });
  });
  app.delete('/api/pharmaciens/:id', (_req, res) => res.status(204).send());

  app.get('/api/pharmacies', (req, res) => res.json(getState(req).pharmacies ?? []));
  app.post('/api/pharmacies', validateRequest(createPharmacieSchema), (req, res) => {
    logger.info({ pharmacie: req.validatedBody.nom }, 'Création d\'une nouvelle pharmacie');
    res.status(201).json(req.validatedBody);
  });
  app.get('/api/pharmacies/:id', (req, res) => {
    const item = getState(req).pharmacies?.find((pharmacie) => pharmacie.id === req.params.id);
    item ? res.json(item) : res.status(404).json({ error: 'PHARMACIE_NOT_FOUND' });
  });
  app.put('/api/pharmacies/:id', validateRequest(updatePharmacieSchema), (req, res) => {
    logger.info({ id: req.params.id }, 'Mise à jour d\'une pharmacie');
    res.json({ ...req.validatedBody, id: req.params.id });
  });
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
      const distanceAllerKm = Math.max(1, Math.round(oneWay));
      res.json({ distanceKm: distanceAllerKm * 2, distanceAllerKm, source: 'calculated' });
      return;
    }
    res.json({ distanceKm: 0, source: 'manual' });
  });

  app.get('/api/distance-references', (req, res) => res.json(getState(req).distanceReferences ?? []));
  app.put('/api/distance-references/:id', (req, res) => res.json({ ...req.body, id: req.params.id }));

  app.post('/api/mission-expenses/:expenseId/receipts', express.raw({ type: '*/*', limit: '11mb' }), async (req, res) => {
    try {
      const fileType = req.header('content-type')?.split(';')[0] ?? '';
      const fileSizeBytes = req.body?.length ?? 0;
      
      const receipt = await saveReceipt(receiptStorage, {
        expenseId: req.params.expenseId,
        missionId: String(req.header('x-mission-id') ?? 'unassigned'),
        missionDayId: req.header('x-mission-day-id') ?? undefined,
        fileName: req.header('x-file-name') ?? 'receipt',
        fileType: fileType,
        buffer: Buffer.isBuffer(req.body) ? req.body : Buffer.from([]),
      });
      
      trackReceiptUpload('success', fileType, fileSizeBytes);
      res.status(201).json(receipt);
    } catch (error) {
      const fileType = req.header('content-type')?.split(';')[0] ?? '';
      const fileSizeBytes = req.body?.length ?? 0;
      trackReceiptUpload('error', fileType, fileSizeBytes);
      
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
      trackPdfGeneration('success');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(invoice.numero)}.pdf"`);
      res.send(buffer);
    } catch (error) {
      trackPdfGeneration('error');
      logger.error({ invoiceId, error: error.message }, 'PDF_GENERATION_FAILED');
      sendPdfError(res, error);
    }
  });

  app.post('/api/invoices/:id/pdf', async (req, res) => {
    const invoiceId = req.params.id;
    logger.debug({ invoiceId }, 'Génération de PDF pour la facture');
    const state = req.body?.state;
    const invoice = findInvoice(state, invoiceId);

    if (!invoice) {
      logger.warn({ invoiceId }, 'Facture introuvable');
      res.status(404).json({ error: 'INVOICE_NOT_FOUND', message: 'Facture introuvable.' });
      return;
    }

    try {
      logger.debug({ invoiceId }, 'Appel à pdfGenerator');
      const buffer = await pdfGenerator(invoiceId, state);
      logger.info({ invoiceId }, 'PDF généré avec succès');
      trackPdfGeneration('success');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(invoice.numero)}.pdf"`);
      res.send(buffer);
    } catch (error) {
      trackPdfGeneration('error');
      logger.error({ invoiceId, error: error.message }, 'PDF_GENERATION_FAILED');
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
      logger.error({ query, error: error.message }, 'Erreur de géocodage');
      res.status(error.status || 502).json({ message: 'Les suggestions d’adresse sont temporairement indisponibles.', results: [] });
    }
  });

  app.get('/api/route-distance', async (req, res) => {
    const fromLat = parseCoordinate(req.query.fromLat);
    const fromLng = parseCoordinate(req.query.fromLng);
    const toLat = parseCoordinate(req.query.toLat);
    const toLng = parseCoordinate(req.query.toLng);
    if ([fromLat, fromLng, toLat, toLng].some((coordinate) => coordinate === null)) {
      res.status(400).json({ message: 'Coordonnées invalides.' });
      return;
    }

    try {
      const result = await calculateRouteDistance({ fromLat, fromLng, toLat, toLng }, options);
      if (!result) {
        res.status(502).json({ message: 'Distance temporairement indisponible.' });
        return;
      }
      res.json(result);
    } catch (error) {
      logger.error({ error: error.message }, 'Erreur de calcul de distance');
      res.status(error.status || 502).json({ message: 'Distance temporairement indisponible.' });
    }
  });

  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return app;
}
