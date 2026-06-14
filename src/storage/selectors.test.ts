import { describe, expect, it } from 'vitest';
import { activePharmacien, findPharmacien, findPharmacie, findMission, findInvoice, missionInvoice, selectAppOptions, selectMissionOptions, selectInvoiceOptions, selectPdfCalendarOptions, selectFinancialOptions, selectUiOptions, selectLocalDataOptions, resolveMissionDefaults, resolveInvoiceDefaults, resolveTaxSettingsForInvoice } from './selectors';
import type { AppState } from './schema';
import type { TaxStatus } from './schema';

const state: AppState = {
  version: 2,
  activePharmacienId: 'ph1',
  pharmaciens: [
    { id: 'ph1', nom: 'A', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 0, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER', defaultBreakMinutes: 30 },
    { id: 'ph2', nom: 'B', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 0, distanceKmDomicile: 0, taxStatus: 'REGISTERED', gstNumber: '123', defaultBreakMinutes: 45 },
  ],
  pharmacies: [
    { id: 'pha1', nom: 'P1', adresse: '', ville: '', codePostal: '', telephone: '', email: '', defaultBreakMinutes: 60 },
    { id: 'pha2', nom: 'P2', adresse: '', ville: '', codePostal: '', telephone: '', email: '', defaultBreakMinutes: 60 },
  ],
  missions: [{ id: 'mis1', pharmacienId: 'ph1', pharmacieId: 'pha1', invoiceId: 'inv1', status: 'COMPLETED', dateDebut: '', dateFin: '', days: [], totalHours: 0, mealFeeCents: 0, mileageKm: 0, subtotalCents: 0, mealTotalCents: 0, mileageTotalCents: 0, totalCents: 0 } as any],
  invoices: [{ id: 'inv1', numero: 'F1', pharmacienId: 'ph1', pharmacieId: 'pha1', missionId: 'mis1', dateFacture: '2026-06-10', dateEcheance: '2026-07-10', status: 'SENT', amountCents: 10000, hours: 0, createdAt: '' }],
  taxPayments: [],
  deductibleExpenses: [],
  expenseReceipts: [],
  fiscalSettings: {
    reserveRate: 0.3,
    fiscalYearStartMonth: 1,
    currentFiscalYear: 2026,
    smallSupplierThresholdCents: 3000000,
    smallSupplierWarningRate: 0.8,
    instalmentDates: ['03-15', '06-15', '09-15', '12-15'],
    quebecNetTaxOwingThresholdCents: 180000,
    federalNetTaxOwingThresholdCents: 300000,
    federalDefaultNetTaxOwingThresholdCents: 300000,
    currentYear: 2026,
    defaultTaxStatus: 'SMALL_SUPPLIER',
    includeMissionDeductibleExpenses: true,
    trackExpenseReceipts: true,
    warnMissingExpenseReceipts: true,
    showMonthlyView: true,
    showQuarterlyView: true,
    showAnnualView: true,
    enableInstalmentTracking: true,
    enableSmallSupplierTracking: true,
    enableExpenseTracking: true,
  },
  distanceReferences: [],
  opqPharmacistRegistry: {
    entries: [],
    sourceUrl: 'https://www.opq.org/trouver-un-pharmacien/',
  },
  appOptions: {
    missionDefaults: {
      defaultMissionType: 'REMPLACEMENT_OFFICINE',
      defaultStartTime: '08:00',
      defaultEndTime: '17:00',
      defaultBreakMinutes: 60,
      mealAutoEnabled: true,
      mealThresholdHours: 8,
      mealDefaultCents: 2000,
      mileageRateCents: 61,
    },
    invoiceDefaults: { invoiceDueDays: 30, paymentTerms: 'Net' },
    pdfCalendar: {
      calendarIcsEnabled: true,
      calendarReminderMinutes: null,
      pdfFooterEnabled: true,
      calendarEventTitle: 'Mission pharmacie',
      calendarReminder: 'NONE',
    },
  },
  uiSettings: { themeMode: 'light' },
  localDataSettings: { autoBackupEnabled: true },
  ui: { missionFilters: {}, lastVisitedAt: undefined },
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
      expect(selectFinancialOptions(state).reserveRate).toBe(0.3);
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
