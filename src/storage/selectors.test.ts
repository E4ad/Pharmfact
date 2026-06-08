import { describe, expect, it } from 'vitest';
import { activePharmacien, findPharmacien, findPharmacie, findMission, findInvoice, missionInvoice, selectAppOptions, selectMissionOptions, selectInvoiceOptions, selectPdfCalendarOptions, selectFinancialOptions, selectUiOptions, selectLocalDataOptions, resolveMissionDefaults, resolveInvoiceDefaults, resolveTaxSettingsForInvoice } from './selectors';
import type { AppState } from './schema';

const state: AppState = {
  version: 2,
  activePharmacienId: 'ph1',
  pharmaciens: [
    { id: 'ph1', nom: 'A', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 0, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER', defaultBreakMinutes: 30 },
    { id: 'ph2', nom: 'B', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 0, distanceKmDomicile: 0, taxStatus: 'REGISTERED', gstNumber: '123', defaultBreakMinutes: 45 },
  ],
  pharmacies: [
    { id: 'pha1', nom: 'P1', adresse: '', ville: '', codePostal: '', defaultBreakMinutes: 60 },
    { id: 'pha2', nom: 'P2', adresse: '', ville: '', codePostal: '' },
  ],
  missions: [{ id: 'mis1', pharmacienId: 'ph1', pharmacieId: 'pha1', invoiceId: 'inv1', status: 'COMPLETED', dateDebut: '', dateFin: '', days: [], totalHours: 0, mealFeeCents: 0, mileageKm: 0, subtotalCents: 0, mealTotalCents: 0, mileageTotalCents: 0, totalCents: 0 } as any],
  invoices: [{ id: 'inv1', numero: 'F1', pharmacienId: 'ph1', pharmacieId: 'pha1', missionId: 'mis1', dateFacture: '2026-06-10', dateEcheance: '2026-07-10', status: 'SENT', amountCents: 10000, hours: 0, createdAt: '' }],
  taxPayments: [],
  deductibleExpenses: [],
  expenseReceipts: [],
  fiscalSettings: { reserveRate: 30, defaultTaxStatus: 'SMALL_SUPPLIER', enableInstalmentTracking: true },
  distanceReferences: [],
  appOptions: {
    missionDefaults: { defaultBreakMinutes: 60 },
    invoiceDefaults: { invoiceDueDays: 30, paymentTerms: 'Net' },
    pdfCalendar: { calendarIcsEnabled: true },
  },
  uiSettings: { themeMode: 'light' },
  localDataSettings: { autoBackupEnabled: true },
  ui: {},
};

describe('selectors', () => {
  describe('entity finders', () => {
    it('finds active pharmacien', () => {
      expect(activePharmacien(state)?.id).toBe('ph1');
    });

    it('finds pharmacien by id', () => {
      expect(findPharmacien(state, 'ph2')?.nom).toBe('B');
      expect(findPharmacien(state, 'missing')).toBeUndefined();
    });

    it('finds pharmacie by id', () => {
      expect(findPharmacie(state, 'pha2')?.nom).toBe('P2');
    });

    it('finds mission by id', () => {
      expect(findMission(state, 'mis1')?.status).toBe('COMPLETED');
    });

    it('finds invoice by id', () => {
      expect(findInvoice(state, 'inv1')?.numero).toBe('F1');
    });

    it('finds invoice from mission', () => {
      expect(missionInvoice(state, state.missions[0])?.id).toBe('inv1');
    });
  });

  describe('option selectors', () => {
    it('selects app, mission, invoice, pdf, financial, ui and local options', () => {
      expect(selectAppOptions(state).missionDefaults.defaultBreakMinutes).toBe(60);
      expect(selectMissionOptions(state).defaultBreakMinutes).toBe(60);
      expect(selectInvoiceOptions(state).invoiceDueDays).toBe(30);
      expect(selectPdfCalendarOptions(state).calendarIcsEnabled).toBe(true);
      expect(selectFinancialOptions(state).reserveRate).toBe(30);
      expect(selectUiOptions(state).themeMode).toBe('light');
      expect(selectLocalDataOptions(state).autoBackupEnabled).toBe(true);
    });
  });

  describe('resolvers', () => {
    it('resolves mission defaults with priorities', () => {
      const defaults = resolveMissionDefaults(state, 'ph2', 'pha1');

      expect(defaults.defaultBreakMinutes).toBe(60);
    });

    it('falls back to global defaults when no overrides', () => {
      const defaults = resolveMissionDefaults(state, undefined, 'pha2');

      expect(defaults.defaultBreakMinutes).toBe(60);
    });

    it('resolves invoice defaults from pharmacist', () => {
      const defaults = resolveInvoiceDefaults(state, 'ph1');

      expect(defaults.invoiceDueDays).toBe(30);
    });

    it('resolves tax settings from pharmacist', () => {
      const registered = resolveTaxSettingsForInvoice(state, 'ph2');
      const small = resolveTaxSettingsForInvoice(state, 'ph1');

      expect(registered.taxStatus).toBe('REGISTERED');
      expect(registered.gstNumber).toBe('123');
      expect(small.taxStatus).toBe('SMALL_SUPPLIER');
    });
  });
});
