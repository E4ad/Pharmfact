import { describe, expect, it } from 'vitest';
import {
  buildSantePharmacyNotes,
  bundledSantePharmacyEntries,
  bundledSantePharmacyRegistry,
  getSantePharmacyAddressParts,
  searchSantePharmacies,
} from './santePharmacyRegistry';

describe('santePharmacyRegistry', () => {
  it('ships the full offline pharmacy registry snapshot', () => {
    const registry = bundledSantePharmacyRegistry();

    expect(registry.source).toBe('sante.gouv.qc.ca');
    expect(registry.totalAnnounced).toBe(1883);
    expect(registry.entries).toHaveLength(1883);
  });

  it('contains stable pharmacy identifiers and addresses', () => {
    const entries = bundledSantePharmacyEntries();
    const ids = new Set(entries.map((entry) => entry.id));

    expect(ids.size).toBe(entries.length);
    expect(entries.filter((entry) => entry.name)).toHaveLength(entries.length);
    expect(entries.filter((entry) => entry.postalCode).length).toBeGreaterThan(1880);
  });

  it('searches pharmacies offline by name, city, or postal code', () => {
    expect(searchSantePharmacies('Montréal').length).toBeGreaterThan(0);
    expect(searchSantePharmacies('H4N 1K2')[0]?.postalCode).toBe('H4N 1K2');
    expect(searchSantePharmacies('Marché-Central')[0]?.postalCode).toBe('H4N 1K2');
  });

  it('maps a registry entry to pharmacy form address fields', () => {
    const pharmacy = searchSantePharmacies('H4N 1K2')[0];
    const address = getSantePharmacyAddressParts(pharmacy);

    expect(pharmacy.name).toContain('PHARMACIE');
    expect(address).toEqual({
      adresse: '951, rue du Marché-Central',
      numero: '951',
      rue: 'rue du Marché-Central',
      ville: 'Montréal',
      codePostal: 'H4N 1K2',
      telephone: expect.any(String),
      lat: expect.any(Number),
      lng: expect.any(Number),
      openingHours: expect.any(String),
    });
    expect(buildSantePharmacyNotes(pharmacy)).toContain('Horaire Santé Québec');
  });
});
