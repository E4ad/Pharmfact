import { describe, expect, it } from 'vitest';
import { buildCsvExport } from './csvExports';
import type { AppState } from '../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';

const state: AppState = {
  version: 3,
  activePharmacienId: null,
  pharmaciens: [],
  pharmacies: [{ id: 'pha1', nom: 'Pharmacie A', adresse: '', ville: 'Montréal', codePostal: 'H2X 1A1', telephone: '', email: 'a@example.com', billingEmail: 'factures@example.com', defaultBreakMinutes: 30 }],
  missions: [],
  invoices: [{ id: 'inv1', numero: 'F1', missionIds: ['mis1'], missionId: 'mis1', pharmacienId: 'ph1', pharmacieId: 'pha1', dateFacture: '2026-06-01', dateEcheance: '2026-07-01', status: 'sent', paymentStatus: 'paid', hours: 2, amountCents: 12345, paidAmountCents: 12345, balanceDue: 0, paidAt: '2026-06-10', createdAt: '' }],
  taxPayments: [],
  deductibleExpenses: [{ id: 'exp1', date: '2026-06-02', label: 'Logiciel', category: 'SOFTWARE', amountCents: 1999, taxDeductible: true, missionId: 'mis1', hasReceipt: true }],
  expenseReceipts: [],
  fiscalSettings: createDefaultFiscalSettings(2026),
  distanceReferences: [],
  opqPharmacistRegistry: { entries: [], sourceUrl: '' },
  appOptions: createDefaultAppOptions(),
  uiSettings: { themeMode: 'system' },
  localDataSettings: { autoBackupEnabled: true },
  ui: { missionFilters: {} },
};

describe('csvExports', () => {
  it('exports UTF-8 CSV with dollar amounts and ISO dates', () => {
    const csv = buildCsvExport(state, 'factures', 2026);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('date_facture');
    expect(csv).toContain('2026-06-01');
    expect(csv).toContain('123.45');
  });

  it('exports deductible expenses with optional mission link', () => {
    const csv = buildCsvExport(state, 'depenses', 2026);
    expect(csv).toContain('mis1');
    expect(csv).toContain('19.99');
  });
});

