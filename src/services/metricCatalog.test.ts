import { describe, expect, it } from 'vitest';
import { metricDefinitions } from './metricCatalog';

describe('metric catalog', () => {
  it('assigns each visible KPI a single owner and interaction mode', () => {
    expect(metricDefinitions.missionsUpcoming7d.ownerPage).toBe('Missions');
    expect(metricDefinitions.missionsUpcoming7d.ownerHref).toBe('/missions?filter=upcoming_7d');
    expect(metricDefinitions.missionsUpcoming7d.interactionMode).toBe('filter');

    expect(metricDefinitions.invoicesToCollect.ownerPage).toBe('Factures');
    expect(metricDefinitions.invoicesToCollect.ownerHref).toBe('/invoices?filter=receivable');
    expect(metricDefinitions.invoicesToCollect.interactionMode).toBe('filter');

    expect(metricDefinitions.diagnosticsDataHealth.category).toBe('diagnostic');
    expect(metricDefinitions.pharmaciesUnpaidInvoices.category).toBe('object');
  });
});
