import { useEffect, useMemo, useState } from 'react';
import { getPlatform } from '../services/platformService';

export type GeocodeSuggestion = {
  displayName: string;
  addressLine?: string;
  city?: string;
  province?: string;
  postcode?: string;
  countryCode?: string;
  road?: string;
  houseNumber?: string;
  lat?: number;
  lng?: number;
  source?: string;
};

export function normalizeSuggestion(raw: unknown): GeocodeSuggestion | null {
  const item = raw as Record<string, unknown>;
  const displayName = String(item.displayName ?? item.display_name ?? item.label ?? '');
  if (!displayName) return null;
  const address = (item.address ?? {}) as Record<string, unknown>;
  const lat = Number(item.lat);
  const lng = Number(item.lng ?? item.lon);
  return {
    displayName,
    addressLine: String(item.addressLine ?? item.address_line ?? ''),
    city: String(item.city ?? address.city ?? address.town ?? address.village ?? ''),
    province: String(item.province ?? address.state ?? ''),
    postcode: String(item.postcode ?? address.postcode ?? ''),
    countryCode: String(item.countryCode ?? item.country_code ?? address.country_code ?? ''),
    road: String(item.road ?? address.road ?? ''),
    houseNumber: String(item.houseNumber ?? item.house_number ?? address.house_number ?? ''),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    source: String(item.source ?? ''),
  };
}

function isQuebecSuggestion(suggestion: GeocodeSuggestion): boolean {
  const province = suggestion.province?.toLowerCase() ?? '';
  const countryCode = suggestion.countryCode?.toLowerCase() ?? '';
  const display = suggestion.displayName.toLowerCase();
  return (countryCode === '' || countryCode === 'ca') && (
    province.includes('québec') ||
    province.includes('quebec') ||
    display.includes('québec') ||
    display.includes('quebec')
  );
}

export function useAddressAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (normalizedQuery.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      
      // Utiliser l'adapter de plateforme pour le géocodage
      getPlatform().api.geocode(normalizedQuery)
        .then((suggestions) => {
          setSuggestions(
            suggestions
              .map(normalizeSuggestion)
              .filter((suggestion): suggestion is GeocodeSuggestion => Boolean(suggestion?.lat) && Boolean(suggestion?.lng))
              .filter(isQuebecSuggestion)
              .slice(0, 6)
          );
        })
        .catch((fetchError) => {
          if (fetchError.name !== 'AbortError') {
            setSuggestions([]);
            setError('Aucune suggestion disponible. La saisie manuelle reste possible.');
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedQuery]);

  return { suggestions, loading, error };
}
