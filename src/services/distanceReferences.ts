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

export function hasCoordinates(entity?: AddressEntity): entity is AddressEntity & { lat: number; lng: number } {
  return Number.isFinite(entity?.lat) && Number.isFinite(entity?.lng);
}

export function findReusableDistanceReference(
  state: AppState,
  pharmacien?: Pharmacien,
  pharmacie?: Pharmacie,
): DistanceReference | undefined {
  if (!pharmacien || !pharmacie) return undefined;
  const pharmacienAddressKey = buildAddressKey(pharmacien);
  const pharmacieAddressKey = buildAddressKey(pharmacie);

  return state.distanceReferences.find((reference) => {
    if (reference.pharmacienId !== pharmacien.id || reference.pharmacieId !== pharmacie.id) return false;
    if (!reference.pharmacienAddressKey && !reference.pharmacieAddressKey) {
      return reference.distanceKm > 0 && !hasCoordinates(pharmacien) && !hasCoordinates(pharmacie);
    }
    return reference.pharmacienAddressKey === pharmacienAddressKey && reference.pharmacieAddressKey === pharmacieAddressKey;
  });
}

export function createDistanceReference(params: {
  pharmacien: Pharmacien;
  pharmacie: Pharmacie;
  distanceKm: number;
  distanceAllerKm?: number;
  source?: DistanceReference['source'];
}): DistanceReference {
  return {
    id: createId('dist'),
    pharmacienId: params.pharmacien.id,
    pharmacieId: params.pharmacie.id,
    distanceKm: Math.max(1, Math.round(params.distanceKm)),
    distanceAllerKm: Number.isFinite(params.distanceAllerKm) ? Math.max(1, Math.round(Number(params.distanceAllerKm))) : undefined,
    pharmacienAddressKey: buildAddressKey(params.pharmacien),
    pharmacieAddressKey: buildAddressKey(params.pharmacie),
    source: params.source ?? 'calculated',
    updatedAt: new Date().toISOString(),
  };
}

export function upsertDistanceReference(state: AppState, reference: DistanceReference): AppState {
  const references = state.distanceReferences.filter((item) =>
    item.pharmacienId !== reference.pharmacienId ||
    item.pharmacieId !== reference.pharmacieId ||
    item.pharmacienAddressKey !== reference.pharmacienAddressKey ||
    item.pharmacieAddressKey !== reference.pharmacieAddressKey
  );

  return {
    ...state,
    distanceReferences: [...references, reference],
  };
}
