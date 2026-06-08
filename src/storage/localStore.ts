import { useSyncExternalStore } from 'react';
import { APP_SCHEMA_VERSION, APP_STORAGE_KEY, type AppState, type TaxPayment } from './schema';
import { createDefaultFiscalSettings, createSeedState } from './seedData';
import { createDefaultUiSettings } from './settings/uiSettings';
import { createDefaultLocalDataSettings } from './settings/localDataSettings';
import { normalizeMissionExpense } from '../services/expenseTypes';

type Listener = () => void;

let cachedState: AppState | null = null;
const listeners = new Set<Listener>();

function migrate(raw: unknown): AppState {
  const candidate = raw as Partial<AppState> | null;
  if (!candidate || candidate.version === 2) {
    return candidate as AppState;
  }
  if (!candidate || candidate.version !== 1) {
    return createSeedState();
  }
  const taxPayments = (candidate.taxPayments ?? []).map((payment) => {
    const legacy = payment as TaxPayment & { paymentDate?: string; periodLabel?: string; recipient?: string; label?: string; taxYear?: number };
    if (legacy.date && legacy.period && legacy.authority && legacy.type) return legacy;
    return {
      id: legacy.id,
      date: legacy.paymentDate ?? legacy.date ?? new Date().toISOString().slice(0, 10),
      period: legacy.periodLabel ?? legacy.period ?? (legacy.taxYear ? `Année ${legacy.taxYear}` : 'Année courante'),
      authority: legacy.recipient === 'ARC' || legacy.recipient === 'CRA' ? 'CRA' : 'REVENU_QUEBEC',
      type: 'INCOME_TAX_INSTALMENT',
      amountCents: legacy.amountCents ?? 0,
      reference: legacy.reference,
      notes: legacy.label,
    } satisfies TaxPayment;
  });

  const defaultFiscalSettings = createDefaultFiscalSettings();
  const migratedFiscalSettings = {
    ...defaultFiscalSettings,
    ...(candidate.fiscalSettings ?? {}),
    currentFiscalYear: candidate.fiscalSettings?.currentFiscalYear ?? candidate.fiscalSettings?.currentYear ?? defaultFiscalSettings.currentFiscalYear,
    currentYear: candidate.fiscalSettings?.currentYear ?? candidate.fiscalSettings?.currentFiscalYear ?? defaultFiscalSettings.currentYear,
    federalNetTaxOwingThresholdCents: candidate.fiscalSettings?.federalNetTaxOwingThresholdCents ?? candidate.fiscalSettings?.federalDefaultNetTaxOwingThresholdCents ?? defaultFiscalSettings.federalNetTaxOwingThresholdCents,
    federalDefaultNetTaxOwingThresholdCents: candidate.fiscalSettings?.federalDefaultNetTaxOwingThresholdCents ?? candidate.fiscalSettings?.federalNetTaxOwingThresholdCents ?? defaultFiscalSettings.federalDefaultNetTaxOwingThresholdCents,
  };
  const missions = (candidate.missions ?? []).map((mission) => ({
    ...mission,
    days: mission.days.map((day) => ({
      ...day,
      expenses: (day.expenses ?? []).map((expense) => normalizeMissionExpense(expense, mission.id, day.id)),
    })),
  }));

  // Migrer les anciennes options vers la nouvelle structure
  const oldOptions = candidate.options ?? {};
  const appOptions: AppOptions = {
    missionDefaults: {
      defaultMissionType: oldOptions.defaultMissionType ?? 'REMPLACEMENT_OFFICINE',
      defaultStartTime: oldOptions.defaultStartTime ?? '08:00',
      defaultEndTime: oldOptions.defaultEndTime ?? '17:00',
      defaultBreakMinutes: oldOptions.defaultBreakMinutes ?? 60,
      mealAutoEnabled: oldOptions.mealAutoEnabled ?? true,
      mealThresholdHours: oldOptions.mealThresholdHours ?? 8,
      mealDefaultCents: oldOptions.mealDefaultCents ?? 2000,
      mileageRateCents: oldOptions.mileageRateCents ?? 61,
    },
    invoiceDefaults: {
      invoiceDueDays: oldOptions.invoiceDueDays ?? 30,
      paymentTerms: oldOptions.paymentTerms ?? 'Paiement par virement dans les 30 jours.',
    },
    pdfCalendar: {
      calendarIcsEnabled: oldOptions.calendarIcsEnabled ?? true,
      calendarReminderMinutes: null,
      pdfFooterEnabled: true,
      calendarEventTitle: oldOptions.calendarEventTitle ?? 'Mission pharmacie',
      calendarReminder: oldOptions.calendarReminder ?? 'NONE',
    },
  };

  return {
    version: 2,
    activePharmacienId: candidate.activePharmacienId ?? null,
    pharmaciens: candidate.pharmaciens ?? [],
    pharmacies: candidate.pharmacies ?? [],
    missions,
    invoices: candidate.invoices ?? [],
    taxPayments,
    deductibleExpenses: candidate.deductibleExpenses ?? [],
    expenseReceipts: candidate.expenseReceipts ?? [],
    fiscalSettings: migratedFiscalSettings,
    distanceReferences: candidate.distanceReferences ?? [],
    appOptions,
    uiSettings: createDefaultUiSettings(),
    localDataSettings: createDefaultLocalDataSettings(),
    ui: {
      missionFilters: candidate.ui?.missionFilters ?? {},
      lastVisitedAt: candidate.ui?.lastVisitedAt,
    },
  };
}

function readStorage(): AppState {
  if (cachedState) return cachedState;
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    cachedState = raw ? migrate(JSON.parse(raw)) : createSeedState();
  } catch {
    cachedState = createSeedState();
  }
  persist(cachedState);
  return cachedState;
}

function persist(state: AppState): void {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browser storage can be blocked or full; keep the in-memory state usable.
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getAppState(): AppState {
  return readStorage();
}

export function setAppState(nextState: AppState): void {
  cachedState = { ...nextState, ui: { ...nextState.ui, lastVisitedAt: new Date().toISOString() } };
  persist(cachedState);
  emit();
}

export function updateAppState(updater: (state: AppState) => AppState): void {
  setAppState(updater(getAppState()));
}

export function resetAppState(): void {
  setAppState(createSeedState());
}

export function importAppState(json: string): void {
  setAppState(migrate(JSON.parse(json)));
}

export function exportAppState(): string {
  return JSON.stringify(getAppState(), null, 2);
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getAppState,
    getAppState,
  );
}
