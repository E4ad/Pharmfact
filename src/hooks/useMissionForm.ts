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
import { addressOf, estimateDistanceKm } from '../services/distanceCalculator';
import {
  createDistanceReference,
  findReusableDistanceReference,
  hasCoordinates,
  upsertDistanceReference,
} from '../services/distanceReferences';
import { buildMissionDefaults } from './useMissionDefaults';
import { resolveMissionDefaults } from '../storage/selectors';
import { updateAppState, useAppState } from '../storage/localStore';
import type { AppState, Mission, MissionDay, MissionExpense, ExpenseReceipt } from '../storage/schema';
import { findPharmacien, findPharmacie } from '../storage/selectors';
import { createMissionExpenseDraft, normalizeMissionExpense, expenseTypeConfig } from '../services/expenseTypes';
import { createLocalReceipt, validateReceiptFile } from '../services/expenseReceipts';
import { formatMoney } from '../services/money';
import { getPlatformAsync } from '../services/platformService';

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

  // Effet pour calculer la distance automatiquement, puis réutiliser la référence sauvegardée.
  useEffect(() => {
    let cancelled = false;
    if (!pharmacien || !pharmacie || values.distanceReferenceKm > 0) return undefined;

    const cached = findReusableDistanceReference(state, pharmacien, pharmacie);
    if (cached?.distanceKm) {
      setValues((current) => ({ ...current, distanceReferenceKm: cached.distanceKm }));
      return undefined;
    }

    if (!hasCoordinates(pharmacien) || !hasCoordinates(pharmacie)) {
      const km = estimateDistanceKm(pharmacien, pharmacie);
      if (km > 0) setValues((current) => ({ ...current, distanceReferenceKm: km }));
      return undefined;
    }

    getPlatformAsync()
      .then((platform) => platform.api.routeDistance({
        fromLat: pharmacien.lat,
        fromLng: pharmacien.lng,
        toLat: pharmacie.lat,
        toLng: pharmacie.lng,
      }))
      .then((result) => {
        if (cancelled || !result?.distanceKm) return;
        const reference = createDistanceReference({
          pharmacien,
          pharmacie,
          distanceKm: result.distanceKm,
          distanceAllerKm: result.distanceAllerKm,
        });
        updateAppState((current) => upsertDistanceReference(current, reference));
        setValues((current) => ({ ...current, distanceReferenceKm: reference.distanceKm }));
      })
      .catch(() => {
        const km = estimateDistanceKm(pharmacien, pharmacie);
        if (!cancelled && km > 0) setValues((current) => ({ ...current, distanceReferenceKm: km }));
      });

    return () => {
      cancelled = true;
    };
  }, [state, values.pharmacienId, values.pharmacieId, pharmacien, pharmacie, values.distanceReferenceKm]);

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
    if (!pharmacien || !pharmacie) {
      setField('distanceReferenceKm', 0);
      return;
    }

    if (!hasCoordinates(pharmacien) || !hasCoordinates(pharmacie)) {
      setField('distanceReferenceKm', estimateDistanceKm(pharmacien, pharmacie));
      return;
    }

    getPlatformAsync()
      .then((platform) => platform.api.routeDistance({
        fromLat: pharmacien.lat,
        fromLng: pharmacien.lng,
        toLat: pharmacie.lat,
        toLng: pharmacie.lng,
      }))
      .then((result) => {
        if (!result?.distanceKm) {
          setField('distanceReferenceKm', estimateDistanceKm(pharmacien, pharmacie));
          return;
        }
        const reference = createDistanceReference({
          pharmacien,
          pharmacie,
          distanceKm: result.distanceKm,
          distanceAllerKm: result.distanceAllerKm,
        });
        updateAppState((current) => upsertDistanceReference(current, reference));
        setField('distanceReferenceKm', reference.distanceKm);
      })
      .catch(() => setField('distanceReferenceKm', estimateDistanceKm(pharmacien, pharmacie)));
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
    setValues((current) =>
      regenerateDays({
        ...current,
        pharmacieId: id,
        distanceReferenceKm: 0,
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
