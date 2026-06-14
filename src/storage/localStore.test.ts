import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { importAppState, resetAppState, updateAppState, exportAppState, getAppState } from './localStore';

const baseV1 = {
  version: 1,
  options: {
    defaultMissionType: 'REMPLACEMENT_OFFICINE',
    defaultStartTime: '09:00',
    defaultEndTime: '17:00',
    defaultBreakMinutes: 30,
    invoiceDueDays: 30,
    mealAutoEnabled: true,
    mealThresholdHours: 8,
    mealDefaultCents: 2000,
    mileageRateCents: 61,
    legalPdfFooter: 'Pied de page',
    paymentModeLabel: 'Virement',
    pdfDownloadMode: 'PLAYWRIGHT',
    calendarIcsEnabled: true,
    calendarEventTitle: 'Mission',
    calendarReminder: 'NONE',
  },
  fiscalSettings: {
    reserveRate: 0.3,
    smallSupplierThresholdCents: 3000000,
  },
  pharmaciens: [{ id: 'ph1', nom: 'A', taxStatus: 'SMALL_SUPPLIER' }],
  pharmacies: [{ id: 'pha1', nom: 'B' }],
  ui: { missionFilters: { status: 'COMPLETED' }, lastVisitedAt: '2026-01-01T00:00:00.000Z' },
};

describe('localStore migration', () => {
  const originalLocalStorage = globalThis.localStorage;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, writable: true });
  });

  it('migrates v1 flat options to v2 appOptions structure', () => {
    store['mission-app:v1'] = JSON.stringify(baseV1);
    importAppState(JSON.stringify(baseV1));
    const state = getAppState();

    expect(state.version).toBe(2);
    expect(state.appOptions.missionDefaults.defaultBreakMinutes).toBe(30);
    expect(state.appOptions.invoiceDefaults.invoiceDueDays).toBe(30);
    expect(state.appOptions.invoiceDefaults.paymentTerms).toBe('Paiement par virement dans les 30 jours.');
    expect(state.appOptions.pdfCalendar.calendarIcsEnabled).toBe(true);
    expect(state.appOptions.pdfCalendar.calendarEventTitle).toBe('Mission');
    expect(state.uiSettings.themeMode).toBe('system');
    expect(state.localDataSettings.autoBackupEnabled).toBe(true);
    expect(state.ui.missionFilters).toEqual({ status: 'COMPLETED' });
    expect(state.ui.lastVisitedAt).toBeDefined();
  });

  it('migrates legacy tax payments renamed fields', () => {
    const legacy = {
      ...baseV1,
      taxPayments: [
        { id: 'tax1', paymentDate: '2026-01-01', periodLabel: 'T1 2026', recipient: 'REVENU_QUEBEC', label: 'Acompte', amountCents: 5000 },
      ],
    };
    store['mission-app:v1'] = JSON.stringify(legacy);
    importAppState(JSON.stringify(legacy));
    const state = getAppState();

    expect(state.taxPayments[0]).toEqual({
      id: 'tax1',
      date: '2026-01-01',
      period: 'T1 2026',
      authority: 'REVENU_QUEBEC',
      type: 'INCOME_TAX_INSTALMENT',
      amountCents: 5000,
      reference: undefined,
      notes: 'Acompte',
    });
  });

  it('does not re-migrate v2 state', () => {
    const v2 = { version: 2, pharmaciens: [], pharmacies: [], missions: [], invoices: [], taxPayments: [], deductibleExpenses: [], expenseReceipts: [], fiscalSettings: { reserveRate: 0.3 }, distanceReferences: [], appOptions: { missionDefaults: { defaultBreakMinutes: 60 }, invoiceDefaults: { invoiceDueDays: 30 }, pdfCalendar: { calendarIcsEnabled: true } }, uiSettings: { themeMode: 'light' }, localDataSettings: { autoBackupEnabled: true }, ui: {} };
    store['mission-app:v1'] = JSON.stringify(v2);
    importAppState(JSON.stringify(v2));
    const state = getAppState();

    expect(state.version).toBe(2);
    expect(state.appOptions.missionDefaults.defaultBreakMinutes).toBe(60);
    expect(state.opqPharmacistRegistry.entries.length).toBeGreaterThan(1000);
  });

  it('fills an existing empty OPQ registry from the bundled snapshot', () => {
    const v2 = {
      version: 2,
      pharmaciens: [],
      pharmacies: [],
      missions: [],
      invoices: [],
      taxPayments: [],
      deductibleExpenses: [],
      expenseReceipts: [],
      fiscalSettings: { reserveRate: 0.3 },
      distanceReferences: [],
      opqPharmacistRegistry: { entries: [], sourceUrl: 'https://www.opq.org/trouver-un-pharmacien/' },
      appOptions: { missionDefaults: { defaultBreakMinutes: 60 }, invoiceDefaults: { invoiceDueDays: 30 }, pdfCalendar: { calendarIcsEnabled: true } },
      uiSettings: { themeMode: 'light' },
      localDataSettings: { autoBackupEnabled: true },
      ui: {},
    };

    importAppState(JSON.stringify(v2));
    const state = getAppState();

    expect(state.opqPharmacistRegistry.entries.length).toBeGreaterThan(1000);
  });

  it('resets state to default via resetAppState', () => {
    updateAppState((state) => ({ ...state, pharmaciens: [] }));
    expect(getAppState().pharmaciens).toHaveLength(0);

    resetAppState();
    const state = getAppState();
    expect(state.version).toBe(2);
    expect(state.pharmaciens).toEqual([]);
    expect(state.opqPharmacistRegistry.entries.length).toBeGreaterThan(1000);
  });

  it('preserves fiscalSettings with fallbacks', () => {
    const v1 = {
      ...baseV1,
      fiscalSettings: { currentYear: 2025, federalDefaultNetTaxOwingThresholdCents: 250000, currentFiscalYear: 2025 },
    };
    store['mission-app:v1'] = JSON.stringify(v1);
    importAppState(JSON.stringify(v1));
    const state = getAppState();

    expect(state.fiscalSettings.currentYear).toBe(2025);
    expect(state.fiscalSettings.currentFiscalYear).toBe(2025);
    expect(state.fiscalSettings.federalNetTaxOwingThresholdCents).toBe(250000);
  });
});

describe('localStore state operations', () => {
  const originalLocalStorage = globalThis.localStorage;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
      },
      writable: true,
    });
    resetAppState();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, writable: true });
  });

  it('returns seed state when localStorage is empty', () => {
    const state = getAppState();
    expect(state.version).toBe(2);
    expect(state.pharmaciens).toEqual([]);
    expect(state.opqPharmacistRegistry.sourceUrl).toBe('https://www.opq.org/trouver-un-pharmacien/');
    expect(state.opqPharmacistRegistry.entries.length).toBeGreaterThan(1000);
  });

  it('updates state via updateAppState', () => {
    const before = getAppState();
    updateAppState((state) => ({
      ...state,
      pharmaciens: [...state.pharmaciens, { id: 'ph_new', nom: 'New', taxStatus: 'REGISTERED' } as any],
    }));
    const after = getAppState();
    expect(after.pharmaciens.length).toBe(before.pharmaciens.length + 1);
  });

  it('round-trips state through export/import', () => {
    const state = getAppState();
    const json = exportAppState();
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(2);
    expect(parsed.pharmaciens).toEqual([]);
    expect(parsed.opqPharmacistRegistry.entries.length).toBeGreaterThan(1000);
  });
});
