import type { Pharmacien, Pharmacie } from '../storage/schema';
import { normalizeOpqLicenseNumber } from './opqRegistry';

type PharmacyDraft = Pick<Pharmacie, 'nom' | 'adresse' | 'ville' | 'codePostal'> & {
  displayLabel?: string;
};

type PharmacistDraft = Pick<Pharmacien, 'nom' | 'email' | 'codePostal'> & {
  opqLicenseNumber?: string;
};

function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizePostalCode(value?: string): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

function normalizeEmail(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function pharmacyAddressKey(value: PharmacyDraft): string {
  return [
    normalizeText(value.adresse),
    normalizeText(value.ville),
    normalizePostalCode(value.codePostal),
  ].filter(Boolean).join('|');
}

function pharmacyNames(value: PharmacyDraft): string[] {
  return [value.nom, value.displayLabel].map(normalizeText).filter(Boolean);
}

export function findDuplicatePharmacy(
  pharmacies: Pharmacie[],
  draft: PharmacyDraft,
  currentId?: string,
): Pharmacie | undefined {
  const draftNames = new Set(pharmacyNames(draft));
  const draftAddress = pharmacyAddressKey(draft);

  return pharmacies.find((pharmacy) => {
    if (pharmacy.id === currentId) return false;

    const existingNames = pharmacyNames(pharmacy);
    const sameName = existingNames.some((name) => draftNames.has(name));
    const sameAddress = draftAddress.length > 8 && pharmacyAddressKey(pharmacy) === draftAddress;

    return sameName || sameAddress;
  });
}

export function findDuplicatePharmacist(
  pharmaciens: Pharmacien[],
  draft: PharmacistDraft,
  currentId?: string,
): Pharmacien | undefined {
  const draftLicense = normalizeOpqLicenseNumber(draft.opqLicenseNumber);
  const draftEmail = normalizeEmail(draft.email);
  const draftName = normalizeText(draft.nom);
  const draftPostalCode = normalizePostalCode(draft.codePostal);

  return pharmaciens.find((pharmacien) => {
    if (pharmacien.id === currentId) return false;

    const sameLicense = draftLicense && normalizeOpqLicenseNumber(pharmacien.opqLicenseNumber) === draftLicense;
    const sameEmail = draftEmail && normalizeEmail(pharmacien.email) === draftEmail;
    const sameIdentity = draftName && draftPostalCode
      && normalizeText(pharmacien.nom) === draftName
      && normalizePostalCode(pharmacien.codePostal) === draftPostalCode;

    return Boolean(sameLicense || sameEmail || sameIdentity);
  });
}
