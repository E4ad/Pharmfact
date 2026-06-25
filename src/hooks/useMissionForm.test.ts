import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';
import type { AppState, Pharmacien, Pharmacie } from '../storage/schema';
import { createClosedWeeklySchedule } from '../services/pharmacyMetadata';
import { useMissionForm } from './useMissionForm';

const pharmacien: Pharmacien = {
  id: 'ph_distance',
  nom: 'Distance Pharmacien',
  adresse: '1240 rue Saint-Denis',
  ville: 'Montréal',
  codePostal: 'H2X 3J6',
  telephone: '',
  email: '',
  hourlyRateCents: 8500,
  distanceKmDomicile: 0,
  favoritePharmacieId: 'pha_distance',
  taxStatus: 'SMALL_SUPPLIER',
};

const pharmacie: Pharmacie = {
  id: 'pha_distance',
  nom: 'Pharmacie Distance',
  adresse: '402 boulevard René-Lévesque',
  ville: 'Montréal',
  codePostal: 'H2Z 1A7',
  telephone: '',
  email: '',
  defaultBreakMinutes: 60,
};

const appState: AppState = {
  version: 3,
  activePharmacienId: pharmacien.id,
  pharmaciens: [pharmacien],
  pharmacies: [pharmacie],
  missions: [],
  invoices: [],
  taxPayments: [],
  deductibleExpenses: [],
  expenseReceipts: [],
  fiscalSettings: createDefaultFiscalSettings(2026),
  distanceReferences: [],
  opqPharmacistRegistry: { entries: [], sourceUrl: '' },
  appOptions: createDefaultAppOptions(),
  uiSettings: { themeMode: 'system' },
  localDataSettings: { autoBackupEnabled: true },
  ui: { missionFilters: {}, auditTrail: [] },
};

vi.mock('../storage/localStore', () => ({
  useAppState: () => appState,
  updateAppState: vi.fn(),
}));

describe('useMissionForm', () => {
  beforeEach(() => {
    pharmacie.weeklySchedule = undefined;
    pharmacie.defaultBreakMinutes = 60;
    pharmacien.defaultBreakMinutes = undefined;
    appState.pharmacies = [pharmacie];
  });

  it('does not invent a mission distance when addresses are available without coordinates', async () => {
    const { result } = renderHook(() => useMissionForm('create'));

    await waitFor(() => {
      expect(result.current.distanceStatus).toBe('missing_coordinates');
    });

    expect(result.current.values.distanceReferenceKm).toBe(0);
    expect(result.current.distanceSource).toBeUndefined();
  });

  it('prefills mission start and end from the selected pharmacy weekly schedule without using pharmacy pause', () => {
    const weeklySchedule = createClosedWeeklySchedule({ source: 'manual' });
    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const) {
      weeklySchedule[day] = { enabled: true, startTime: '09:00', endTime: '21:00' };
    }
    pharmacie.weeklySchedule = weeklySchedule;
    pharmacie.defaultBreakMinutes = 45;
    pharmacien.defaultBreakMinutes = 30;

    const { result } = renderHook(() => useMissionForm('create'));

    expect(result.current.values.defaultStartTime).toBe('09:00');
    expect(result.current.values.defaultEndTime).toBe('21:00');
    expect(result.current.values.defaultUnpaidBreakMinutes).toBe(30);
  });

  it('updates start and end when switching to a pharmacy with a weekly schedule', () => {
    const weeklySchedule = createClosedWeeklySchedule({ source: 'manual' });
    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const) {
      weeklySchedule[day] = { enabled: true, startTime: '09:00', endTime: '21:00' };
    }
    const scheduledPharmacy: Pharmacie = {
      ...pharmacie,
      id: 'pha_scheduled',
      nom: 'Pharmacie Horaire',
      defaultBreakMinutes: 15,
      weeklySchedule,
    };
    pharmacien.defaultBreakMinutes = 50;
    appState.pharmacies = [pharmacie, scheduledPharmacy];

    const { result } = renderHook(() => useMissionForm('create'));

    act(() => {
      result.current.changePharmacie('pha_scheduled');
    });

    expect(result.current.values.pharmacieId).toBe('pha_scheduled');
    expect(result.current.values.defaultStartTime).toBe('09:00');
    expect(result.current.values.defaultEndTime).toBe('21:00');
    expect(result.current.values.defaultUnpaidBreakMinutes).toBe(50);
  });

  it('uses the selected mission date weekday when switching pharmacies', () => {
    const weeklySchedule = createClosedWeeklySchedule({ source: 'notes_migration', sourceLabel: 'Horaire Santé Québec' });
    weeklySchedule.monday = { enabled: true, startTime: '09:00', endTime: '21:00' };
    weeklySchedule.saturday = { enabled: true, startTime: '09:00', endTime: '18:00' };
    const scheduledPharmacy: Pharmacie = {
      ...pharmacie,
      id: 'pha_sante',
      nom: 'PJC 092 - Martin Chao',
      weeklySchedule,
    };
    pharmacien.defaultBreakMinutes = 60;
    appState.pharmacies = [pharmacie, scheduledPharmacy];

    const { result } = renderHook(() => useMissionForm('create'));

    act(() => {
      result.current.setValues((current) => ({ ...current, dateDebut: '2026-06-27', dateFin: '2026-06-27' }));
    });
    act(() => {
      result.current.changePharmacie('pha_sante');
    });

    expect(result.current.values.defaultStartTime).toBe('09:00');
    expect(result.current.values.defaultEndTime).toBe('18:00');
    expect(result.current.values.defaultUnpaidBreakMinutes).toBe(60);
  });
});
