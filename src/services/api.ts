export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function assertBackendAvailable(): Promise<void> {
  try {
    const response = await fetch(apiUrl('/health'));
    if (!response.ok) throw new Error(`Healthcheck failed: ${response.status}`);
  } catch (error) {
    console.error('[qa-backend-healthcheck-failed]', error);
    const unavailable = new Error('Serveur API inaccessible');
    unavailable.name = 'BACKEND_UNAVAILABLE';
    throw unavailable;
  }
}
