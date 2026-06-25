import type { AppState, DistanceReference, Pharmacien, Pharmacie } from '../storage/schema';
import { getPlatformAsync } from './platformService';
import {
  buildAddressOnlyFingerprint,
  buildAddressFingerprint,
  createDistanceReference,
  findReusableDistanceReference,
  hasCoordinates,
} from './distanceReferences';

export type DistanceResolutionStatus =
  | 'unknown'
  | 'ready'
  | 'missing_coordinates'
  | 'routing_failed'
  | 'manual';

export type ResolvedCoordinates = {
  lat: number;
  lng: number;
  source: string;
  confidence?: number;
};

export type DistanceResolutionResult = {
  status: DistanceResolutionStatus;
  reference?: DistanceReference;
  errorReason?: string;
};

export function resolveEntityCoordinates(
  entity?: { lat?: number; lng?: number },
): ResolvedCoordinates | null {
  if (!hasCoordinates(entity)) return null;
  return {
    lat: entity.lat,
    lng: entity.lng,
    source: 'stored',
  };
}

function formatAddressQuery(entity: { adresse?: string; ville?: string; codePostal?: string }): string {
  return [entity.adresse, entity.ville, entity.codePostal].filter(Boolean).join(', ');
}

export async function geocodeEntityAddressIfNeeded<T extends {
  adresse: string;
  ville: string;
  codePostal: string;
  lat?: number;
  lng?: number;
  geocodedAt?: string;
  geocodedAddressHash?: string;
}>(
  entity: T,
  previous?: T,
): Promise<T> {
  const addressHash = buildAddressOnlyFingerprint(entity);
  const previousAddressHash = previous ? buildAddressOnlyFingerprint(previous) : undefined;

  if (
    hasCoordinates(entity) &&
    entity.geocodedAddressHash === addressHash &&
    previousAddressHash === addressHash
  ) {
    return entity;
  }

  if (hasCoordinates(entity) && entity.geocodedAddressHash === addressHash) {
    return entity;
  }

  if (hasCoordinates(entity) && !entity.geocodedAddressHash) {
    return {
      ...entity,
      geocodedAddressHash: addressHash,
      geocodedAt: entity.geocodedAt ?? new Date().toISOString(),
    };
  }

  const query = formatAddressQuery(entity).trim();
  if (query.length < 3) {
    return { ...entity, lat: undefined, lng: undefined, geocodedAddressHash: undefined, geocodedAt: undefined };
  }

  try {
    const platform = await getPlatformAsync();
    const suggestions = await platform.api.geocode(query);
    const suggestion = suggestions[0];
    if (!suggestion || !Number.isFinite(suggestion.lat) || !Number.isFinite(suggestion.lng)) {
      return { ...entity, lat: undefined, lng: undefined, geocodedAddressHash: undefined, geocodedAt: undefined };
    }

    return {
      ...entity,
      lat: suggestion.lat,
      lng: suggestion.lng,
      geocodedAddressHash: addressHash,
      geocodedAt: new Date().toISOString(),
    };
  } catch {
    return { ...entity, lat: undefined, lng: undefined, geocodedAddressHash: undefined, geocodedAt: undefined };
  }
}

export function canRouteDistance(pharmacien?: Pharmacien, pharmacie?: Pharmacie): boolean {
  return Boolean(resolveEntityCoordinates(pharmacien) && resolveEntityCoordinates(pharmacie));
}

export function createManualDistanceReference(params: {
  pharmacien: Pharmacien;
  pharmacie: Pharmacie;
  distanceKm: number;
}): DistanceReference {
  const distanceKm = Math.max(0, Math.round(params.distanceKm));
  return createDistanceReference({
    pharmacien: params.pharmacien,
    pharmacie: params.pharmacie,
    distanceKm,
    distanceAllerKm: distanceKm > 0 ? Math.round(distanceKm / 2) : 0,
    source: 'manual',
    provider: 'manual',
  });
}

export async function resolveRouteDistance({
  pharmacien,
  pharmacie,
  state,
  preferRoute = false,
}: {
  pharmacien?: Pharmacien;
  pharmacie?: Pharmacie;
  state: AppState;
  preferRoute?: boolean;
}): Promise<DistanceResolutionResult> {
  if (!pharmacien || !pharmacie) {
    return { status: 'unknown' };
  }

  const cached = findReusableDistanceReference(state, pharmacien, pharmacie);
  if (cached && !preferRoute) {
    return {
      status: cached.source === 'manual' ? 'manual' : 'ready',
      reference: cached,
    };
  }

  if (!canRouteDistance(pharmacien, pharmacie)) {
    return { status: 'missing_coordinates', errorReason: 'Coordonnées manquantes' };
  }

  try {
    const platform = await getPlatformAsync();
    const result = await platform.api.routeDistance({
      fromLat: pharmacien.lat!,
      fromLng: pharmacien.lng!,
      toLat: pharmacie.lat!,
      toLng: pharmacie.lng!,
    });

    if (!result?.distanceKm) {
      return { status: 'routing_failed', errorReason: 'Aucune distance routière retournée' };
    }

    const reference = createDistanceReference({
      pharmacien,
      pharmacie,
      distanceKm: result.distanceKm,
      distanceAllerKm: result.distanceAllerKm,
      source: 'route',
      provider: 'osrm',
    });

    return { status: 'ready', reference };
  } catch (error) {
    return {
      status: 'routing_failed',
      errorReason: error instanceof Error ? error.message : 'Calcul routier impossible',
    };
  }
}

export { buildAddressFingerprint, buildAddressOnlyFingerprint };
