import type { AppOptions, AppState, DeductibleExpense, FiscalSettings, Invoice, Mission, MissionDay, MissionEvent, Pharmacien, Pharmacie, TaxPayment, UiSettings, LocalDataSettings } from './schema';
import { addDaysIso, createId, todayIso } from '../services/ids';
import { calculateMission } from '../services/missionCalculator';
import { createDefaultUiSettings } from './settings/uiSettings';
import { createDefaultLocalDataSettings } from './settings/localDataSettings';

const today = todayIso();
const yesterday = addDaysIso(today, -1);
const nextWeek = addDaysIso(today, 7);

const pharmaciens: Pharmacien[] = [
  {
    id: 'ph_amelie',
    nom: 'Amélie Tremblay',
    adresse: '1240 rue Saint-Denis',
    ville: 'Montréal',
    codePostal: 'H2X 3J6',
    telephone: '514-555-0128',
    email: 'amelie.tremblay@example.com',
    hourlyRateCents: 8250,
    distanceKmDomicile: 18,
    defaultMissionType: 'REMPLACEMENT_OFFICINE',
    defaultStartTime: '08:00',
    defaultEndTime: '17:00',
    defaultBreakMinutes: 60,
    mealAutoEnabled: true,
    mealThresholdHours: 8,
    mealDefaultCents: 2000,
    mileageRateCents: 61,
    taxStatus: 'SMALL_SUPPLIER',
    favoritePharmacieId: 'pha_verte',
    invoiceDueDays: 30,
    paymentTerms: 'Paiement par virement dans les 30 jours.',
    isDefaultProfile: true,
  },
  {
    id: 'ph_louis',
    nom: 'Louis Gagnon',
    adresse: '88 avenue Laurier',
    ville: 'Québec',
    codePostal: 'G1R 2K4',
    telephone: '418-555-0190',
    email: 'louis.gagnon@example.com',
    hourlyRateCents: 7800,
    distanceKmDomicile: 22,
    defaultMissionType: 'REMPLACEMENT_OFFICINE',
    defaultStartTime: '08:30',
    defaultEndTime: '16:30',
    defaultBreakMinutes: 45,
    mealAutoEnabled: true,
    mealThresholdHours: 8,
    mealDefaultCents: 2000,
    mileageRateCents: 61,
    taxStatus: 'REGISTERED',
    gstNumber: '123456789RT0001',
    qstNumber: '1234567890TQ0001',
    favoritePharmacieId: 'pha_centrale',
    invoiceDueDays: 30,
    paymentTerms: 'Paiement par virement dans les 30 jours.',
  },
];

const pharmacies: Pharmacie[] = [
  {
    id: 'pha_verte',
    nom: 'Pharmacie Verte',
    adresse: '402 boulevard René-Lévesque',
    ville: 'Montréal',
    codePostal: 'H2Z 1A7',
    telephone: '514-555-0144',
    email: 'direction@pharmacieverte.example',
    defaultBreakMinutes: 60,
    notes: 'Stationnement derrière la succursale.',
  },
  {
    id: 'pha_centrale',
    nom: 'Pharmacie Centrale',
    adresse: '210 rue Cartier',
    ville: 'Québec',
    codePostal: 'G1R 1S8',
    telephone: '418-555-0187',
    email: 'admin@pharmaciecentrale.example',
    defaultBreakMinutes: 45,
  },
];

function missionEvent(label: string, eventType: MissionEvent['eventType']): MissionEvent {
  return {
    id: createId('evt'),
    label,
    eventType,
    eventDate: new Date().toISOString(),
  };
}

function missionDay(id: string, dateService: string, startTime: string, endTime: string, breakMinutes: number): MissionDay {
  return {
    id,
    dateService,
    startTime,
    endTime,
    unpaidBreakMinutes: breakMinutes,
    description: 'Remplacement en officine',
    hours: 0,
  };
}

function buildMission(seed: {
  id: string;
  code: string;
  pharmacienId: string;
  pharmacieId: string;
  status: Mission['status'];
  days: MissionDay[];
  hourlyRateCents: number;
  mealFeeCents: number;
  mileageKm: number;
  mileageRateCents: number;
  notes?: string;
}): Mission {
  const calculation = calculateMission(seed);
  const days = seed.days.map((day, index) => ({ ...day, hours: calculation.dayHours[index] ?? 0 }));
  return {
    id: seed.id,
    missionCode: seed.code,
    pharmacienId: seed.pharmacienId,
    pharmacieId: seed.pharmacieId,
    status: seed.status,
    dateDebut: days[0]?.dateService ?? today,
    dateFin: days[days.length - 1]?.dateService ?? today,
    days,
    hourlyRateCents: seed.hourlyRateCents,
    mealFeeCents: seed.mealFeeCents,
    mileageKm: seed.mileageKm,
    mileageRateCents: seed.mileageRateCents,
    totalHours: calculation.totalHours,
    subtotalCents: calculation.subtotalCents,
    mealTotalCents: calculation.mealTotalCents,
    mileageTotalCents: calculation.mileageTotalCents,
    totalCents: calculation.totalCents,
    notes: seed.notes,
    events: [missionEvent('Mission créée', 'CREATED'), missionEvent(`Statut: ${seed.status}`, 'STATUS_CHANGED')],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const completedMission = buildMission({
  id: 'mis_completee',
  code: 'MIS-2026-0001',
  pharmacienId: 'ph_amelie',
  pharmacieId: 'pha_verte',
  status: 'COMPLETED',
  days: [missionDay('day_1', yesterday, '09:00', '17:30', 60)],
  hourlyRateCents: 8250,
  mealFeeCents: 2200,
  mileageKm: 36,
  mileageRateCents: 61,
  notes: 'Mission validée avec frais de déplacement.',
});

const invoice: Invoice = {
  id: 'inv_seed_1',
  numero: 'FAC-2026-0001',
  missionId: completedMission.id,
  pharmacienId: completedMission.pharmacienId,
  pharmacieId: completedMission.pharmacieId,
  dateFacture: yesterday,
  dateEcheance: addDaysIso(yesterday, 30),
  status: 'SENT',
  hours: completedMission.totalHours,
  amountCents: completedMission.totalCents,
  sentAt: today,
  createdAt: new Date().toISOString(),
};

completedMission.invoiceId = invoice.id;
completedMission.events.push(missionEvent('Facture générée', 'INVOICE_CREATED'));

const missions: Mission[] = [
  completedMission,
  buildMission({
    id: 'mis_a_venir',
    code: 'MIS-2026-0002',
    pharmacienId: 'ph_louis',
    pharmacieId: 'pha_centrale',
    status: 'CONFIRMED',
    days: [missionDay('day_2', nextWeek, '08:30', '16:30', 45)],
    hourlyRateCents: 7800,
    mealFeeCents: 1800,
    mileageKm: 44,
    mileageRateCents: 61,
  }),
];

const taxPayments: TaxPayment[] = [
  {
    id: 'tax_seed_1',
    date: addDaysIso(today, -20),
    period: 'T1 2026',
    authority: 'REVENU_QUEBEC',
    type: 'INCOME_TAX_INSTALMENT',
    amountCents: 65000,
    reference: 'AC-2026-T1',
    notes: 'Acompte provisionnel T1',
  },
];

const deductibleExpenses: DeductibleExpense[] = [
  {
    id: 'exp_seed_1',
    date: addDaysIso(today, -12),
    label: 'Abonnement logiciel de facturation',
    category: 'SOFTWARE',
    amountCents: 2900,
    taxDeductible: true,
    hasReceipt: true,
  },
  {
    id: 'exp_seed_2',
    date: addDaysIso(today, -8),
    label: 'Stationnement mission',
    category: 'PARKING',
    amountCents: 1800,
    taxDeductible: true,
    hasReceipt: false,
  },
];

export function createDefaultFiscalSettings(year = new Date().getFullYear()): FiscalSettings {
  return {
    reserveRate: 0.3,
    fiscalYearStartMonth: 1,
    currentFiscalYear: year,
    smallSupplierThresholdCents: 3_000_000,
    smallSupplierWarningRate: 0.8,
    instalmentDates: ['03-15', '06-15', '09-15', '12-15'],
    quebecNetTaxOwingThresholdCents: 180_000,
    federalNetTaxOwingThresholdCents: 300_000,
    federalDefaultNetTaxOwingThresholdCents: 300_000,
    mileageRateCents: 61,
    currentYear: year,
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
  };
}

export function createDefaultAppOptions(): AppOptions {
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

export function createSeedState(): AppState {
  return {
    version: 2,
    activePharmacienId: 'ph_amelie',
    pharmaciens,
    pharmacies,
    missions,
    invoices: [invoice],
    taxPayments,
    deductibleExpenses,
    expenseReceipts: [],
    fiscalSettings: createDefaultFiscalSettings(2026),
    distanceReferences: [],
    appOptions: createDefaultAppOptions(),
    uiSettings: createDefaultUiSettings(),
    localDataSettings: createDefaultLocalDataSettings(),
    ui: {
      missionFilters: {},
      lastVisitedAt: new Date().toISOString(),
    },
  };
}
