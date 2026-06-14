import { describe, expect, it } from 'vitest';
import type { Pharmacien, Pharmacie } from '../storage/schema';
import { findDuplicatePharmacist, findDuplicatePharmacy } from './entityDuplicates';

const pharmacy = {
  id: 'pha1',
  nom: 'PHARMACIE ABC INC.',
  displayLabel: 'PJC 021',
  adresse: '951, rue du Marché-Central',
  ville: 'Montréal',
  codePostal: 'H4N 1K2',
} satisfies Partial<Pharmacie> as Pharmacie;

const pharmacist = {
  id: 'ph1',
  nom: 'Amélie Tremblay',
  opqLicenseNumber: '12345',
  email: 'amelie@example.com',
  codePostal: 'H2X 1A1',
} satisfies Partial<Pharmacien> as Pharmacien;

describe('entityDuplicates', () => {
  it('detects pharmacy duplicate by official name, display name, or address', () => {
    expect(findDuplicatePharmacy([pharmacy], { nom: 'pharmacie abc inc', adresse: '', ville: '', codePostal: '' })?.id).toBe('pha1');
    expect(findDuplicatePharmacy([pharmacy], { nom: 'Nouvelle', displayLabel: 'PJC 021', adresse: '', ville: '', codePostal: '' })?.id).toBe('pha1');
    expect(findDuplicatePharmacy([pharmacy], { nom: 'Nouvelle', adresse: '951 rue du marche central', ville: 'Montreal', codePostal: 'H4N1K2' })?.id).toBe('pha1');
  });

  it('ignores current pharmacy while editing', () => {
    expect(findDuplicatePharmacy([pharmacy], { nom: 'PHARMACIE ABC INC.', adresse: '', ville: '', codePostal: '' }, 'pha1')).toBeUndefined();
  });

  it('detects pharmacist duplicate by OPQ license, email, or name with postal code', () => {
    expect(findDuplicatePharmacist([pharmacist], { nom: '', opqLicenseNumber: '12 345', email: '', codePostal: '' })?.id).toBe('ph1');
    expect(findDuplicatePharmacist([pharmacist], { nom: '', email: 'AMELIE@example.com', codePostal: '' })?.id).toBe('ph1');
    expect(findDuplicatePharmacist([pharmacist], { nom: 'Amelie Tremblay', email: '', codePostal: 'H2X1A1' })?.id).toBe('ph1');
  });
});
