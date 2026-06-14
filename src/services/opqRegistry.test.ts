import { describe, expect, it } from 'vitest';
import { bundledOpqRegistryEntries, findOpqPharmacistByLicense, normalizeOpqLicenseNumber } from './opqRegistry';
import type { OpqPharmacistRegistryEntry } from '../storage/schema';

const entries: OpqPharmacistRegistryEntry[] = [
  {
    id: 'opq-1',
    fullName: 'Isabelle Fleurent',
    licenseNumber: '093224',
    studentLicenseNumber: null,
    city: 'QUEBEC',
    isStudent: false,
  },
  {
    id: 'opq-2',
    fullName: 'Alex Étudiant',
    licenseNumber: null,
    studentLicenseNumber: 'E-12345',
    city: 'MONTRÉAL',
    isStudent: true,
  },
];

describe('opqRegistry', () => {
  it('normalizes license numbers to digits only', () => {
    expect(normalizeOpqLicenseNumber(' 09-3224 ')).toBe('093224');
  });

  it('finds a pharmacist by regular license number', () => {
    expect(findOpqPharmacistByLicense(entries, '093224')?.fullName).toBe('Isabelle Fleurent');
  });

  it('finds a student by student license number', () => {
    expect(findOpqPharmacistByLicense(entries, 'E-12345')?.fullName).toBe('Alex Étudiant');
  });

  it('returns undefined for unknown license numbers', () => {
    expect(findOpqPharmacistByLicense(entries, '999999')).toBeUndefined();
  });

  it('ships a bundled offline registry snapshot', () => {
    const bundled = bundledOpqRegistryEntries();

    expect(bundled.length).toBeGreaterThan(1000);
    expect(bundled[0].id).toBeTruthy();
    expect(bundled[0].fullName).toBeTruthy();
  });
});
