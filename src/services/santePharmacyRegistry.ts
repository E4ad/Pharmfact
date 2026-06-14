import santePharmacyRegistrySnapshot from '../data/sante-pharmacies-index.json';

export type SantePharmacyRegistryEntry = {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  formattedAddress: string;
  telephone?: string;
  lat?: number;
  lng?: number;
  openingHours?: string;
  source: 'sante.gouv.qc.ca';
  sourceUrl: string;
};

export type SantePharmacyRegistry = {
  source: 'sante.gouv.qc.ca';
  sourceUrl: string;
  generatedAt: string;
  totalAnnounced: number;
  entries: SantePharmacyRegistryEntry[];
};

export function bundledSantePharmacyRegistry(): SantePharmacyRegistry {
  return santePharmacyRegistrySnapshot as SantePharmacyRegistry;
}

export function bundledSantePharmacyEntries(): SantePharmacyRegistryEntry[] {
  return bundledSantePharmacyRegistry().entries;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchSantePharmacies(query: string, limit = 8): SantePharmacyRegistryEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  return bundledSantePharmacyEntries()
    .filter((entry) => {
      const searchable = normalizeSearchText([
        entry.name,
        entry.addressLine,
        entry.city,
        entry.postalCode,
        entry.formattedAddress,
        entry.telephone ?? '',
        entry.openingHours ?? '',
      ].filter(Boolean).join(' '));
      return searchable.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function getSantePharmacyAddressParts(entry: SantePharmacyRegistryEntry): {
  adresse: string;
  rue?: string;
  numero?: string;
  ville: string;
  codePostal: string;
  telephone?: string;
  lat?: number;
  lng?: number;
  openingHours?: string;
} {
  const addressLine = entry.addressLine.trim();
  const [, numero, rue] = addressLine.match(/^([^,]+),\s*(.+)$/) ?? [];

  return {
    adresse: addressLine,
    numero: numero?.trim() || undefined,
    rue: rue?.trim() || undefined,
    ville: entry.city.trim(),
    codePostal: entry.postalCode.trim(),
    telephone: entry.telephone?.trim() || undefined,
    lat: Number.isFinite(entry.lat) ? entry.lat : undefined,
    lng: Number.isFinite(entry.lng) ? entry.lng : undefined,
    openingHours: entry.openingHours?.trim() || undefined,
  };
}

export function buildSantePharmacyNotes(entry: Pick<SantePharmacyRegistryEntry, 'openingHours'>): string {
  return entry.openingHours?.trim() ? `Horaire Santé Québec : ${entry.openingHours.trim()}` : '';
}
