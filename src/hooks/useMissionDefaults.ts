import { useMemo } from 'react';
import type { AppState, Pharmacien, Pharmacie } from '../storage/schema';
import { useAppState } from '../storage/localStore';
import { findPharmacie } from '../storage/selectors';
import { findReusableDistanceReference } from '../services/distanceReferences';

export function buildMissionDefaults(state: AppState, activePharmacienId?: string) {
  const pharmacien = state.pharmaciens.find((item) => item.id === (activePharmacienId ?? state.activePharmacienId)) ?? state.pharmaciens.find((item) => item.isDefaultProfile) ?? state.pharmaciens[0];
  const defaultPharmacie = pharmacien?.favoritePharmacieId ? findPharmacie(state, pharmacien.favoritePharmacieId) : state.pharmacies[0];
  const options = state.appOptions;
  const distanceReference = findReusableDistanceReference(state, pharmacien, defaultPharmacie);

  return {
    pharmacien,
    defaultPharmacie,
    defaultMissionType: defaultPharmacie?.defaultMissionType ?? pharmacien?.defaultMissionType ?? options.missionDefaults.defaultMissionType,
    scheduleDefaults: {
      startTime: pharmacien?.defaultStartTime ?? options.missionDefaults.defaultStartTime,
      endTime: pharmacien?.defaultEndTime ?? options.missionDefaults.defaultEndTime,
      breakMinutes: defaultPharmacie?.defaultBreakMinutes ?? pharmacien?.defaultBreakMinutes ?? options.missionDefaults.defaultBreakMinutes,
    },
    mealDefaults: {
      enabled: pharmacien?.mealAutoEnabled ?? options.missionDefaults.mealAutoEnabled,
      thresholdHours: pharmacien?.mealThresholdHours ?? options.missionDefaults.mealThresholdHours,
      amountCents: pharmacien?.mealDefaultCents ?? options.missionDefaults.mealDefaultCents,
    },
    mileageDefaults: {
      rateCents: pharmacien?.mileageRateCents ?? options.missionDefaults.mileageRateCents,
      distanceKm: distanceReference?.distanceKm ?? 0,
    },
    billingDefaults: {
      invoiceDueDays: pharmacien?.invoiceDueDays ?? options.invoiceDefaults.invoiceDueDays,
      paymentTerms: pharmacien?.paymentTerms,
    },
    taxDefaults: {
      taxStatus: pharmacien?.taxStatus ?? 'SMALL_SUPPLIER',
      gstNumber: pharmacien?.gstNumber,
      qstNumber: pharmacien?.qstNumber,
    },
  };
}

export function resolveBreakMinutes(params: { pharmacie?: Pharmacie; pharmacien?: Pharmacien; globalDefault: number }) {
  return params.pharmacie?.defaultBreakMinutes ?? params.pharmacien?.defaultBreakMinutes ?? params.globalDefault;
}

export function canDeletePharmacie(state: AppState, pharmacieId: string): boolean {
  return !state.missions.some((mission) => mission.pharmacieId === pharmacieId);
}

export function canDeletePharmacien(state: AppState, pharmacienId: string): boolean {
  return !state.missions.some((mission) => mission.pharmacienId === pharmacienId);
}

export function useMissionDefaults(activePharmacienId?: string) {
  const state = useAppState();
  return useMemo(() => buildMissionDefaults(state, activePharmacienId), [state, activePharmacienId]);
}
