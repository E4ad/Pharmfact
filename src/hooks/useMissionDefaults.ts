import { useMemo } from 'react';
import type { AppState, Pharmacien, Pharmacie } from '../storage/schema';
import { useAppState } from '../storage/localStore';
import { findPharmacie } from '../storage/selectors';

export function buildMissionDefaults(state: AppState, activePharmacienId?: string) {
  const pharmacien = state.pharmaciens.find((item) => item.id === (activePharmacienId ?? state.activePharmacienId)) ?? state.pharmaciens.find((item) => item.isDefaultProfile) ?? state.pharmaciens[0];
  const defaultPharmacie = pharmacien?.favoritePharmacieId ? findPharmacie(state, pharmacien.favoritePharmacieId) : state.pharmacies[0];
  const options = state.options;
  const distanceReference = pharmacien && defaultPharmacie
    ? state.distanceReferences.find((item) => item.pharmacienId === pharmacien.id && item.pharmacieId === defaultPharmacie.id)
    : undefined;

  return {
    pharmacien,
    defaultPharmacie,
    defaultMissionType: defaultPharmacie?.defaultMissionType ?? pharmacien?.defaultMissionType ?? options.defaultMissionType,
    scheduleDefaults: {
      startTime: pharmacien?.defaultStartTime ?? options.defaultStartTime,
      endTime: pharmacien?.defaultEndTime ?? options.defaultEndTime,
      breakMinutes: defaultPharmacie?.defaultBreakMinutes ?? pharmacien?.defaultBreakMinutes ?? options.defaultBreakMinutes,
    },
    mealDefaults: {
      enabled: pharmacien?.mealAutoEnabled ?? options.mealAutoEnabled,
      thresholdHours: pharmacien?.mealThresholdHours ?? options.mealThresholdHours,
      amountCents: pharmacien?.mealDefaultCents ?? options.mealDefaultCents,
    },
    mileageDefaults: {
      rateCents: pharmacien?.mileageRateCents ?? options.mileageRateCents,
      distanceKm: distanceReference?.distanceKm ?? 0,
    },
    billingDefaults: {
      invoiceDueDays: pharmacien?.invoiceDueDays ?? options.invoiceDueDays,
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
