import { useState, useEffect, useMemo, useCallback } from 'react';
import { createId, addDaysIso, todayIso } from '../services/ids';
import { calculateDayHours } from '../services/missionCalculator';
import { calculateLocalDistance } from './useDistanceCalculator';
import { buildMissionDefaults } from './useMissionDefaults';
import { resolveMissionDefaults } from '../storage/selectors';
import { useAppState } from '../storage/localStore';
import type { AppState, Mission, MissionDay, MissionExpense, ExpenseReceipt } from '../storage/schema';
import { findPharmacien, findPharmacie } from '../storage/selectors';
import { createMissionExpenseDraft, normalizeMissionExpense, expenseTypeConfig } from '../services/expenseTypes';
import { createLocalReceipt, validateReceiptFile } from '../services/expenseReceipts';
import { formatMoney } from '../services/money';

export type ExpenseType = 'REPAS' | 'KM' | 'AUTRE';
export type MissionExpenseFormValue = MissionExpense;
export type MissionDayFormValue = {
  id: string;
  dateService: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes: number;
  paidHours: number;
  expenses: MissionExpenseFormValue[];
  notes?: string;
};
export type WorkflowAction = 'save_draft' | 'confirm' | 'confirm_generate' | string;
export type MissionFormValues = {
  pharmacienId: string;
  pharmacieId: string;
  actType: string;
  dateDebut: string;
  dateFin: string;
  isMultiDay: boolean;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultUnpaidBreakMinutes: number;
  tauxHoraire: number;
  distanceReferenceKm: number;
  kmUnitRate: number;
  days: MissionDayFormValue[];
  notes: string;
};

// Utilitaires monétaires
export function moneyToCents(value: number): number {
  return Math.round((Number(value) || 0) * 100);
}

export function centsToMoney(cents: number): number {
  return Math.round(cents) / 100;
}

export function parseMoney(value: string): number {
  return Number(value.replace(',', '.')) || 0;
}

// Utilitaires de dates
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

// Utilitaires d'adresses
export function addressOf(entity?: { adresse?: string; ville?: string; codePostal?: string }): string {
  return [entity?.adresse, entity?.ville, entity?.codePostal].filter(Boolean).join(', ');
}

export function estimateDistanceKm(
  home?: { adresse?: string; ville?: string; codePostal?: string; lat?: number; lng?: number },
  work?: { adresse?: string; ville?: string; codePostal?: string; lat?: number; lng?: number }
): number {
  return calculateLocalDistance({
    homeAddress: addressOf(home),
    workAddress: addressOf(work),
    homeLat: home?.lat,
    homeLng: home?.lng,
    workLat: work?.lat,
    workLng: work?.lng,
  }).distanceKm;
}

// Création d'expenses et de jours
export function createExpense(
  type: ExpenseType,
  overrides: Partial<MissionExpenseFormValue> = {}
): MissionExpenseFormValue {
  const typeKey = type === 'REPAS' ? 'MEAL' : type === 'KM' ? 'MILEAGE' : 'OTHER_NON_DEDUCTIBLE';
  return createMissionExpenseDraft({ id: createId('fee'), typeKey, amountCents: 0, overrides });
}

const fallbackMealRule = { mealAutoEnabled: true, mealThresholdHours: 8, mealDefaultAmount: 20 };

export function createDay(
  dateService: string,
  values: Pick<MissionFormValues, 'defaultStartTime' | 'defaultEndTime' | 'defaultUnpaidBreakMinutes'>,
  expenses: MissionExpenseFormValue[] = [],
  mealRule = fallbackMealRule
): MissionDayFormValue {
  const paidHours = calculateDayHours(
    values.defaultStartTime,
    values.defaultEndTime,
    values.defaultUnpaidBreakMinutes
  );
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

// Conversion Mission <-> Form
export function missionToForm(mission: Mission): MissionFormValues {
  return {
    pharmacienId: mission.pharmacienId,
    pharmacieId: mission.pharmacieId,
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: mission.dateDebut,
    dateFin: mission.dateFin,
    isMultiDay: mission.dateDebut !== mission.dateFin,
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
  return {
    id: missionId,
    missionCode: existing?.missionCode ?? `MIS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    pharmacienId: values.pharmacienId,
    pharmacieId: values.pharmacieId,
    status: existing?.status ?? 'DRAFT',
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

// Hook principal
export function useMissionForm(
  mode: 'create' | 'edit',
  missionId?: string | null
) {
  const state = useAppState();
  const activePharmacienId = state.activePharmacienId ?? undefined;
  const existing = mode === 'edit' && missionId ? useMemo(() => state.missions.find(m => m.id === missionId), [state.missions, missionId]) : undefined;
  const defaults = buildMissionDefaults(state, activePharmacienId);
  const currentPharmacien = findPharmacien(state, activePharmacienId) ?? defaults.pharmacien ?? state.pharmaciens[0];
  const defaultPharmacie = defaults.defaultPharmacie?.id ?? currentPharmacien?.favoritePharmacieId ?? state.pharmacies[0]?.id ?? '';
  
  const missionDefaults = resolveMissionDefaults(state, state.activePharmacienId ?? undefined, defaultPharmacie);

  // Initialisation du state
  const [values, setValues] = useState<MissionFormValues>(() =>
    existing ? missionToForm(existing) : {
      pharmacienId: currentPharmacien?.id ?? '',
      pharmacieId: defaultPharmacie,
      actType: defaults.defaultMissionType,
      dateDebut: todayIso(),
      dateFin: todayIso(),
      isMultiDay: false,
      defaultStartTime: defaults.scheduleDefaults.startTime,
      defaultEndTime: defaults.scheduleDefaults.endTime,
      defaultUnpaidBreakMinutes: defaults.scheduleDefaults.breakMinutes,
      tauxHoraire: centsToMoney(currentPharmacien?.hourlyRateCents ?? 8500),
      distanceReferenceKm: defaults.mileageDefaults.distanceKm,
      kmUnitRate: centsToMoney(defaults.mileageDefaults.rateCents),
      days: [],
      notes: '',
    }
  );

  // Références pour éviter les dépendances circulaires
  const pharmacien = findPharmacien(state, values.pharmacienId);
  const pharmacie = findPharmacie(state, values.pharmacieId);

  // Effet pour régénérer les jours au montage
  useEffect(() => {
    setValues((current) => regenerateDays(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effet pour calculer la distance automatiquement
  useEffect(() => {
    const km = estimateDistanceKm(pharmacien, pharmacie);
    if (km > 0 && values.distanceReferenceKm === 0) {
      setField('distanceReferenceKm', km);
    }
  }, [values.pharmacienId, values.pharmacieId, pharmacien, pharmacie, values.distanceReferenceKm]);

  // Gestion des justificatifs en attente
  const [pendingReceipts, setPendingReceipts] = useState<ExpenseReceipt[]>([]);

  // Fonctions utilitaires
  const setField = useCallback(<K extends keyof MissionFormValues>(field: K, value: MissionFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const regenerateDays = useCallback((source: MissionFormValues = values) => {
    const end = source.isMultiDay ? source.dateFin : source.dateDebut;
    const nextDays = daysBetween(source.dateDebut, end || source.dateDebut).map((date) => {
      const existingDay = source.days.find((day) => day.dateService === date);
      return existingDay
        ? recalcDay({ ...existingDay, startTime: source.defaultStartTime, endTime: source.defaultEndTime, unpaidBreakMinutes: source.defaultUnpaidBreakMinutes })
        : createDay(date, source, [], {
            mealAutoEnabled: defaults.mealDefaults.enabled,
            mealThresholdHours: defaults.mealDefaults.thresholdHours,
            mealDefaultAmount: centsToMoney(defaults.mealDefaults.amountCents),
          });
    });
    return { ...source, dateFin: end || source.dateDebut, days: nextDays };
  }, [values, defaults]);

  const recalcDay = useCallback((day: MissionDayFormValue): MissionDayFormValue => ({
    ...day,
    paidHours: calculateDayHours(day.startTime, day.endTime, day.unpaidBreakMinutes),
  }), []);

  const updateDay = useCallback((dayId: string, patch: Partial<MissionDayFormValue>) => {
    setValues((current) => ({
      ...current,
      days: current.days.map((day) => (day.id === dayId ? recalcDay({ ...day, ...patch }) : day)),
    }));
  }, [recalcDay]);

  const addExpense = useCallback((dayId: string, type: ExpenseType) => {
    setValues((current) => {
      const distanceKm =
        current.distanceReferenceKm ||
        estimateDistanceKm(
          findPharmacien(state, current.pharmacienId),
          findPharmacie(state, current.pharmacieId)
        );
      return {
        ...current,
        distanceReferenceKm: type === 'KM' && distanceKm > 0 ? distanceKm : current.distanceReferenceKm,
        days: current.days.map((day) =>
          day.id === dayId
            ? {
                ...day,
                expenses: [
                  ...day.expenses,
                  type === 'KM'
                    ? createExpense('KM', {
                        distanceKm,
                        unitRateCents: moneyToCents(current.kmUnitRate),
                        unitRate: current.kmUnitRate,
                        quantity: distanceKm,
                        amountCents: Math.round(distanceKm * moneyToCents(current.kmUnitRate)),
                        amount: Math.round(distanceKm * current.kmUnitRate * 100) / 100,
                      })
                    : createExpense(type, {
                        amountCents: type === 'REPAS' ? defaults.mealDefaults.amountCents : 0,
                        amount: type === 'REPAS' ? centsToMoney(defaults.mealDefaults.amountCents) : 0,
                      }),
                ],
              }
            : day
        ),
      };
    });
  }, [state, defaults, estimateDistanceKm]);

  const addTypedExpense = useCallback((dayId: string, typeKey: string) => {
    setValues((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              expenses: [
                ...day.expenses,
                createMissionExpenseDraft({ id: createId('fee'), typeKey, missionDayId: dayId }),
              ],
            }
          : day
      ),
    }));
  }, []);

  const removeExpense = useCallback((dayId: string, feeId: string) => {
    setValues((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId ? { ...day, expenses: day.expenses.filter((fee) => fee.id !== feeId) } : day
      ),
    }));
  }, []);

  const updateExpense = useCallback((dayId: string, expense: MissionExpenseFormValue) => {
    setValues((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId ? { ...day, expenses: day.expenses.map((fee) => (fee.id === expense.id ? expense : fee)) } : day
      ),
    }));
  }, []);

  const addReceipt = useCallback((dayId: string, expenseId: string, file: File): string | null => {
    const error = validateReceiptFile(file);
    if (error) return error;
    const receipt = createLocalReceipt({ file, expenseId, missionId: existing?.id ?? 'draft', missionDayId: dayId });
    setPendingReceipts((current) => [...current, receipt]);
    setValues((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              expenses: day.expenses.map((fee) =>
                fee.id === expenseId
                  ? { ...fee, receiptIds: [...(fee.receiptIds ?? []), receipt.id] }
                  : fee
            ),
          }
          : day
      ),
    }));
    return null;
  }, [existing]);

  const deleteReceipt = useCallback((receiptId: string) => {
    setPendingReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
    setValues((current) => ({
      ...current,
      days: current.days.map((day) => ({
        ...day,
        expenses: day.expenses.map((fee) => ({
          ...fee,
          receiptIds: fee.receiptIds?.filter((id) => id !== receiptId),
        })),
      })),
    }));
  }, []);

  const recalcDistance = useCallback(() => {
    const km = estimateDistanceKm(pharmacien, pharmacie);
    setField('distanceReferenceKm', km);
  }, [pharmacien, pharmacie, setField]);

  const changePharmacien = useCallback((id: string) => {
    const next = findPharmacien(state, id);
    setValues((current) => ({
      ...current,
      pharmacienId: id,
      tauxHoraire: centsToMoney(next?.hourlyRateCents ?? moneyToCents(current.tauxHoraire)),
      pharmacieId: next?.favoritePharmacieId ?? current.pharmacieId,
    }));
  }, [state]);

  const changePharmacie = useCallback((id: string) => {
    const next = findPharmacie(state, id);
    setValues((current) =>
      regenerateDays({
        ...current,
        pharmacieId: id,
        defaultUnpaidBreakMinutes: next?.defaultBreakMinutes ?? current.defaultUnpaidBreakMinutes,
      })
    );
  }, [state, regenerateDays]);

  return {
    // State
    values,
    setValues,
    pendingReceipts,
    setPendingReceipts,
    
    // Références
    existing,
    defaults,
    currentPharmacien,
    defaultPharmacie,
    pharmacien,
    pharmacie,
    
    // Fonctions
    setField,
    regenerateDays,
    recalcDay,
    updateDay,
    addExpense,
    addTypedExpense,
    removeExpense,
    updateExpense,
    addReceipt,
    deleteReceipt,
    recalcDistance,
    changePharmacien,
    changePharmacie,
    
    // Utilitaires exportés
    moneyToCents,
    centsToMoney,
    parseMoney,
    formatMoney,
    dayName,
    daysBetween,
    addressOf,
    estimateDistanceKm,
    createExpense,
    createDay,
    missionToForm,
    buildMissionFromForm,
    expenseTypeConfig,
  };
}
