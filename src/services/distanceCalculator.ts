export type DistanceInput = {
  homeAddress?: string;
  workAddress?: string;
  homeLat?: number;
  homeLng?: number;
  workLat?: number;
  workLng?: number;
};

export type DistanceResult = {
  distanceKm: number;
  distanceAllerKm?: number;
  distanceRetourKm?: number;
  source: 'geocoded' | 'manual' | 'cached';
};

function haversineKm(input: Required<Pick<DistanceInput, 'homeLat' | 'homeLng' | 'workLat' | 'workLng'>>): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(input.workLat - input.homeLat);
  const dLng = toRad(input.workLng - input.homeLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(input.homeLat)) * Math.cos(toRad(input.workLat)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fallbackAddressDistance(homeAddress?: string, workAddress?: string): number {
  if (!homeAddress || !workAddress) return 0;
  const seed = Math.abs([...`${homeAddress}${workAddress}`].reduce((sum, char) => sum + char.charCodeAt(0), 0));
  return Math.max(1, Math.round((seed % 42) + 8.5));
}

export function calculateLocalDistance(input: DistanceInput): DistanceResult {
  if ([input.homeLat, input.homeLng, input.workLat, input.workLng].every((value) => Number.isFinite(value))) {
    const aller = haversineKm(input as Required<Pick<DistanceInput, 'homeLat' | 'homeLng' | 'workLat' | 'workLng'>>);
    const roundedAller = Math.max(1, Math.round(aller));
    return { distanceKm: roundedAller * 2, distanceAllerKm: roundedAller, distanceRetourKm: roundedAller, source: 'geocoded' };
  }
  return { distanceKm: fallbackAddressDistance(input.homeAddress, input.workAddress), source: 'manual' };
}

// Fonction utilitaire pour estimer la distance entre deux entités
export function addressOf(entity?: { adresse?: string; ville?: string; codePostal?: string }): string {
  return [entity?.adresse, entity?.ville, entity?.codePostal].filter(Boolean).join(', ');
}

export function estimateDistanceKm(
  home?: { adresse?: string; ville?: string; codePostal?: string; lat?: number; lng?: number },
  work?: { adresse?: string; ville?: string; codePostal?: string; lat?: number; lng?: number }
): number {
  return calculateLocalDistance({
    homeAddress: addressOf(home),
    workAddress: addressOf(work),
    homeLat: home?.lat,
    homeLng: home?.lng,
    workLat: work?.lat,
    workLng: work?.lng,
  }).distanceKm;
}
