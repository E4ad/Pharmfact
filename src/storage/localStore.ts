import { useSyncExternalStore } from 'react';
import {
  APP_SCHEMA_VERSION,
  APP_STORAGE_KEY,
  type AppState,
  type DistanceReference,
  type Invoice,
  type Mission,
  type OpqPharmacistRegistry,
  type PaymentStatus,
  type Pharmacie,
  type TaxPayment,
} from './schema';
import type { AppOptions } from './settings/appOptions';
import { createDefaultFiscalSettings, createSeedState } from './seedData';
import { createDefaultUiSettings } from './settings/uiSettings';
import { createDefaultLocalDataSettings } from './settings/localDataSettings';
import { normalizeMissionExpense } from '../services/expenseTypes';
import { buildAddressFingerprint } from '../services/distanceService';
import {
  appendAuditTrail,
  buildAuditTrailEntry,
  buildBackupAuditTrailEntry,
  type AuditTrailInput,
} from '../services/auditTrail';
import { OPQ_REGISTRY_SOURCE_URL, bundledOpqRegistryEntries } from '../services/opqRegistry';
import {
  loadFromIndexedDB,
  saveToIndexedDB,
  migrateFromLocalStorageToIndexedDB,
  isIndexedDBSupported,
} from './indexedDB';
import { getPlatformAsync } from '../services/platformService';
import {
  createWeeklyScheduleFromRange,
  detectPharmacyFranchise,
  extractSanteQuebecWeeklyScheduleFromNotes,
  extractWeeklyScheduleFromNotes,
  normalizePharmacyWeeklySchedule,
  pharmacyFranchiseLabels,
} from '../services/pharmacyMetadata';

type Listener = () => void;
type BootstrapStatus = 'loading' | 'ready' | 'error';
export type StorageBootstrapSnapshot = {
  status: BootstrapStatus;
  errorMessage?: string;
};

const TAURI_BOOTSTRAP_TIMEOUT_MS = 4_000;
const READY_BOOTSTRAP_SNAPSHOT: StorageBootstrapSnapshot = { status: 'ready' };

let cachedState: AppState | null = null;
const listeners = new Set<Listener>();
const bootstrapListeners = new Set<Listener>();

let useIndexedDB = false;
let useTauriPlatform = false;

let bootstrapSnapshot: StorageBootstrapSnapshot = isTauriRuntime()
  ? { status: 'loading' }
  : READY_BOOTSTRAP_SNAPSHOT;

type MigrationCandidate = AppState & { options?: AppOptions };

function createDefaultOpqPharmacistRegistry(): OpqPharmacistRegistry {
  return {
    entries: bundledOpqRegistryEntries(),
    sourceUrl: OPQ_REGISTRY_SOURCE_URL,
  };
}

function emitBootstrap(): void {
  bootstrapListeners.forEach((listener) => listener());
}

function setBootstrapSnapshot(next: StorageBootstrapSnapshot): void {
  bootstrapSnapshot = next;
  emitBootstrap();
}

function formatBootstrapError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Impossible de charger les données locales.';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} a dépassé ${Math.round(timeoutMs / 1000)} secondes.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function normalizeOpqPharmacistRegistry(registry?: OpqPharmacistRegistry): OpqPharmacistRegistry {
  if (registry?.entries?.length) {
    return {
      ...registry,
      sourceUrl: registry.sourceUrl || OPQ_REGISTRY_SOURCE_URL,
    };
  }

  return createDefaultOpqPharmacistRegistry();
}

function normalizeSmallSupplierWarningRate(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0.8;
  return value! > 1 ? value! / 100 : value!;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && (!!window.__TAURI_INTERNALS__ || !!window.__TAURI__);
}

function normalizeMissionForV3(mission: Mission): Mission {
  const actType = mission.actType ?? 'REMPLACEMENT_OFFICINE';
  return {
    ...mission,
    actType,
    invoiceLabel: mission.invoiceLabel,
    suggestedTaxClassification: mission.suggestedTaxClassification ?? 'TO_VALIDATE',
  };
}

function normalizeInvoiceForV3(
  invoice: Invoice & { missionId?: string; missionIds?: string[] },
): Invoice {
  const missionIds = invoice.missionIds?.length
    ? invoice.missionIds
    : invoice.missionId
      ? [invoice.missionId]
      : [];
  return {
    ...invoice,
    missionIds,
    missionId: invoice.missionId ?? missionIds[0],
  };
}

function normalizeInvoiceForV4(invoice: Invoice): Invoice {
  // Mapper les anciens statuts vers les nouveaux
  let status = invoice.status;
  if (status === 'GENERATED') {
    status = 'draft';
  } else if (status === 'SENT') {
    status = 'sent';
  } else if (status === 'PAID') {
    status = 'sent';
  }
  
  // Calculer les valeurs par défaut pour les champs ajoutés
  const paidAmountCents = invoice.paidAmountCents ?? 0;
  const balanceDue = Math.max(0, invoice.amountCents - paidAmountCents);
  
  let paymentStatus: PaymentStatus = 'to_collect';
  if (paidAmountCents > 0) {
    paymentStatus = paidAmountCents >= invoice.amountCents ? 'paid' : 'partial';
  }
  
  return {
    ...invoice,
    status,
    paymentStatus,
    paidAmountCents,
    balanceDue,
    payments: invoice.payments ?? [],
    versionInfo: invoice.versionInfo,
    correctionState: invoice.correctionState,
    previousPaidAmount: invoice.previousPaidAmount,
    remainingBalanceFromCorrection: invoice.remainingBalanceFromCorrection,
    overpayment: invoice.overpayment,
    pdfGeneratedAt: invoice.pdfGeneratedAt,
    pdfPath: invoice.pdfPath,
    updatedAt: invoice.updatedAt ?? invoice.createdAt,
  };
}

function normalizeDistanceReferenceForV3(candidate: MigrationCandidate, reference: Partial<DistanceReference> & {
  source?: DistanceReference['source'] | 'calculated';
}): DistanceReference | null {
  if (!reference.id || !reference.pharmacienId || !reference.pharmacieId) return null;
  const distanceKm = Number(reference.distanceKm);
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;

  const pharmacien = candidate.pharmaciens?.find((item) => item.id === reference.pharmacienId);
  const pharmacie = candidate.pharmacies?.find((item) => item.id === reference.pharmacieId);
  const fromAddressHash = reference.fromAddressHash || reference.pharmacienAddressKey || buildAddressFingerprint(pharmacien);
  const toAddressHash = reference.toAddressHash || reference.pharmacieAddressKey || buildAddressFingerprint(pharmacie);
  const computedAt = reference.computedAt || reference.updatedAt || new Date().toISOString();
  const source: DistanceReference['source'] =
    reference.source === 'manual'
      ? 'manual'
      : reference.source === 'route'
        ? 'route'
        : 'cached';

  return {
    id: reference.id,
    pharmacienId: reference.pharmacienId,
    pharmacieId: reference.pharmacieId,
    distanceKm: Math.round(distanceKm),
    distanceAllerKm: Number.isFinite(reference.distanceAllerKm)
      ? Math.round(Number(reference.distanceAllerKm))
      : undefined,
    fromAddressHash,
    toAddressHash,
    provider: reference.provider ?? (source === 'manual' ? 'manual' : source === 'route' ? 'osrm' : undefined),
    computedAt,
    errorReason: reference.errorReason,
    source,
    updatedAt: reference.updatedAt || computedAt,
    pharmacienAddressKey: fromAddressHash,
    pharmacieAddressKey: toAddressHash,
  };
}

function normalizePharmacieForV3(pharmacie: Pharmacie): Pharmacie {
  const legacyPharmacie = pharmacie as Pharmacie & {
    usualSchedule?: { startTime?: string; endTime?: string };
    scheduleSource?: 'manual' | 'notes_migration' | 'default' | 'unknown';
  };
  const detected = detectPharmacyFranchise(pharmacie.displayLabel || pharmacie.nom || '');
  const hasManualFranchise = Boolean(pharmacie.franchise && pharmacie.franchise !== 'unknown');
  const legacyWeeklySchedule = legacyPharmacie.usualSchedule
    ? createWeeklyScheduleFromRange(legacyPharmacie.usualSchedule.startTime, legacyPharmacie.usualSchedule.endTime, {
        source: legacyPharmacie.scheduleSource === 'notes_migration' ? 'notes_migration' : 'manual',
        extractedFromNotes: legacyPharmacie.scheduleSource === 'notes_migration',
        updatedAt: new Date().toISOString(),
      })
    : undefined;
  const extractedSchedule = pharmacie.weeklySchedule || legacyWeeklySchedule
    ? null
    : extractSanteQuebecWeeklyScheduleFromNotes(pharmacie.notes ?? '') ?? extractWeeklyScheduleFromNotes(pharmacie.notes ?? '');
  const weeklySchedule = normalizePharmacyWeeklySchedule(pharmacie.weeklySchedule ?? legacyWeeklySchedule ?? extractedSchedule ?? undefined);
  const franchise = pharmacie.franchise ?? detected.franchise;
  const franchiseLabel = pharmacie.franchiseLabel
    ?? (hasManualFranchise ? pharmacyFranchiseLabels[franchise] : detected.label);

  return {
    ...pharmacie,
    defaultBreakMinutes: Math.max(Number(pharmacie.defaultBreakMinutes) || 0, 0),
    franchise,
    franchiseLabel,
    weeklySchedule,
    isFavorite: pharmacie.isFavorite ?? false,
    favoriteRank: pharmacie.favoriteRank,
    lastUsedAt: pharmacie.lastUsedAt,
  };
}

function normalizeV3State(
  candidate: MigrationCandidate,
  version: AppState['version'] = APP_SCHEMA_VERSION,
): AppState {
  const v3 = {
    ...candidate,
    version,
    activePharmacienId: candidate.activePharmacienId ?? null,
    pharmaciens: candidate.pharmaciens ?? [],
    pharmacies: (candidate.pharmacies ?? []).map(normalizePharmacieForV3),
    missions: (candidate.missions ?? []).map(normalizeMissionForV3),
    invoices: (candidate.invoices ?? []).map(normalizeInvoiceForV3),
    taxPayments: candidate.taxPayments ?? [],
    deductibleExpenses: candidate.deductibleExpenses ?? [],
    expenseReceipts: candidate.expenseReceipts ?? [],
    fiscalSettings: {
      ...createDefaultFiscalSettings(),
      ...(candidate.fiscalSettings ?? {}),
      smallSupplierThresholdCents:
        candidate.fiscalSettings?.smallSupplierThresholdCents ??
        createDefaultFiscalSettings().smallSupplierThresholdCents,
      smallSupplierWarningRate: normalizeSmallSupplierWarningRate(
        candidate.fiscalSettings?.smallSupplierWarningRate,
      ),
    },
    distanceReferences: (candidate.distanceReferences ?? [])
      .map((reference) => normalizeDistanceReferenceForV3(candidate, reference as Partial<DistanceReference>))
      .filter((reference): reference is DistanceReference => Boolean(reference)),
    opqPharmacistRegistry: normalizeOpqPharmacistRegistry(candidate.opqPharmacistRegistry),
    appOptions: candidate.appOptions ?? createDefaultAppOptions(),
    uiSettings: candidate.uiSettings ?? createDefaultUiSettings(),
    localDataSettings: candidate.localDataSettings ?? createDefaultLocalDataSettings(),
    ui: {
      missionFilters: candidate.ui?.missionFilters ?? {},
      lastVisitedAt: candidate.ui?.lastVisitedAt,
      auditTrail: candidate.ui?.auditTrail ?? [],
    },
  };

  return {
    ...v3,
    invoices: v3.invoices.map(normalizeInvoiceForV4),
  };
}

function normalizeV4State(candidate: MigrationCandidate): AppState {
  const defaultFiscalSettings = createDefaultFiscalSettings();
  return {
    version: 4,
    activePharmacienId: candidate.activePharmacienId ?? null,
    pharmaciens: candidate.pharmaciens ?? [],
    pharmacies: (candidate.pharmacies ?? []).map(normalizePharmacieForV3),
    missions: (candidate.missions ?? []).map(normalizeMissionForV3),
    invoices: (candidate.invoices ?? []).map(normalizeInvoiceForV4),
    taxPayments: candidate.taxPayments ?? [],
    deductibleExpenses: candidate.deductibleExpenses ?? [],
    expenseReceipts: candidate.expenseReceipts ?? [],
    fiscalSettings: {
      ...defaultFiscalSettings,
      ...(candidate.fiscalSettings ?? {}),
      smallSupplierThresholdCents:
        candidate.fiscalSettings?.smallSupplierThresholdCents ??
        defaultFiscalSettings.smallSupplierThresholdCents,
      smallSupplierWarningRate: normalizeSmallSupplierWarningRate(
        candidate.fiscalSettings?.smallSupplierWarningRate,
      ),
    },
    distanceReferences: (candidate.distanceReferences ?? [])
      .map((reference) => normalizeDistanceReferenceForV3(candidate, reference as Partial<DistanceReference>))
      .filter((reference): reference is DistanceReference => Boolean(reference)),
    opqPharmacistRegistry: normalizeOpqPharmacistRegistry(candidate.opqPharmacistRegistry),
    appOptions: candidate.appOptions ?? createDefaultAppOptions(),
    uiSettings: candidate.uiSettings ?? createDefaultUiSettings(),
    localDataSettings: candidate.localDataSettings ?? createDefaultLocalDataSettings(),
    ui: {
      missionFilters: candidate.ui?.missionFilters ?? {},
      lastVisitedAt: candidate.ui?.lastVisitedAt,
      auditTrail: candidate.ui?.auditTrail ?? [],
    },
  };
}

function createDefaultAppOptions(): AppOptions {
  return {
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
    invoiceDefaults: {
      invoiceDueDays: 30,
      paymentTerms: 'Paiement par virement dans les 30 jours.',
    },
    pdfCalendar: {
      calendarIcsEnabled: true,
      calendarReminderMinutes: null,
      pdfFooterEnabled: true,
      calendarEventTitle: 'Mission pharmacie',
      calendarReminder: 'NONE',
    },
  };
}

function migrateV1ToV2(candidate: MigrationCandidate): AppState {
  const taxPayments = (candidate.taxPayments ?? []).map((payment) => {
    const legacy = payment as TaxPayment & {
      paymentDate?: string;
      periodLabel?: string;
      recipient?: string;
      label?: string;
      taxYear?: number;
    };
    if (legacy.date && legacy.period && legacy.authority && legacy.type) return legacy;
    return {
      id: legacy.id,
      date: legacy.paymentDate ?? legacy.date ?? new Date().toISOString().slice(0, 10),
      period:
        legacy.periodLabel ??
        legacy.period ??
        (legacy.taxYear ? `Année ${legacy.taxYear}` : 'Année courante'),
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
    currentFiscalYear:
      candidate.fiscalSettings?.currentFiscalYear ??
      candidate.fiscalSettings?.currentYear ??
      defaultFiscalSettings.currentFiscalYear,
    currentYear:
      candidate.fiscalSettings?.currentYear ??
      candidate.fiscalSettings?.currentFiscalYear ??
      defaultFiscalSettings.currentYear,
    federalNetTaxOwingThresholdCents:
      candidate.fiscalSettings?.federalNetTaxOwingThresholdCents ??
      candidate.fiscalSettings?.federalDefaultNetTaxOwingThresholdCents ??
      defaultFiscalSettings.federalNetTaxOwingThresholdCents,
    federalDefaultNetTaxOwingThresholdCents:
      candidate.fiscalSettings?.federalDefaultNetTaxOwingThresholdCents ??
      candidate.fiscalSettings?.federalNetTaxOwingThresholdCents ??
      defaultFiscalSettings.federalDefaultNetTaxOwingThresholdCents,
  };
  const missions = (candidate.missions ?? []).map((mission) => ({
    ...mission,
    days: mission.days.map((day) => ({
      ...day,
      expenses: (day.expenses ?? []).map((expense) =>
        normalizeMissionExpense(expense, mission.id, day.id),
      ),
    })),
  }));

  // Migrer les anciennes options vers la nouvelle structure, en supportant v1 plat et v2 imbriqué
  const rawOptions = (candidate as { options?: AppOptions | Record<string, unknown> }).options;
  const appOptions: AppOptions = {
    missionDefaults: {
      defaultMissionType:
        (rawOptions as any)?.missionDefaults?.defaultMissionType ??
        (rawOptions as any)?.defaultMissionType ??
        'REMPLACEMENT_OFFICINE',
      defaultStartTime:
        (rawOptions as any)?.missionDefaults?.defaultStartTime ??
        (rawOptions as any)?.defaultStartTime ??
        '08:00',
      defaultEndTime:
        (rawOptions as any)?.missionDefaults?.defaultEndTime ??
        (rawOptions as any)?.defaultEndTime ??
        '17:00',
      defaultBreakMinutes:
        (rawOptions as any)?.missionDefaults?.defaultBreakMinutes ??
        (rawOptions as any)?.defaultBreakMinutes ??
        60,
      mealAutoEnabled:
        (rawOptions as any)?.missionDefaults?.mealAutoEnabled ??
        (rawOptions as any)?.mealAutoEnabled ??
        true,
      mealThresholdHours:
        (rawOptions as any)?.missionDefaults?.mealThresholdHours ??
        (rawOptions as any)?.mealThresholdHours ??
        8,
      mealDefaultCents:
        (rawOptions as any)?.missionDefaults?.mealDefaultCents ??
        (rawOptions as any)?.mealDefaultCents ??
        2000,
      mileageRateCents:
        (rawOptions as any)?.missionDefaults?.mileageRateCents ??
        (rawOptions as any)?.mileageRateCents ??
        61,
    },
    invoiceDefaults: {
      invoiceDueDays:
        (rawOptions as any)?.invoiceDefaults?.invoiceDueDays ??
        (rawOptions as any)?.invoiceDueDays ??
        30,
      paymentTerms:
        (rawOptions as any)?.invoiceDefaults?.paymentTerms ??
        (rawOptions as any)?.paymentTerms ??
        'Paiement par virement dans les 30 jours.',
    },
    pdfCalendar: {
      calendarIcsEnabled:
        (rawOptions as any)?.pdfCalendar?.calendarIcsEnabled ??
        (rawOptions as any)?.calendarIcsEnabled ??
        true,
      calendarReminderMinutes: (rawOptions as any)?.pdfCalendar?.calendarReminderMinutes ?? null,
      pdfFooterEnabled: (rawOptions as any)?.pdfCalendar?.pdfFooterEnabled ?? true,
      calendarEventTitle:
        (rawOptions as any)?.pdfCalendar?.calendarEventTitle ??
        (rawOptions as any)?.calendarEventTitle ??
        'Mission pharmacie',
      calendarReminder:
        (rawOptions as any)?.pdfCalendar?.calendarReminder ??
        (rawOptions as any)?.calendarReminder ??
        'NONE',
    },
  };

  return normalizeV3State({
    version: 3,
    activePharmacienId: candidate.activePharmacienId ?? null,
    pharmaciens: candidate.pharmaciens ?? [],
    pharmacies: candidate.pharmacies ?? [],
    missions: missions as Mission[],
    invoices: candidate.invoices ?? [],
    taxPayments,
    deductibleExpenses: candidate.deductibleExpenses ?? [],
    expenseReceipts: candidate.expenseReceipts ?? [],
    fiscalSettings: migratedFiscalSettings,
    distanceReferences: candidate.distanceReferences ?? [],
    opqPharmacistRegistry: normalizeOpqPharmacistRegistry(candidate.opqPharmacistRegistry),
    appOptions,
    uiSettings: createDefaultUiSettings(),
    localDataSettings: createDefaultLocalDataSettings(),
    ui: {
      missionFilters: candidate.ui?.missionFilters ?? {},
      lastVisitedAt: candidate.ui?.lastVisitedAt,
      auditTrail: candidate.ui?.auditTrail ?? [],
    },
  } as MigrationCandidate);
}

function migrateLegacyToV2(candidate: MigrationCandidate): AppState {
  // Pour les anciens états sans version, essayer de préserver les données critiques
  return normalizeV3State({
    version: 3,
    activePharmacienId: candidate.activePharmacienId ?? null,
    pharmaciens: candidate.pharmaciens ?? [],
    pharmacies: candidate.pharmacies ?? [],
    missions: candidate.missions ?? [],
    invoices: candidate.invoices ?? [],
    taxPayments: candidate.taxPayments ?? [],
    deductibleExpenses: candidate.deductibleExpenses ?? [],
    expenseReceipts: candidate.expenseReceipts ?? [],
    fiscalSettings: candidate.fiscalSettings ?? createDefaultFiscalSettings(),
    distanceReferences: candidate.distanceReferences ?? [],
    opqPharmacistRegistry: normalizeOpqPharmacistRegistry(candidate.opqPharmacistRegistry),
    appOptions: candidate.appOptions ?? createDefaultAppOptions(),
    uiSettings: candidate.uiSettings ?? createDefaultUiSettings(),
    localDataSettings: candidate.localDataSettings ?? createDefaultLocalDataSettings(),
    ui: {
      missionFilters: candidate.ui?.missionFilters ?? {},
      lastVisitedAt: candidate.ui?.lastVisitedAt,
      auditTrail: candidate.ui?.auditTrail ?? [],
    },
  } as MigrationCandidate);
}

export function migrateAppState(raw: unknown): AppState {
  const candidate = raw as MigrationCandidate | null;

  if (candidate?.version === 4) {
    return normalizeV4State(candidate);
  }

  if (candidate?.version === 3) {
    const v3State = normalizeV3State(candidate);
    return normalizeV4State(v3State as MigrationCandidate);
  }

  if (candidate?.version === 2) {
    const v3State = normalizeV3State(candidate);
    return normalizeV4State(v3State as MigrationCandidate);
  }

  if (candidate?.version === 1) {
    const v3State = migrateV1ToV2(candidate);
    return normalizeV4State(v3State as MigrationCandidate);
  }

  if (candidate) {
    const v3State = migrateLegacyToV2(candidate);
    return normalizeV4State(v3State as MigrationCandidate);
  }

  return createSeedState();
}

async function initStorage(): Promise<void> {
  useTauriPlatform = isTauriRuntime();

  useIndexedDB = !useTauriPlatform && isIndexedDBSupported();
  if (useIndexedDB) {
    try {
      await migrateFromLocalStorageToIndexedDB();
    } catch {
      // Si la migration échoue, on continue avec IndexedDB vide ou localStorage
    }
  }

  if (!useTauriPlatform) {
    setBootstrapSnapshot({ status: 'ready' });
    return;
  }

  setBootstrapSnapshot({ status: 'loading' });

  try {
    await withTimeout(readStorage({ throwOnFailure: true }), TAURI_BOOTSTRAP_TIMEOUT_MS, 'Le chargement des données');
    setBootstrapSnapshot({ status: 'ready' });
  } catch (error) {
    setBootstrapSnapshot({ status: 'error', errorMessage: formatBootstrapError(error) });
  }
}

initStorage().catch(() => {});

async function readStorage(options: { throwOnFailure?: boolean } = {}): Promise<AppState> {
  if (cachedState) return cachedState;

  try {
    let raw: unknown | null = null;

    if (useTauriPlatform) {
      raw = await (await getPlatformAsync()).storage.loadState();
    } else if (useIndexedDB) {
      raw = await loadFromIndexedDB();
    } else {
      const localData = localStorage.getItem(APP_STORAGE_KEY);
      raw = localData ? JSON.parse(localData) : null;
    }

    cachedState = raw ? migrateAppState(raw) : createSeedState();
  } catch (error) {
    if (options.throwOnFailure) throw error;
    cachedState = createSeedState();
  }

  return cachedState;
}

async function persist(state: AppState): Promise<void> {
  try {
    if (useTauriPlatform) {
      await (await getPlatformAsync()).storage.saveState(state);
    } else {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
      if (useIndexedDB || isIndexedDBSupported()) {
        await saveToIndexedDB(state);
      }
    }
  } catch {
    // Browser storage can be blocked or full; keep the in-memory state usable.
    try {
      if (!useTauriPlatform) {
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
      }
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

function syncReadStorage(): AppState {
  try {
    if (cachedState) {
      syncCachedState = cachedState;
      return syncCachedState;
    }

    if (syncCachedState) return syncCachedState;

    // En Tauri, on ne peut pas faire d'appel synchrone, donc on retourne un seed stable
    if (useTauriPlatform) {
      syncCachedState = createSeedState();
      return syncCachedState;
    }

    const localData = localStorage.getItem(APP_STORAGE_KEY);
    syncCachedState = localData ? migrateAppState(JSON.parse(localData)) : createSeedState();
  } catch {
    syncCachedState = createSeedState();
  }
  return syncCachedState;
}

function syncPersist(state: AppState): void {
  try {
    // En Tauri, on ne peut pas faire de persistance synchrone
    if (!useTauriPlatform) {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    }
    // Pour Tauri, la persistance se fait via les fonctions asynchrones
  } catch {
    // Browser storage can be blocked or full; keep the in-memory state usable.
  }
}

export function getAppState(): AppState {
  return syncReadStorage();
}

function applyAuditTrail(
  previousState: AppState,
  nextState: AppState,
  auditInput?: AuditTrailInput | null,
): AppState {
  const entry = auditInput ?? buildAuditTrailEntry(previousState, nextState);
  return appendAuditTrail(nextState, entry);
}

export function setAppState(nextState: AppState, auditInput?: AuditTrailInput | null): void {
  const previousState = getAppState();
  const stateWithTimestamp = applyAuditTrail(
    previousState,
    { ...nextState, ui: { ...nextState.ui, lastVisitedAt: new Date().toISOString() } },
    auditInput,
  );
  cachedState = stateWithTimestamp;
  syncCachedState = stateWithTimestamp;
  syncPersist(stateWithTimestamp);

  persist(stateWithTimestamp).catch(() => {});

  emit();
}

export async function setAppStateAsync(
  nextState: AppState,
  auditInput?: AuditTrailInput | null,
): Promise<void> {
  const previousState = getAppState();
  const stateWithTimestamp = applyAuditTrail(
    previousState,
    { ...nextState, ui: { ...nextState.ui, lastVisitedAt: new Date().toISOString() } },
    auditInput,
  );
  cachedState = stateWithTimestamp;
  syncCachedState = stateWithTimestamp;
  syncPersist(stateWithTimestamp);
  await persist(stateWithTimestamp);
  emit();
}

export function updateAppState(updater: (state: AppState) => AppState): void {
  setAppState(updater(getAppState()));
}

export function resetAppState(): void {
  const seedState = appendAuditTrail(
    createSeedState(),
    buildBackupAuditTrailEntry('STATE_RESET', 'Retour aux données de démonstration.'),
  );
  cachedState = seedState;
  syncCachedState = seedState;
  syncPersist(seedState);
  persist(seedState).catch(() => {});
  emit();
}

export function importAppState(json: string): void {
  setAppState(
    migrateAppState(JSON.parse(json)),
    buildBackupAuditTrailEntry('BACKUP_IMPORTED', 'Import manuel de sauvegarde locale.'),
  );
}

export function exportAppState(): string {
  return JSON.stringify(getAppState(), null, 2);
}

export async function exportAppStateAsync(): Promise<string> {
  if (useTauriPlatform) {
    return await (await getPlatformAsync()).storage.exportState();
  }
  return exportAppState();
}

export async function importAppStateAsync(json: string): Promise<void> {
  if (useTauriPlatform) {
    const state = await (await getPlatformAsync()).storage.importState(json);
    await setAppStateAsync(
      state,
      buildBackupAuditTrailEntry('BACKUP_IMPORTED', 'Import de sauvegarde via Tauri.'),
    );
  } else {
    await setAppStateAsync(
      migrateAppState(JSON.parse(json)),
      buildBackupAuditTrailEntry('BACKUP_IMPORTED', 'Import manuel de sauvegarde locale.'),
    );
  }
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

export function useStorageBootstrapState(): StorageBootstrapSnapshot {
  return useSyncExternalStore(
    (listener) => {
      bootstrapListeners.add(listener);
      return () => bootstrapListeners.delete(listener);
    },
    () => bootstrapSnapshot,
    () => READY_BOOTSTRAP_SNAPSHOT,
  );
}

export function retryStorageBootstrap(): void {
  cachedState = null;
  syncCachedState = null;
  initStorage().catch((error) => {
    setBootstrapSnapshot({ status: 'error', errorMessage: formatBootstrapError(error) });
  });
}

export async function startWithEmptyState(): Promise<void> {
  const seedState = createSeedState();
  cachedState = seedState;
  syncCachedState = seedState;
  await persist(seedState);
  emit();
  setBootstrapSnapshot({ status: 'ready' });
}
