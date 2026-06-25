import type { AppState, DistanceReference, Pharmacien, Pharmacie } from '../storage/schema';
import { createId } from './ids';

type AddressEntity = {
  adresse?: string;
  ville?: string;
  codePostal?: string;
  lat?: number;
  lng?: number;
};

function normalizeAddressPart(value?: string): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function coordinatePart(value?: number): string {
  return Number.isFinite(value) ? Number(value).toFixed(6) : '';
}

export function buildAddressKey(entity?: AddressEntity): string {
  return [
    normalizeAddressPart(entity?.adresse),
    normalizeAddressPart(entity?.ville),
    normalizeAddressPart(entity?.codePostal),
    coordinatePart(entity?.lat),
    coordinatePart(entity?.lng),
  ].join('|');
}

export const buildAddressFingerprint = buildAddressKey;

export function buildAddressOnlyFingerprint(entity?: AddressEntity): string {
  return [
    normalizeAddressPart(entity?.adresse),
    normalizeAddressPart(entity?.ville),
    normalizeAddressPart(entity?.codePostal),
  ].join('|');
}

export function hasCoordinates(entity?: AddressEntity): entity is AddressEntity & { lat: number; lng: number } {
  return Number.isFinite(entity?.lat) && Number.isFinite(entity?.lng);
}

export function findReusableDistanceReference(
  state: AppState,
  pharmacien?: Pharmacien,
  pharmacie?: Pharmacie,
): DistanceReference | undefined {
  if (!pharmacien || !pharmacie) return undefined;
  const fromAddressHash = buildAddressFingerprint(pharmacien);
  const toAddressHash = buildAddressFingerprint(pharmacie);

  const matches = state.distanceReferences.filter((reference) => {
    if (reference.pharmacienId !== pharmacien.id || reference.pharmacieId !== pharmacie.id) return false;
    const referenceFromHash = reference.fromAddressHash || reference.pharmacienAddressKey;
    const referenceToHash = reference.toAddressHash || reference.pharmacieAddressKey;
    return reference.distanceKm > 0 && referenceFromHash === fromAddressHash && referenceToHash === toAddressHash;
  });

  return matches.sort((a, b) => {
    const sourcePriority = (source: DistanceReference['source']) => source === 'manual' ? 0 : source === 'route' ? 1 : 2;
    const sourceDiff = sourcePriority(a.source) - sourcePriority(b.source);
    if (sourceDiff !== 0) return sourceDiff;
    return new Date(b.computedAt || b.updatedAt).getTime() - new Date(a.computedAt || a.updatedAt).getTime();
  })[0];
}

export function createDistanceReference(params: {
  pharmacien: Pharmacien;
  pharmacie: Pharmacie;
  distanceKm: number;
  distanceAllerKm?: number;
  source: DistanceReference['source'];
  provider?: DistanceReference['provider'];
  errorReason?: string;
}): DistanceReference {
  const computedAt = new Date().toISOString();
  const fromAddressHash = buildAddressFingerprint(params.pharmacien);
  const toAddressHash = buildAddressFingerprint(params.pharmacie);
  const distanceKm = Math.max(0, Math.round(params.distanceKm));
  const distanceAllerKm = Number.isFinite(params.distanceAllerKm)
    ? Math.max(0, Math.round(Number(params.distanceAllerKm)))
    : undefined;

  return {
    id: createId('dist'),
    pharmacienId: params.pharmacien.id,
    pharmacieId: params.pharmacie.id,
    distanceKm,
    distanceAllerKm,
    fromAddressHash,
    toAddressHash,
    provider: params.provider ?? (params.source === 'route' ? 'osrm' : params.source === 'manual' ? 'manual' : undefined),
    computedAt,
    errorReason: params.errorReason,
    source: params.source,
    updatedAt: computedAt,
    pharmacienAddressKey: fromAddressHash,
    pharmacieAddressKey: toAddressHash,
  };
}

export function upsertDistanceReference(state: AppState, reference: DistanceReference): AppState {
  const references = state.distanceReferences.filter((item) =>
    item.pharmacienId !== reference.pharmacienId ||
    item.pharmacieId !== reference.pharmacieId ||
    (item.fromAddressHash || item.pharmacienAddressKey) !== reference.fromAddressHash ||
    (item.toAddressHash || item.pharmacieAddressKey) !== reference.toAddressHash ||
    item.source !== reference.source
  );

  return {
    ...state,
    distanceReferences: [...references, reference],
  };
}
