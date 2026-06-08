import type { AppState, Invoice, Mission, Pharmacien, Pharmacie, AppOptions, FiscalSettings, UiSettings, LocalDataSettings } from './schema';

export function activePharmacien(state: AppState): Pharmacien | undefined {
  return state.pharmaciens.find((pharmacien) => pharmacien.id === state.activePharmacienId);
}

export function findPharmacien(state: AppState, id?: string): Pharmacien | undefined {
  return state.pharmaciens.find((pharmacien) => pharmacien.id === id);
}

export function findPharmacie(state: AppState, id?: string): Pharmacie | undefined {
  return state.pharmacies.find((pharmacie) => pharmacie.id === id);
}

export function findMission(state: AppState, id?: string): Mission | undefined {
  return state.missions.find((mission) => mission.id === id);
}

export function findInvoice(state: AppState, id?: string): Invoice | undefined {
  return state.invoices.find((invoice) => invoice.id === id);
}

export function missionInvoice(state: AppState, mission: Mission): Invoice | undefined {
  return state.invoices.find((invoice) => invoice.id === mission.invoiceId || invoice.missionId === mission.id);
}

// Sélecteurs pour les nouvelles options structurées

export function selectAppOptions(state: AppState): AppOptions {
  return state.appOptions;
}

export function selectMissionOptions(state: AppState): AppOptions['missionDefaults'] {
  return state.appOptions.missionDefaults;
}

export function selectInvoiceOptions(state: AppState): AppOptions['invoiceDefaults'] {
  return state.appOptions.invoiceDefaults;
}

export function selectPdfCalendarOptions(state: AppState): AppOptions['pdfCalendar'] {
  return state.appOptions.pdfCalendar;
}

export function selectFinancialOptions(state: AppState): FiscalSettings {
  return state.fiscalSettings;
}

export function selectUiOptions(state: AppState): UiSettings {
  return state.uiSettings;
}

export function selectLocalDataOptions(state: AppState): LocalDataSettings {
  return state.localDataSettings;
}

// Résolveurs métier pour les valeurs par défaut

export function resolveMissionDefaults(state: AppState, pharmacienId?: string, pharmacieId?: string): {
  defaultMissionType: string;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultBreakMinutes: number;
  mealAutoEnabled: boolean;
  mealThresholdHours: number;
  mealDefaultCents: number;
  mileageRateCents: number;
} {
  const pharmacien = pharmacienId ? state.pharmaciens.find(p => p.id === pharmacienId) : undefined;
  const pharmacie = pharmacieId ? state.pharmacies.find(p => p.id === pharmacieId) : undefined;
  const appOptions = state.appOptions;

  return {
    defaultMissionType: pharmacien?.defaultMissionType ?? pharmacie?.defaultMissionType ?? appOptions.missionDefaults.defaultMissionType,
    defaultStartTime: pharmacien?.defaultStartTime ?? appOptions.missionDefaults.defaultStartTime,
    defaultEndTime: pharmacien?.defaultEndTime ?? appOptions.missionDefaults.defaultEndTime,
    defaultBreakMinutes: pharmacie?.defaultBreakMinutes ?? pharmacien?.defaultBreakMinutes ?? appOptions.missionDefaults.defaultBreakMinutes,
    mealAutoEnabled: pharmacien?.mealAutoEnabled ?? appOptions.missionDefaults.mealAutoEnabled,
    mealThresholdHours: pharmacien?.mealThresholdHours ?? appOptions.missionDefaults.mealThresholdHours,
    mealDefaultCents: pharmacien?.mealDefaultCents ?? appOptions.missionDefaults.mealDefaultCents,
    mileageRateCents: pharmacien?.mileageRateCents ?? appOptions.missionDefaults.mileageRateCents,
  };
}

export function resolveInvoiceDefaults(state: AppState, pharmacienId?: string): {
  invoiceDueDays: number;
  paymentTerms?: string;
} {
  const pharmacien = pharmacienId ? state.pharmaciens.find(p => p.id === pharmacienId) : undefined;
  const appOptions = state.appOptions;

  return {
    invoiceDueDays: pharmacien?.invoiceDueDays ?? appOptions.invoiceDefaults.invoiceDueDays,
    paymentTerms: pharmacien?.paymentTerms ?? appOptions.invoiceDefaults.paymentTerms,
  };
}

export function resolveTaxSettingsForInvoice(state: AppState, pharmacienId?: string): {
  taxStatus: TaxStatus;
  gstNumber?: string;
  qstNumber?: string;
} {
  const pharmacien = pharmacienId ? state.pharmaciens.find(p => p.id === pharmacienId) : undefined;
  const fiscalSettings = state.fiscalSettings;

  return {
    taxStatus: pharmacien?.taxStatus ?? fiscalSettings.defaultTaxStatus,
    gstNumber: pharmacien?.gstNumber,
    qstNumber: pharmacien?.qstNumber,
  };
}
