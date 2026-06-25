import { describe, expect, it } from 'vitest';
import type { AppState } from '../storage/schema';
import { createDemoState } from '../storage/seedData';
import { createManualDistanceReference } from '../services/distanceService';
import { buildMissionDefaults, canDeletePharmacien, canDeletePharmacie, resolveBreakMinutes } from './useMissionDefaults';

function stateWithDefaults(): AppState {
  return createDemoState();
}

describe('useMissionDefaults helpers', () => {
  it('uses pharmacist break over pharmacy break for mission defaults', () => {
    const state = stateWithDefaults();
    const pharmacien = { ...state.pharmaciens[0], defaultBreakMinutes: 30, favoritePharmacieId: state.pharmacies[0].id };
    const pharmacie = { ...state.pharmacies[0], defaultBreakMinutes: 45 };
    const next = { ...state, pharmaciens: [pharmacien], pharmacies: [pharmacie], activePharmacienId: pharmacien.id };

    expect(resolveBreakMinutes({ pharmacie, pharmacien, globalDefault: 60 })).toBe(30);
    expect(buildMissionDefaults(next).scheduleDefaults.breakMinutes).toBe(30);
  });

  it('falls back to pharmacist then global defaults', () => {
    const state = stateWithDefaults();
    const pharmacien = { ...state.pharmaciens[0], defaultBreakMinutes: 30, favoritePharmacieId: state.pharmacies[0].id };
    const pharmacie = { ...state.pharmacies[0], defaultBreakMinutes: undefined as unknown as number };
    const next = { ...state, pharmaciens: [pharmacien], pharmacies: [pharmacie], activePharmacienId: pharmacien.id, appOptions: { ...state.appOptions, missionDefaults: { ...state.appOptions.missionDefaults, defaultBreakMinutes: 75 } } };

    expect(buildMissionDefaults(next).scheduleDefaults.breakMinutes).toBe(30);
    expect(resolveBreakMinutes({ globalDefault: 75 })).toBe(75);
  });

  it('returns mileage distance from manual distance reference', () => {
    const state = stateWithDefaults();
    const pharmacien = state.pharmaciens[0];
    const pharmacie = state.pharmacies[0];
    const next = { ...state, distanceReferences: [createManualDistanceReference({ pharmacien, pharmacie, distanceKm: 24.6 })] };

    expect(buildMissionDefaults(next).mileageDefaults.distanceKm).toBe(25);
  });

  it('exposes small supplier and registered tax defaults', () => {
    const state = stateWithDefaults();
    expect(buildMissionDefaults({ ...state, activePharmacienId: 'ph_amelie' }).taxDefaults.taxStatus).toBe('SMALL_SUPPLIER');
    expect(buildMissionDefaults({ ...state, activePharmacienId: 'ph_louis' }).taxDefaults.taxStatus).toBe('REGISTERED');
  });

  it('uses invoice due days from pharmacist profile', () => {
    const state = stateWithDefaults();
    const pharmacien = { ...state.pharmaciens[0], invoiceDueDays: 45 };
    const next = { ...state, pharmaciens: [pharmacien], activePharmacienId: pharmacien.id };

    expect(buildMissionDefaults(next).billingDefaults.invoiceDueDays).toBe(45);
  });

  it('blocks deletion when missions are linked', () => {
    const state = stateWithDefaults();

    expect(canDeletePharmacie(state, state.missions[0].pharmacieId)).toBe(false);
    expect(canDeletePharmacien(state, state.missions[0].pharmacienId)).toBe(false);
    expect(canDeletePharmacie(state, 'unused')).toBe(true);
  });
});
