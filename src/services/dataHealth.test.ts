import { describe, expect, it } from 'vitest';
import { buildDataHealthSummary } from './dataHealth';
import type { AppState } from '../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';

function state(patch: Partial<AppState> = {}): AppState {
  return {
    version: 3,
    activePharmacienId: 'ph1',
    pharmaciens: [
      {
        id: 'ph1',
        nom: 'A',
        adresse: '',
        ville: '',
        codePostal: 'H2X 1X1',
        telephone: '',
        email: 'a@example.com',
        hourlyRateCents: 10000,
        distanceKmDomicile: 0,
        taxStatus: 'SMALL_SUPPLIER',
      },
      {
        id: 'ph2',
        nom: 'A',
        adresse: '',
        ville: '',
        codePostal: 'H2X 1X1',
        telephone: '',
        email: 'a@example.com',
        hourlyRateCents: 10000,
        distanceKmDomicile: 0,
        taxStatus: 'SMALL_SUPPLIER',
      },
    ],
    pharmacies: [
      {
        id: 'pa1',
        nom: 'P1',
        adresse: '1 rue Test',
        ville: 'Montréal',
        codePostal: 'H2X 1X1',
        telephone: '',
        email: '',
        defaultBreakMinutes: 30,
      },
      {
        id: 'pa2',
        nom: 'P1',
        adresse: '1 rue Test',
        ville: 'Montréal',
        codePostal: 'H2X 1X1',
        telephone: '',
        email: '',
        defaultBreakMinutes: 30,
      },
    ],
    missions: [
      {
        id: 'm1',
        missionCode: 'M1',
        pharmacienId: 'ph1',
        pharmacieId: 'pa1',
        status: 'COMPLETED',
        dateDebut: '2026-06-01',
        dateFin: '2026-06-01',
        days: [],
        hourlyRateCents: 10000,
        mealFeeCents: 0,
        mileageKm: 0,
        mileageRateCents: 0,
        totalHours: 1,
        subtotalCents: 10000,
        mealTotalCents: 0,
        mileageTotalCents: 0,
        totalCents: 10000,
        events: [],
        createdAt: '',
        updatedAt: '',
        invoiceId: 'missing-inv',
      },
    ],
    invoices: [
      {
        id: 'inv1',
        numero: 'FAC-1',
        missionIds: ['missing-mission'],
        missionId: 'missing-mission',
        pharmacienId: 'ph1',
        pharmacieId: 'pa1',
        dateFacture: '2026-06-01',
        dateEcheance: '2026-06-30',
        status: 'sent',
        paymentStatus: 'to_collect',
        hours: 1,
        amountCents: 10000,
        createdAt: '',
      },
    ],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: createDefaultFiscalSettings(2026),
    distanceReferences: [],
    opqPharmacistRegistry: { entries: [], sourceUrl: '' },
    appOptions: createDefaultAppOptions(),
    uiSettings: { themeMode: 'system' },
    localDataSettings: { autoBackupEnabled: false },
    ui: { missionFilters: {} },
    ...patch,
  };
}

describe('dataHealth', () => {
  it('summarizes duplicate data and linkage issues', () => {
    const summary = buildDataHealthSummary(state());

    expect(summary.overallStatus).toBe('critical');
    expect(summary.duplicatePharmacies).toBe(1);
    expect(summary.duplicatePharmaciens).toBe(1);
    expect(summary.duplicateInvoiceNumbers).toBe(0);
    expect(summary.orphanMissions).toBe(1);
    expect(summary.orphanInvoices).toBe(1);
    expect(summary.backupEnabled).toBe(false);
    expect(summary.issues.some((issue) => issue.id === 'auto-backup-disabled')).toBe(true);
  });
});
