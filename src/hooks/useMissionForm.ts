import { useState, useEffect, useMemo, useCallback } from 'react';
import { createId, addDaysIso, todayIso } from '../services/ids';
import { 
  calculateDayHours,
  moneyToCents,
  centsToMoney,
  parseMoney,
  dayName,
  daysBetween,
  createExpense,
  createDay,
  missionToForm,
  buildMissionFromForm,
  recalcDay as recalcDayFn,
  regenerateDays as regenerateDaysFn,
  type MissionDayFormValue,
  type MissionFormValues,
  type MissionCalculationInput,
  type MissionCalculation,
} from '../services/missionCalculator';
import { addressOf } from '../services/distanceCalculator';
import {
  upsertDistanceReference,
} from '../services/distanceReferences';
import {
  canRouteDistance,
  createManualDistanceReference,
  resolveRouteDistance,
  type DistanceResolutionStatus,
} from '../services/distanceService';
import { buildMissionDefaults } from './useMissionDefaults';
import { updateAppState, useAppState } from '../storage/localStore';
import type { AppState, Mission, MissionDay, MissionExpense, ExpenseReceipt } from '../storage/schema';
import { findPharmacien, findPharmacie } from '../storage/selectors';
import { createMissionExpenseDraft, normalizeMissionExpense, expenseTypeConfig } from '../services/expenseTypes';
import { createLocalReceipt, validateReceiptFile } from '../services/expenseReceipts';
import { formatMoney } from '../services/money';
import { getPharmacyScheduleForDate } from '../services/pharmacyMetadata';

export type ExpenseType = 'REPAS' | 'KM' | 'AUTRE';
export type MissionExpenseFormValue = MissionExpense;
export type WorkflowAction = 'save_draft' | 'confirm' | 'confirm_generate' | string;

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
  
  // Initialisation du state
  const [values, setValues] = useState<MissionFormValues>(() =>
    existing ? missionToForm(existing) : {
      pharmacienId: currentPharmacien?.id ?? '',
      pharmacieId: defaultPharmacie,
      actType: defaults.defaultMissionType,
      dateDebut: todayIso(),
      dateFin: todayIso(),
      isMultiDay: false,
      excludedDates: [],
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
  const [distanceStatus, setDistanceStatus] = useState<DistanceResolutionStatus>('unknown');
  const [distanceSource, setDistanceSource] = useState<'route' | 'manual' | 'cached' | undefined>(undefined);
  const [distanceError, setDistanceError] = useState<string | undefined>(undefined);

  // Effet pour régénérer les jours au montage
  useEffect(() => {
    setValues((current) => regenerateDays(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effet pour résoudre une distance fiable: cache valide, routage, ou absence explicite.
  useEffect(() => {
    let cancelled = false;

    resolveRouteDistance({ pharmacien, pharmacie, state })
      .then((resolution) => {
        if (cancelled) return;

        setDistanceStatus(resolution.status);
        setDistanceSource(resolution.reference?.source);
        setDistanceError(resolution.errorReason);

        if (resolution.reference) {
          if (resolution.reference.source === 'route') {
            updateAppState((current) => upsertDistanceReference(current, resolution.reference!));
          }
          setValues((current) => ({ ...current, distanceReferenceKm: resolution.reference!.distanceKm }));
          return;
        }

        setValues((current) => ({ ...current, distanceReferenceKm: 0 }));
      })
      .catch((error) => {
        if (cancelled) return;
        setDistanceStatus('routing_failed');
        setDistanceSource(undefined);
        setDistanceError(error instanceof Error ? error.message : 'Calcul routier impossible');
        setValues((current) => ({ ...current, distanceReferenceKm: 0 }));
      });

    return () => {
      cancelled = true;
    };
  }, [state, values.pharmacienId, values.pharmacieId, pharmacien, pharmacie]);

  // Gestion des justificatifs en attente
  const [pendingReceipts, setPendingReceipts] = useState<ExpenseReceipt[]>([]);

  // Fonctions utilitaires
  const setField = useCallback(<K extends keyof MissionFormValues>(field: K, value: MissionFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const regenerateDays = useCallback((source: MissionFormValues = values) => {
    return regenerateDaysFn(source, { mealDefaults: defaults.mealDefaults });
  }, [values, defaults.mealDefaults]);

  const recalcDay = useCallback((day: MissionDayFormValue): MissionDayFormValue => {
    return recalcDayFn(day);
  }, []);

  const updateDay = useCallback((dayId: string, patch: Partial<MissionDayFormValue>) => {
    setValues((current) => ({
      ...current,
      days: current.days.map((day) => (day.id === dayId ? recalcDay({ ...day, ...patch }) : day)),
    }));
  }, [recalcDay]);

  const removeDay = useCallback((dayId: string) => {
    const removedDay = values.days.find((day) => day.id === dayId);
    setValues((current) => {
      if (current.days.length <= 1) return current;
      const removedCurrentDay = current.days.find((day) => day.id === dayId);
      if (!removedCurrentDay) return current;
      const remainingDays = current.days.filter((day) => day.id !== dayId);
      return {
        ...current,
        excludedDates: [...new Set([...(current.excludedDates ?? []), removedCurrentDay.dateService])],
        days: remainingDays,
        dateDebut: remainingDays[0]?.dateService ?? current.dateDebut,
        dateFin: remainingDays.at(-1)?.dateService ?? current.dateFin,
      };
    });
    if (removedDay) {
      setPendingReceipts((current) => current.filter((receipt) => receipt.missionDayId !== removedDay.id));
    }
  }, [values]);

  const addExpense = useCallback((dayId: string, type: ExpenseType) => {
    setValues((current) => {
      const distanceKm = current.distanceReferenceKm;
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
  }, [defaults]);

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
    if (!pharmacien || !pharmacie) {
      setDistanceStatus('unknown');
      setDistanceSource(undefined);
      setDistanceError(undefined);
      setField('distanceReferenceKm', 0);
      return;
    }

    if (!canRouteDistance(pharmacien, pharmacie)) {
      setDistanceStatus('missing_coordinates');
      setDistanceSource(undefined);
      setDistanceError('Coordonnées manquantes');
      setField('distanceReferenceKm', 0);
      return;
    }

    resolveRouteDistance({ pharmacien, pharmacie, state, preferRoute: true })
      .then((resolution) => {
        setDistanceStatus(resolution.status);
        setDistanceSource(resolution.reference?.source);
        setDistanceError(resolution.errorReason);

        if (resolution.reference) {
          updateAppState((current) => upsertDistanceReference(current, resolution.reference!));
          setField('distanceReferenceKm', resolution.reference.distanceKm);
          return;
        }
      })
      .catch((error) => {
        setDistanceStatus('routing_failed');
        setDistanceError(error instanceof Error ? error.message : 'Calcul routier impossible');
        setDistanceSource(undefined);
      });
  }, [pharmacien, pharmacie, state, setField]);

  const setManualDistance = useCallback((distanceKm: number) => {
    if (!pharmacien || !pharmacie) {
      setField('distanceReferenceKm', Math.max(0, distanceKm));
      setDistanceStatus('manual');
      setDistanceSource('manual');
      setDistanceError(undefined);
      return;
    }

    const reference = createManualDistanceReference({ pharmacien, pharmacie, distanceKm });
    updateAppState((current) => upsertDistanceReference(current, reference));
    setField('distanceReferenceKm', reference.distanceKm);
    setDistanceStatus('manual');
    setDistanceSource('manual');
    setDistanceError(undefined);
  }, [pharmacien, pharmacie, setField]);

  const changePharmacien = useCallback((id: string) => {
    const next = findPharmacien(state, id);
    setValues((current) => ({
      ...current,
      pharmacienId: id,
      tauxHoraire: centsToMoney(next?.hourlyRateCents ?? moneyToCents(current.tauxHoraire)),
      pharmacieId: next?.favoritePharmacieId ?? current.pharmacieId,
      distanceReferenceKm: 0,
    }));
  }, [state]);

  const changePharmacie = useCallback((id: string) => {
    const next = findPharmacie(state, id);
    const pharmacyDaySchedule = getPharmacyScheduleForDate(next?.weeklySchedule, values.dateDebut);
    setValues((current) =>
      regenerateDays({
        ...current,
        pharmacieId: id,
        distanceReferenceKm: 0,
        defaultStartTime: pharmacyDaySchedule?.enabled ? pharmacyDaySchedule.startTime ?? current.defaultStartTime : current.defaultStartTime,
        defaultEndTime: pharmacyDaySchedule?.enabled ? pharmacyDaySchedule.endTime ?? current.defaultEndTime : current.defaultEndTime,
      })
    );
  }, [state, values.dateDebut, regenerateDays]);

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
    distanceStatus,
    distanceSource,
    distanceError,
    distanceCanRoute: canRouteDistance(pharmacien, pharmacie),
    
    // Fonctions
    setField,
    regenerateDays,
    recalcDay,
    updateDay,
    addExpense,
    addTypedExpense,
    removeExpense,
    removeDay,
    updateExpense,
    addReceipt,
    deleteReceipt,
    recalcDistance,
    setManualDistance,
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
    createExpense,
    createDay,
    missionToForm,
    buildMissionFromForm,
    expenseTypeConfig,
  };
}
