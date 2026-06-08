import { describe, expect, it } from 'vitest';
import type { Invoice } from '../storage/schema';
import { getAvailableEditActions, getInvoiceEditImpact } from './missionEditRules';

const invoice = (status: Invoice['status']): Invoice => ({
  id: 'inv_1',
  numero: 'FAC-2026-0001',
  missionId: 'mis_1',
  pharmacienId: 'ph_1',
  pharmacieId: 'pha_1',
  dateFacture: '2026-06-05',
  dateEcheance: '2026-07-05',
  status,
  hours: 8,
  amountCents: 80000,
  createdAt: '2026-06-05T00:00:00.000Z',
});

describe('missionEditRules', () => {
  it('allows simple save when no invoice exists', () => {
    expect(getInvoiceEditImpact().level).toBe('info');
    expect(getAvailableEditActions()).toEqual([{ action: 'save', label: 'Sauvegarder les modifications', primary: true }]);
  });

  it('allows regeneration for generated invoices', () => {
    expect(getInvoiceEditImpact(invoice('GENERATED')).canSilentlyRegenerate).toBe(true);
    expect(getAvailableEditActions(invoice('GENERATED')).map((action) => action.action)).toEqual(['save', 'save_regenerate']);
  });

  it('requires explicit regeneration for sent invoices', () => {
    expect(getInvoiceEditImpact(invoice('SENT')).requiresExplicitRegeneration).toBe(true);
    expect(getAvailableEditActions(invoice('SENT')).find((action) => action.primary)?.action).toBe('save_regenerate');
  });

  it('keeps paid invoice edits internal by default', () => {
    expect(getInvoiceEditImpact(invoice('PAID')).level).toBe('danger');
    expect(getAvailableEditActions(invoice('PAID')).map((action) => action.action)).toEqual(['save_internal', 'create_corrected_version']);
  });
});
