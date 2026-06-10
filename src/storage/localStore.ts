import { useSyncExternalStore } from 'react';
import { APP_SCHEMA_VERSION, APP_STORAGE_KEY, type AppState, type TaxPayment } from './schema';
import type { AppOptions } from './settings/appOptions';
import { createDefaultFiscalSettings, createSeedState } from './seedData';
import { createDefaultUiSettings } from './settings/uiSettings';
import { createDefaultLocalDataSettings } from './settings/localDataSettings';
import { normalizeMissionExpense } from '../services/expenseTypes';
import { loadFromIndexedDB, saveToIndexedDB, clearIndexedDB, migrateFromLocalStorageToIndexedDB, isIndexedDBSupported } from './indexedDB';

type Listener = () => void;

let cachedState: AppState | null = null;
const listeners = new Set<Listener>();

// Indique si on utilise IndexedDB (défini après l'initialisation)
let useIndexedDB = false;

type MigrationCandidate = AppState & { options?: AppOptions };

function migrate(raw: unknown): AppState {
  const candidate = raw as MigrationCandidate | null;
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

  // Migrer les anciennes options vers la nouvelle structure, en supportant v1 plat et v2 imbriqué
  const rawOptions = (candidate as { options?: AppOptions | Record<string, unknown> }).options;
  const appOptions: AppOptions = {
    missionDefaults: {
      defaultMissionType: (rawOptions as any)?.missionDefaults?.defaultMissionType ?? (rawOptions as any)?.defaultMissionType ?? 'REMPLACEMENT_OFFICINE',
      defaultStartTime: (rawOptions as any)?.missionDefaults?.defaultStartTime ?? (rawOptions as any)?.defaultStartTime ?? '08:00',
      defaultEndTime: (rawOptions as any)?.missionDefaults?.defaultEndTime ?? (rawOptions as any)?.defaultEndTime ?? '17:00',
      defaultBreakMinutes: (rawOptions as any)?.missionDefaults?.defaultBreakMinutes ?? (rawOptions as any)?.defaultBreakMinutes ?? 60,
      mealAutoEnabled: (rawOptions as any)?.missionDefaults?.mealAutoEnabled ?? (rawOptions as any)?.mealAutoEnabled ?? true,
      mealThresholdHours: (rawOptions as any)?.missionDefaults?.mealThresholdHours ?? (rawOptions as any)?.mealThresholdHours ?? 8,
      mealDefaultCents: (rawOptions as any)?.missionDefaults?.mealDefaultCents ?? (rawOptions as any)?.mealDefaultCents ?? 2000,
      mileageRateCents: (rawOptions as any)?.missionDefaults?.mileageRateCents ?? (rawOptions as any)?.mileageRateCents ?? 61,
    },
    invoiceDefaults: {
      invoiceDueDays: (rawOptions as any)?.invoiceDefaults?.invoiceDueDays ?? (rawOptions as any)?.invoiceDueDays ?? 30,
      paymentTerms: (rawOptions as any)?.invoiceDefaults?.paymentTerms ?? (rawOptions as any)?.paymentTerms ?? 'Paiement par virement dans les 30 jours.',
    },
    pdfCalendar: {
      calendarIcsEnabled: (rawOptions as any)?.pdfCalendar?.calendarIcsEnabled ?? (rawOptions as any)?.calendarIcsEnabled ?? true,
      calendarReminderMinutes: (rawOptions as any)?.pdfCalendar?.calendarReminderMinutes ?? null,
      pdfFooterEnabled: (rawOptions as any)?.pdfCalendar?.pdfFooterEnabled ?? true,
      calendarEventTitle: (rawOptions as any)?.pdfCalendar?.calendarEventTitle ?? (rawOptions as any)?.calendarEventTitle ?? 'Mission pharmacie',
      calendarReminder: (rawOptions as any)?.pdfCalendar?.calendarReminder ?? (rawOptions as any)?.calendarReminder ?? 'NONE',
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

// Initialisation asynchrone de IndexedDB et migration des données
async function initStorage(): Promise<void> {
  useIndexedDB = isIndexedDBSupported();
  if (useIndexedDB) {
    try {
      await migrateFromLocalStorageToIndexedDB();
    } catch {
      // Si la migration échoue, on continue avec IndexedDB vide ou localStorage
    }
  }
}

// Appel initial de l'initialisation
initStorage().catch(() => {});

async function readStorage(): Promise<AppState> {
  if (cachedState) return cachedState;
  
  try {
    let raw: unknown | null = null;
    
    if (useIndexedDB) {
      raw = await loadFromIndexedDB();
    } else {
      const localData = localStorage.getItem(APP_STORAGE_KEY);
      raw = localData ? JSON.parse(localData) : null;
    }
    
    cachedState = raw ? migrate(raw) : createSeedState();
  } catch {
    cachedState = createSeedState();
  }
  
  await persist(cachedState);
  return cachedState;
}

async function persist(state: AppState): Promise<void> {
  try {
    if (useIndexedDB) {
      await saveToIndexedDB(state);
    } else {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Browser storage can be blocked or full; keep the in-memory state usable.
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Toutes les options de stockage ont échoué
    }
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

// Cache pour la version synchrone (nécessaire pour useSyncExternalStore)
let syncCachedState: AppState | null = null;

// Initialisation synchrone pour le premier chargement
function syncReadStorage(): AppState {
  if (syncCachedState) return syncCachedState;
  try {
    const localData = localStorage.getItem(APP_STORAGE_KEY);
    syncCachedState = localData ? migrate(JSON.parse(localData)) : createSeedState();
  } catch {
    syncCachedState = createSeedState();
  }
  return syncCachedState;
}

function syncPersist(state: AppState): void {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browser storage can be blocked or full; keep the in-memory state usable.
  }
}

export function getAppState(): AppState {
  return syncReadStorage();
}

export function setAppState(nextState: AppState): void {
  const stateWithTimestamp = { ...nextState, ui: { ...nextState.ui, lastVisitedAt: new Date().toISOString() } };
  cachedState = stateWithTimestamp;
  syncCachedState = stateWithTimestamp;
  
  // Persistance asynchrone
  persist(stateWithTimestamp).catch(() => {});
  
  emit();
}

export function updateAppState(updater: (state: AppState) => AppState): void {
  setAppState(updater(getAppState()));
}

export function resetAppState(): void {
  const seedState = createSeedState();
  cachedState = seedState;
  syncCachedState = seedState;
  
  // Suppression asynchrone
  clearIndexedDB().catch(() => {});
  localStorage.removeItem(APP_STORAGE_KEY);
  
  emit();
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
