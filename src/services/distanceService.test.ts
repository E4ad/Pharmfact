import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState, Pharmacien, Pharmacie } from '../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';
import { upsertDistanceReference } from './distanceReferences';
import {
  buildAddressFingerprint,
  createManualDistanceReference,
  resolveRouteDistance,
} from './distanceService';

const routeDistanceMock = vi.hoisted(() => vi.fn());

vi.mock('./platformService', () => ({
  getPlatformAsync: async () => ({
    api: {
      routeDistance: routeDistanceMock,
    },
  }),
}));

const pharmacien: Pharmacien = {
  id: 'ph_route',
  nom: 'Route Pharmacien',
  adresse: '1240 rue Saint-Denis',
  ville: 'Montréal',
  codePostal: 'H2X 3J6',
  lat: 45.515,
  lng: -73.56,
  telephone: '',
  email: '',
  hourlyRateCents: 8500,
  distanceKmDomicile: 0,
  taxStatus: 'SMALL_SUPPLIER',
};

const pharmacie: Pharmacie = {
  id: 'pha_route',
  nom: 'Pharmacie Route',
  adresse: '402 boulevard René-Lévesque',
  ville: 'Montréal',
  codePostal: 'H2Z 1A7',
  lat: 45.508,
  lng: -73.56,
  telephone: '',
  email: '',
  defaultBreakMinutes: 60,
};

function stateWith(distanceReferences: AppState['distanceReferences'] = []): AppState {
  return {
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
    distanceReferences,
    opqPharmacistRegistry: { entries: [], sourceUrl: '' },
    appOptions: createDefaultAppOptions(),
    uiSettings: { themeMode: 'system' },
    localDataSettings: { autoBackupEnabled: true },
    ui: { missionFilters: {}, auditTrail: [] },
  };
}

describe('distanceService', () => {
  beforeEach(() => {
    routeDistanceMock.mockReset();
  });

  it('builds a stable address fingerprint', () => {
    expect(buildAddressFingerprint({ ...pharmacien })).toBe(buildAddressFingerprint({ ...pharmacien }));
  });

  it('returns a valid manual cache before routing', async () => {
    const reference = createManualDistanceReference({ pharmacien, pharmacie, distanceKm: 18 });
    const result = await resolveRouteDistance({ pharmacien, pharmacie, state: stateWith([reference]) });

    expect(result.status).toBe('manual');
    expect(result.reference).toBe(reference);
    expect(routeDistanceMock).not.toHaveBeenCalled();
  });

  it('invalidates cache when an address changes', async () => {
    const reference = createManualDistanceReference({ pharmacien, pharmacie, distanceKm: 18 });
    const movedPharmacie = { ...pharmacie, adresse: '999 rue Ontario' };

    routeDistanceMock.mockResolvedValue({ distanceKm: 20, distanceAllerKm: 10, source: 'route' });

    const result = await resolveRouteDistance({
      pharmacien,
      pharmacie: movedPharmacie,
      state: stateWith([reference]),
    });

    expect(result.status).toBe('ready');
    expect(result.reference?.distanceKm).toBe(20);
    expect(routeDistanceMock).toHaveBeenCalledTimes(1);
  });

  it('returns missing_coordinates without creating a fallback distance', async () => {
    const result = await resolveRouteDistance({
      pharmacien: { ...pharmacien, lat: undefined, lng: undefined },
      pharmacie,
      state: stateWith(),
    });

    expect(result.status).toBe('missing_coordinates');
    expect(result.reference).toBeUndefined();
    expect(routeDistanceMock).not.toHaveBeenCalled();
  });

  it('creates a route reference when provider succeeds', async () => {
    routeDistanceMock.mockResolvedValue({ distanceKm: 22, distanceAllerKm: 11, source: 'route' });

    const result = await resolveRouteDistance({ pharmacien, pharmacie, state: stateWith() });

    expect(result.status).toBe('ready');
    expect(result.reference?.source).toBe('route');
    expect(result.reference?.provider).toBe('osrm');
    expect(result.reference?.distanceAllerKm).toBe(11);
  });

  it('returns routing_failed without creating a fictive distance when provider fails', async () => {
    routeDistanceMock.mockResolvedValue(null);

    const result = await resolveRouteDistance({ pharmacien, pharmacie, state: stateWith() });

    expect(result.status).toBe('routing_failed');
    expect(result.reference).toBeUndefined();
  });

  it('replaces a manual reference only when explicit routing succeeds', async () => {
    const manual = createManualDistanceReference({ pharmacien, pharmacie, distanceKm: 30 });
    const state = upsertDistanceReference(stateWith(), manual);
    routeDistanceMock.mockResolvedValue({ distanceKm: 24, distanceAllerKm: 12, source: 'route' });

    const result = await resolveRouteDistance({ pharmacien, pharmacie, state, preferRoute: true });

    expect(result.status).toBe('ready');
    expect(result.reference?.source).toBe('route');
    expect(result.reference?.distanceKm).toBe(24);
  });
});
