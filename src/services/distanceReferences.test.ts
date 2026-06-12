import { describe, expect, it } from 'vitest';
import {
  buildAddressKey,
  createDistanceReference,
  findReusableDistanceReference,
  upsertDistanceReference,
} from './distanceReferences';
import type { AppState, Pharmacien, Pharmacie } from '../storage/schema';

const pharmacien = {
  id: 'ph1',
  nom: 'Pharmacien',
  adresse: '100 rue Saint-Denis',
  ville: 'Montréal',
  codePostal: 'H2X 3K4',
  lat: 45.515,
  lng: -73.56,
  telephone: '',
  email: '',
  hourlyRateCents: 0,
  distanceKmDomicile: 0,
  taxStatus: 'SMALL_SUPPLIER',
} satisfies Pharmacien;

const pharmacie = {
  id: 'pha1',
  nom: 'Pharmacie',
  adresse: '200 rue Ontario',
  ville: 'Montréal',
  codePostal: 'H2X 1H4',
  lat: 45.52,
  lng: -73.57,
  telephone: '',
  email: '',
  defaultBreakMinutes: 60,
} satisfies Pharmacie;

const baseState = {
  distanceReferences: [],
} as unknown as AppState;

describe('distanceReferences', () => {
  it('builds stable address keys from address and coordinates', () => {
    expect(buildAddressKey({ adresse: ' 100  Rue Saint-Denis ', ville: 'Montréal', codePostal: 'H2X 3K4', lat: 45.515, lng: -73.56 }))
      .toBe('100 rue saint-denis|montréal|h2x 3k4|45.515000|-73.560000');
  });

  it('reuses a distance reference for the same address pair', () => {
    const reference = createDistanceReference({ pharmacien, pharmacie, distanceKm: 12.34, distanceAllerKm: 6.17 });
    const state = upsertDistanceReference(baseState, reference);

    expect(findReusableDistanceReference(state, pharmacien, pharmacie)?.distanceKm).toBe(12);
  });

  it('does not reuse a reference when an address changes', () => {
    const reference = createDistanceReference({ pharmacien, pharmacie, distanceKm: 12.3, distanceAllerKm: 6.1 });
    const state = upsertDistanceReference(baseState, reference);
    const movedPharmacie = { ...pharmacie, adresse: '300 rue Ontario' };

    expect(findReusableDistanceReference(state, pharmacien, movedPharmacie)).toBeUndefined();
  });
});
