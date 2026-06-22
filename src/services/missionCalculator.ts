import type { Mission, MissionDay, MissionExpense } from '../storage/schema';
import { addressOf, estimateDistanceKm } from './distanceCalculator';
import { createId, addDaysIso, todayIso } from './ids';
import { normalizeMissionExpense, createMissionExpenseDraft } from './expenseTypes';
import { getActTypeDefinition, getMissionInvoiceLabel } from './actTypes';

export { addressOf, estimateDistanceKm } from './distanceCalculator';

export type MissionCalculationInput = {
  days: Array<Pick<MissionDay, 'startTime' | 'endTime' | 'unpaidBreakMinutes'>>;
  hourlyRateCents: number;
  mealFeeCents: number;
  mileageKm: number;
  mileageRateCents: number;
};

export type MissionCalculation = {
  dayHours: number[];
  totalHours: number;
  subtotalCents: number;
  mealTotalCents: number;
  mileageTotalCents: number;
  totalCents: number;
};

// ============================================================================
// Fonctions de base (existantes)
// ============================================================================

function minutesFromTime(value: string): number | null {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function calculateDayHours(startTime: string, endTime: string, unpaidBreakMinutes: number): number {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  if (start === null || end === null || end <= start) return 0;
  const workedMinutes = Math.max(end - start - Math.max(unpaidBreakMinutes || 0, 0), 0);
  return Math.round((workedMinutes / 60) * 100) / 100;
}

export function calculateMission(input: MissionCalculationInput): MissionCalculation {
  const dayHours = input.days.map((day) => calculateDayHours(day.startTime, day.endTime, day.unpaidBreakMinutes));
  const totalHours = Math.round(dayHours.reduce((sum, hours) => sum + hours, 0) * 100) / 100;
  const subtotalCents = Math.round(totalHours * input.hourlyRateCents);
  const mealTotalCents = Math.max(input.mealFeeCents, 0) * input.days.length;
  const mileageTotalCents = Math.round(Math.max(input.mileageKm, 0) * Math.max(input.mileageRateCents, 0));
  return {
    dayHours,
    totalHours,
    subtotalCents,
    mealTotalCents,
    mileageTotalCents,
    totalCents: subtotalCents + mealTotalCents + mileageTotalCents,
  };
}

// ============================================================================
// Types pour le formulaire
// ============================================================================

export type MissionDayFormValue = {
  id: string;
  dateService: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes: number;
  paidHours: number;
  expenses: MissionExpense[];
  notes?: string;
};

export type MissionFormValues = {
  pharmacienId: string;
  pharmacieId: string;
  actType: string;
  dateDebut: string;
  dateFin: string;
  isMultiDay: boolean;
  excludedDates: string[];
  defaultStartTime: string;
  defaultEndTime: string;
  defaultUnpaidBreakMinutes: number;
  tauxHoraire: number;
  distanceReferenceKm: number;
  kmUnitRate: number;
  days: MissionDayFormValue[];
  notes: string;
};

// ============================================================================
// Fonctions utilitaires monétaires
// ============================================================================

export function moneyToCents(value: number): number {
  return Math.round((Number(value) || 0) * 100);
}

export function centsToMoney(cents: number): number {
  return Math.round(cents) / 100;
}

export function parseMoney(value: string): number {
  return Number(value.replace(',', '.')) || 0;
}

// ============================================================================
// Fonctions utilitaires de dates
// ============================================================================

export function dayName(dateIso: string): string {
  return new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: '2-digit', month: 'short' }).format(
    new Date(`${dateIso}T00:00:00`)
  );
}

export function daysBetween(startIso: string, endIso: string): string[] {
  const days: string[] = [];
  let current = startIso;
  while (current <= endIso && days.length < 60) {
    days.push(current);
    current = addDaysIso(current, 1);
  }
  return days;
}

// ============================================================================
// Fonctions utilitaires d'adresses et distance
// ============================================================================

// addressOf et estimateDistanceKm sont importées depuis distanceCalculator.ts

// ============================================================================
// Fonctions de création d'expenses et de jours
// ============================================================================

export type ExpenseType = 'REPAS' | 'KM' | 'AUTRE';

const fallbackMealRule = { mealAutoEnabled: true, mealThresholdHours: 8, mealDefaultAmount: 20 };

export function createExpense(type: ExpenseType, overrides: Partial<MissionExpense> = {}): MissionExpense {
  const typeKey = type === 'REPAS' ? 'MEAL' : type === 'KM' ? 'MILEAGE' : 'OTHER_NON_DEDUCTIBLE';
  return createMissionExpenseDraft({ id: createId('fee'), typeKey, amountCents: 0, overrides });
}

export function createDay(
  dateService: string,
  values: Pick<MissionFormValues, 'defaultStartTime' | 'defaultEndTime' | 'defaultUnpaidBreakMinutes'>,
  expenses: MissionExpense[] = [],
  mealRule = fallbackMealRule
): MissionDayFormValue {
  const paidHours = calculateDayHours(values.defaultStartTime, values.defaultEndTime, values.defaultUnpaidBreakMinutes);
  const autoMeal =
    mealRule.mealAutoEnabled && paidHours > mealRule.mealThresholdHours
      ? [createExpense('REPAS', { amount: mealRule.mealDefaultAmount })]
      : [];
  return {
    id: createId('day'),
    dateService,
    startTime: values.defaultStartTime,
    endTime: values.defaultEndTime,
    unpaidBreakMinutes: values.defaultUnpaidBreakMinutes,
    paidHours,
    expenses: expenses.length ? expenses : autoMeal,
  };
}

// ============================================================================
// Conversion Mission <-> Form
// ============================================================================

export function missionToForm(mission: Mission): MissionFormValues {
  return {
    pharmacienId: mission.pharmacienId,
    pharmacieId: mission.pharmacieId,
    actType: mission.actType ?? 'REMPLACEMENT_OFFICINE',
    dateDebut: mission.dateDebut,
    dateFin: mission.dateFin,
    isMultiDay: mission.dateDebut !== mission.dateFin,
    excludedDates: [...(mission.excludedDates ?? [])],
    defaultStartTime: mission.days[0]?.startTime ?? '08:00',
    defaultEndTime: mission.days[0]?.endTime ?? '17:00',
    defaultUnpaidBreakMinutes: mission.days[0]?.unpaidBreakMinutes ?? 60,
    tauxHoraire: centsToMoney(mission.hourlyRateCents),
    distanceReferenceKm: mission.mileageKm,
    kmUnitRate: centsToMoney(mission.mileageRateCents || 61),
    days: mission.days.map((day) => ({
      ...day,
      paidHours: day.hours,
      expenses: (day.expenses ?? []).map((expense) => normalizeMissionExpense(expense, mission.id, day.id)),
    })),
    notes: mission.notes ?? '',
  };
}

export function buildMissionFromForm(values: MissionFormValues, existing?: Mission): Mission {
  const now = new Date().toISOString();
  const missionId = existing?.id ?? createId('mis');
  const days: MissionDay[] = values.days.map((day) => ({
    id: day.id,
    dateService: day.dateService,
    startTime: day.startTime,
    endTime: day.endTime,
    unpaidBreakMinutes: day.unpaidBreakMinutes,
    description: 'Remplacement en officine',
    hours: day.paidHours,
    expenses: day.expenses.map((expense) => normalizeMissionExpense(expense, missionId, day.id)),
  }));
  const totalHours = Math.round(values.days.reduce((sum, day) => sum + day.paidHours, 0) * 100) / 100;
  const subtotalCents = Math.round(totalHours * moneyToCents(values.tauxHoraire));
  const expenseTotalCents = values.days.reduce(
    (sum, day) => sum + day.expenses.reduce((feeSum, fee) => feeSum + fee.amountCents, 0),
    0
  );
  const actType = values.actType || 'REMPLACEMENT_OFFICINE';
  const actTypeDefinition = getActTypeDefinition(actType);
  return {
    id: missionId,
    missionCode: existing?.missionCode ?? `MIS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    pharmacienId: values.pharmacienId,
    pharmacieId: values.pharmacieId,
    status: existing?.status ?? 'DRAFT',
    actType,
    invoiceLabel: existing?.invoiceLabel ?? getMissionInvoiceLabel({ actType, invoiceLabel: undefined }),
    suggestedTaxClassification: existing?.suggestedTaxClassification ?? actTypeDefinition.suggestedTaxClassification,
    taxClassificationOverride: existing?.taxClassificationOverride,
    dateDebut: values.days[0]?.dateService ?? values.dateDebut,
    dateFin: values.days[values.days.length - 1]?.dateService ?? values.dateFin,
    days,
    hourlyRateCents: moneyToCents(values.tauxHoraire),
    mealFeeCents: 0,
    mileageKm: values.distanceReferenceKm,
    mileageRateCents: moneyToCents(values.kmUnitRate),
    totalHours,
    subtotalCents,
    mealTotalCents: values.days
      .flatMap((day) => day.expenses)
      .filter((fee) => fee.typeKey === 'MEAL')
      .reduce((sum, fee) => sum + fee.amountCents, 0),
    mileageTotalCents: values.days
      .flatMap((day) => day.expenses)
      .filter((fee) => fee.typeKey === 'MILEAGE')
      .reduce((sum, fee) => sum + fee.amountCents, 0),
    totalCents: subtotalCents + expenseTotalCents,
    excludedDates: values.excludedDates.length ? [...values.excludedDates] : undefined,
    notes: values.notes,
    invoiceId: existing?.invoiceId,
    events: [
      ...(existing?.events ?? []),
      {
        id: createId('evt'),
        eventType: existing ? 'UPDATED' : 'CREATED',
        label: existing ? 'Mission modifiée depuis le formulaire' : 'Mission créée',
        eventDate: now,
      },
    ],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

// ============================================================================
// Fonctions utilitaires pour le formulaire
// ============================================================================

export function recalcDay(day: MissionDayFormValue): MissionDayFormValue {
  return { ...day, paidHours: calculateDayHours(day.startTime, day.endTime, day.unpaidBreakMinutes) };
}

export function regenerateDays(
  source: MissionFormValues,
  defaults: {
    mealDefaults: { enabled: boolean; thresholdHours: number; amountCents: number };
  }
): MissionFormValues {
  const end = source.isMultiDay ? source.dateFin : source.dateDebut;
  const excludedDates = new Set(source.excludedDates ?? []);
  const nextDays = daysBetween(source.dateDebut, end || source.dateDebut).map((date) => {
    if (excludedDates.has(date)) return null;
    const existingDay = source.days.find((day) => day.dateService === date);
    return existingDay
      ? recalcDay({ ...existingDay, startTime: source.defaultStartTime, endTime: source.defaultEndTime, unpaidBreakMinutes: source.defaultUnpaidBreakMinutes })
      : createDay(date, source, [], {
          mealAutoEnabled: defaults.mealDefaults.enabled,
          mealThresholdHours: defaults.mealDefaults.thresholdHours,
          mealDefaultAmount: centsToMoney(defaults.mealDefaults.amountCents),
        });
  }).filter((day): day is MissionDayFormValue => Boolean(day));
  return { ...source, dateFin: end || source.dateDebut, days: nextDays };
}
