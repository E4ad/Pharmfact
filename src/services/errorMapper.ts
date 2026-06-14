import type { ErrorCode, UserFacingError } from '../types/errors';

const DEFAULT_ERROR: UserFacingError = {
  code: 'UNKNOWN_ERROR',
  message: 'Une erreur est survenue. Veuillez réessayer.',
  severity: 'error',
  shouldDisplay: true,
  logLevel: 'error',
};

const ERROR_MAP: Array<[string, UserFacingError]> = [
  ['annulé', { code: 'PDF_SAVE_CANCELED', message: 'Opération annulée.', severity: 'info', shouldDisplay: false, logLevel: 'debug' }],
  ['canceled', { code: 'PDF_SAVE_CANCELED', message: 'Opération annulée.', severity: 'info', shouldDisplay: false, logLevel: 'debug' }],
  ['cancelled', { code: 'PDF_SAVE_CANCELED', message: 'Opération annulée.', severity: 'info', shouldDisplay: false, logLevel: 'debug' }],
  ['format pdf invalide', { code: 'PDF_GENERATION_FAILED', message: 'Impossible de générer le PDF. Veuillez réessayer.', severity: 'error', shouldDisplay: true, logLevel: 'error' }],
  ['invalid pdf', { code: 'PDF_GENERATION_FAILED', message: 'Impossible de générer le PDF. Veuillez réessayer.', severity: 'error', shouldDisplay: true, logLevel: 'error' }],
  ['pdf', { code: 'PDF_GENERATION_FAILED', message: 'Impossible de générer le PDF. Veuillez réessayer.', severity: 'error', shouldDisplay: true, logLevel: 'error' }],
  ['sauvegarde', { code: 'STORAGE_ERROR', message: 'Impossible de sauvegarder les données. Veuillez réessayer.', severity: 'error', shouldDisplay: true, logLevel: 'error' }],
  ['backup', { code: 'DATA_CORRUPTED', message: 'Fichier de sauvegarde invalide.', severity: 'error', shouldDisplay: true, logLevel: 'warn' }],
  ['import', { code: 'IMPORT_FAILED', message: 'Import impossible. Vérifiez le fichier.', severity: 'error', shouldDisplay: true, logLevel: 'warn' }],
];

export function mapError(error: unknown, context?: { code?: ErrorCode; message?: string; shouldDisplay?: boolean }): UserFacingError {
  if (typeof error === 'object' && error && 'code' in error && 'message' in error && 'shouldDisplay' in error) {
    return error as UserFacingError;
  }

  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const normalized = rawMessage.toLowerCase();
  const found = ERROR_MAP.find(([needle]) => normalized.includes(needle))?.[1];

  return {
    ...DEFAULT_ERROR,
    ...found,
    code: context?.code ?? found?.code ?? DEFAULT_ERROR.code,
    message: context?.message ?? found?.message ?? DEFAULT_ERROR.message,
    shouldDisplay: context?.shouldDisplay ?? found?.shouldDisplay ?? DEFAULT_ERROR.shouldDisplay,
  };
}

export function logMappedError(mapped: UserFacingError, error: unknown): void {
  if (mapped.logLevel === 'debug') {
    console.debug('[HandledError]', error);
  } else if (mapped.logLevel === 'info') {
    console.info('[HandledError]', error);
  } else if (mapped.logLevel === 'warn') {
    console.warn('[HandledError]', error);
  } else {
    console.error('[HandledError]', error);
  }
}
