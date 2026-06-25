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
  paymentStatus: 'to_collect',
  hours: 8,
  amountCents: 80000,
  createdAt: '2026-06-05T00:00:00.000Z',
});

describe('missionEditRules', () => {
  it('allows simple save when no invoice exists', () => {
    expect(getInvoiceEditImpact().level).toBe('info');
    expect(getInvoiceEditImpact().recommendedAction).toBe('save');
    expect(getAvailableEditActions()).toEqual([{ action: 'save', label: 'Sauvegarder les modifications', primary: true }]);
  });

  it('allows regeneration for generated invoices', () => {
    expect(getInvoiceEditImpact(invoice('GENERATED')).canSilentlyRegenerate).toBe(true);
    expect(getAvailableEditActions(invoice('GENERATED')).map((action) => action.action)).toEqual(['save', 'save_regenerate']);
  });

  it('requires explicit regeneration for sent invoices', () => {
    expect(getInvoiceEditImpact(invoice('SENT')).requiresExplicitRegeneration).toBe(true);
    expect(getInvoiceEditImpact(invoice('SENT')).requiresCorrectedVersion).toBe(false);
    expect(getAvailableEditActions(invoice('SENT')).find((action) => action.primary)?.action).toBe('save_regenerate');
    expect(getAvailableEditActions(invoice('SENT')).find((action) => action.primary)?.label).toBe('Sauvegarder et télécharger le nouveau PDF');
  });

  it('promotes corrected versions for paid invoices', () => {
    expect(getInvoiceEditImpact(invoice('PAID')).level).toBe('danger');
    expect(getInvoiceEditImpact(invoice('PAID')).requiresCorrectedVersion).toBe(true);
    expect(getInvoiceEditImpact(invoice('PAID')).recommendedAction).toBe('create_corrected_version');
    expect(getAvailableEditActions(invoice('PAID')).map((action) => action.action)).toEqual(['create_corrected_version', 'save_internal']);
  });

  it('promotes corrected versions for archived invoices too', () => {
    expect(getInvoiceEditImpact(invoice('ARCHIVED')).requiresCorrectedVersion).toBe(true);
    expect(getInvoiceEditImpact(invoice('ARCHIVED')).recommendedAction).toBe('create_corrected_version');
    expect(getAvailableEditActions(invoice('ARCHIVED')).map((action) => action.action)).toEqual(['create_corrected_version', 'save_internal']);
  });
});
