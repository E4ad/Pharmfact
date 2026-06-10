/**
 * Monitoring avec Prometheus metrics.
 * Expose les métriques sur /metrics pour Prometheus.
 */

import express from 'express';
import client from 'prom-client';

// Configuration des métriques
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Métriques personnalisées

// Compteur pour les requêtes HTTP
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Histogramme pour la latence des requêtes
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Compteur pour les erreurs
const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code'],
});

// Métriques pour les générations de PDF
const pdfGenerationCounter = new client.Counter({
  name: 'pdf_generations_total',
  help: 'Total number of PDF generations',
  labelNames: ['status'],
});

const pdfGenerationDuration = new client.Histogram({
  name: 'pdf_generation_duration_seconds',
  help: 'Duration of PDF generation in seconds',
  buckets: [1, 5, 10, 30, 60],
});

// Métriques pour les uploads de reçus
const receiptUploadCounter = new client.Counter({
  name: 'receipt_uploads_total',
  help: 'Total number of receipt uploads',
  labelNames: ['status', 'file_type'],
});

const receiptUploadSize = new client.Histogram({
  name: 'receipt_upload_size_bytes',
  help: 'Size of uploaded receipts in bytes',
  buckets: [1024, 10240, 102400, 1048576, 10485760], // 1KB, 10KB, 100KB, 1MB, 10MB
});

// Middleware pour collecter les métriques des requêtes HTTP
export function monitoringMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  const route = req.route ? req.route.path : req.path;

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const statusCode = res.statusCode;

    // Compter la requête
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: statusCode.toString(),
    });

    // Enregistrer la durée
    httpRequestDuration.observe({
      method: req.method,
      route: route,
    }, duration);

    // Compter les erreurs (4xx, 5xx)
    if (statusCode >= 400) {
      httpRequestErrors.inc({
        method: req.method,
        route: route,
        status_code: statusCode.toString(),
      });
    }
  });

  next();
}

// Middleware pour incrémenter le compteur de PDF
export function trackPdfGeneration(status) {
  pdfGenerationCounter.inc({ status });
}

// Middleware pour mesurer la durée de génération de PDF
export function trackPdfGenerationDuration(fn) {
  return async function(...args) {
    const end = pdfGenerationDuration.startTimer();
    try {
      const result = await fn(...args);
      end({ status: 'success' });
      return result;
    } catch (error) {
      end({ status: 'error' });
      throw error;
    }
  };
}

// Fonction pour suivre les uploads de reçus
export function trackReceiptUpload(status, fileType, fileSizeBytes) {
  receiptUploadCounter.inc({ status, file_type: fileType });
  receiptUploadSize.observe(fileSizeBytes);
}

// Endpoint pour exposer les métriques Prometheus
export function createMetricsRouter() {
  const router = express.Router();

  router.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', client.register.contentType);
      const metrics = await client.register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end(error);
    }
  });

  return router;
}

// Exporter le registry pour les tests
export { client, collectDefaultMetrics };
