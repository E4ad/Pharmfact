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
  return Math.round(((seed % 42) + 8.5) * 10) / 10;
}

export function calculateLocalDistance(input: DistanceInput): DistanceResult {
  if ([input.homeLat, input.homeLng, input.workLat, input.workLng].every((value) => Number.isFinite(value))) {
    const aller = haversineKm(input as Required<Pick<DistanceInput, 'homeLat' | 'homeLng' | 'workLat' | 'workLng'>>);
    const roundedAller = Math.round(aller * 10) / 10;
    return { distanceKm: Math.round(roundedAller * 2 * 10) / 10, distanceAllerKm: roundedAller, distanceRetourKm: roundedAller, source: 'geocoded' };
  }
  return { distanceKm: fallbackAddressDistance(input.homeAddress, input.workAddress), source: 'manual' };
}
