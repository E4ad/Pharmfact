export type ErrorCode =
  | 'PDF_GENERATION_FAILED'
  | 'PDF_SAVE_CANCELED'
  | 'IMPORT_FAILED'
  | 'STORAGE_ERROR'
  | 'DATA_CORRUPTED'
  | 'UNKNOWN_ERROR';

export type UserFacingError = {
  code: ErrorCode;
  message: string;
  severity: 'info' | 'warning' | 'error';
  shouldDisplay: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
};
