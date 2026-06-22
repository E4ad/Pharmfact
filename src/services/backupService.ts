import { APP_SCHEMA_VERSION, type AppState } from '../storage/schema';
import { getAppState, migrateAppState, setAppStateAsync } from '../storage/localStore';
import {
  validateAppStateWithDetails,
  type ValidationError,
  type ValidationWarning,
} from '../storage/validation';
import { getPlatformAsync } from './platformService';
import { buildBackupAuditTrailEntry } from './auditTrail';

const BACKUP_FORMAT = 'pharmfact-backup';

export type BackupFile = {
  filename: string;
  data: string;
  size: number;
  createdAt: string;
};

export type BackupResult = {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  state: AppState;
  warnings: string[];
  errors: string[];
};

type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  metadata: {
    version: number;
    exportedAt: string;
    appVersion: string;
  };
  data: AppState;
};

function timestampForFilename(date = new Date()): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replace(/[:T]/g, '-');
}

function appVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
}

function messages(items: Array<ValidationWarning | ValidationError>): string[] {
  return items.map((item) => (item.path ? `${item.path}: ${item.message}` : item.message));
}

export function createBackup(state: AppState = getAppState(), date = new Date()): BackupFile {
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    metadata: {
      version: state.version,
      exportedAt: date.toISOString(),
      appVersion: appVersion(),
    },
    data: state,
  };
  const data = JSON.stringify(envelope, null, 2);
  return {
    filename: `pharmfact-backup-${timestampForFilename(date)}.json`,
    data,
    size: new Blob([data]).size,
    createdAt: envelope.metadata.exportedAt,
  };
}

export async function downloadBackup(backup: BackupFile): Promise<boolean> {
  const platform = await getPlatformAsync();
  return platform.files.download({
    data: backup.data,
    filename: backup.filename,
    mimeType: 'application/json',
  });
}

export function parseAndValidateBackup(
  json: string,
  currentState: AppState = getAppState(),
): BackupResult {
  try {
    const parsed = JSON.parse(json) as Partial<BackupEnvelope> | AppState;
    const candidate = 'data' in parsed && parsed.data ? parsed.data : parsed;
    const fromVersion = Number((candidate as Partial<AppState>).version || 1);
    const migrated = migrateAppState(candidate);
    const validation = validateAppStateWithDetails(migrated);

    if (!validation.success || !validation.state) {
      return {
        success: false,
        fromVersion,
        toVersion: APP_SCHEMA_VERSION,
        state: currentState,
        warnings: messages(validation.warnings),
        errors: messages(validation.errors),
      };
    }

    return {
      success: true,
      fromVersion,
      toVersion: APP_SCHEMA_VERSION,
      state: validation.state,
      warnings: messages(validation.warnings),
      errors: [],
    };
  } catch {
    return {
      success: false,
      fromVersion: 0,
      toVersion: APP_SCHEMA_VERSION,
      state: currentState,
      warnings: [],
      errors: ['Fichier de sauvegarde illisible ou corrompu.'],
    };
  }
}

export async function loadBackupFromFile(file: File): Promise<BackupResult> {
  return parseAndValidateBackup(await file.text());
}

export async function importBackup(result: BackupResult): Promise<BackupResult> {
  if (!result.success) return result;

  const safetyBackup = createBackup(getAppState());
  try {
    localStorage.setItem(
      `pharmfact:safety-backup:${safetyBackup.createdAt}`,
      JSON.stringify({
        ...safetyBackup,
        filename: `pharmfact-securite-avant-restauration-${timestampForFilename(new Date(safetyBackup.createdAt))}.json`,
      }),
    );
  } catch {
    // La restauration ne doit pas échouer seulement parce que le navigateur bloque localStorage.
  }

  await setAppStateAsync(
    result.state,
    buildBackupAuditTrailEntry('BACKUP_IMPORTED', 'Restauration de sauvegarde locale.'),
  );
  return {
    ...result,
    warnings: [...result.warnings, 'Sauvegarde de sécurité locale créée avant restauration.'],
  };
}
