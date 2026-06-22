import { describe, expect, it } from 'vitest';
import { appendAuditTrail, buildAuditTrailEntry, buildBackupAuditTrailEntry } from './auditTrail';
import type { Invoice } from '../storage/schema';
import { createSeedState } from '../storage/seedData';

describe('auditTrail', () => {
  it('summarizes collection changes into a readable entry', () => {
    const previous = createSeedState();
    const generatedInvoice: Invoice = {
      id: 'inv1',
      numero: 'FAC-1',
      missionIds: [],
      pharmacienId: 'ph1',
      pharmacieId: 'pa1',
      dateFacture: '2026-06-01',
      dateEcheance: '2026-06-30',
      status: 'GENERATED',
      hours: 1,
      amountCents: 10000,
      createdAt: '',
    };
    const next = {
      ...previous,
      invoices: [...previous.invoices, generatedInvoice],
    };

    const entry = buildAuditTrailEntry(previous, next);

    expect(entry?.eventType).toBe('STATE_UPDATED');
    expect(entry?.scope).toBe('invoices');
    expect(entry?.label).toContain('facture');
  });

  it('prepends explicit audit entries and keeps the trail bounded', () => {
    const state = createSeedState();
    const updated = appendAuditTrail(
      state,
      buildBackupAuditTrailEntry('STATE_RESET', 'Retour aux données de démonstration.'),
    );

    expect(updated.ui.auditTrail).toHaveLength(1);
    expect(updated.ui.auditTrail?.[0].scope).toBe('backup');
  });
});
