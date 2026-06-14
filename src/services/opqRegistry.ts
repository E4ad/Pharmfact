import type { AppState, OpqPharmacistRegistryEntry, Pharmacien } from '../storage/schema';
import bundledOpqPharmacistRegistry from '../data/opq-pharmacists-index.json';

export const OPQ_REGISTRY_SOURCE_URL = 'https://www.opq.org/trouver-un-pharmacien/';

export function bundledOpqRegistryEntries(): OpqPharmacistRegistryEntry[] {
  return bundledOpqPharmacistRegistry as OpqPharmacistRegistryEntry[];
}

export function normalizeOpqLicenseNumber(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '').trim();
}

export function findOpqPharmacistByLicense(
  entries: OpqPharmacistRegistryEntry[],
  licenseNumber?: string | null,
): OpqPharmacistRegistryEntry | undefined {
  const normalized = normalizeOpqLicenseNumber(licenseNumber);
  if (!normalized) return undefined;

  return entries.find((entry) =>
    normalizeOpqLicenseNumber(entry.licenseNumber) === normalized ||
    normalizeOpqLicenseNumber(entry.studentLicenseNumber) === normalized
  );
}

export function verifyPharmacienInOpqRegistry(
  state: AppState,
  pharmacien: Pick<Pharmacien, 'opqLicenseNumber'>,
): OpqPharmacistRegistryEntry | undefined {
  return findOpqPharmacistByLicense(state.opqPharmacistRegistry.entries, pharmacien.opqLicenseNumber);
}
