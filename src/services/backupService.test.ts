import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeedState } from '../storage/seedData';
import { getAppState } from '../storage/localStore';
import { createBackup, importBackup, parseAndValidateBackup } from './backupService';

vi.mock('./platformService', () => ({
  getPlatformAsync: vi.fn(async () => ({
    files: {
      download: vi.fn(async () => true),
    },
  })),
}));

describe('backupService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a versioned backup envelope', () => {
    const state = createSeedState();
    const backup = createBackup(state, new Date('2026-06-14T12:00:00Z'));
    const parsed = JSON.parse(backup.data);

    expect(backup.filename).toBe('pharmfact-backup-2026-06-14-12-00-00.json');
    expect(parsed.format).toBe('pharmfact-backup');
    expect(parsed.metadata.version).toBe(state.version);
    expect(parsed.data).toMatchObject({ version: state.version });
  });

  it('parses valid backup envelopes', () => {
    const state = createSeedState();
    const result = parseAndValidateBackup(createBackup(state).data, state);

    expect(result.success).toBe(true);
    expect(result.state.version).toBe(state.version);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid json', () => {
    const state = createSeedState();
    const result = parseAndValidateBackup('{bad json', state);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('illisible');
  });

  it('imports without forcing a downloaded safety backup', async () => {
    const state = createSeedState();
    const result = parseAndValidateBackup(createBackup(state).data, state);
    const restored = await importBackup(result);

    expect(restored.success).toBe(true);
    expect(
      restored.warnings.some((warning) => warning.includes('Sauvegarde de sécurité locale')),
    ).toBe(true);
  });

  it('records a backup restoration in the audit trail', async () => {
    const state = createSeedState();
    const result = parseAndValidateBackup(createBackup(state).data, state);
    await importBackup(result);

    const restoredState = getAppState();
    expect(restoredState.ui.auditTrail?.[0].eventType).toBe('BACKUP_IMPORTED');
    expect(restoredState.ui.auditTrail?.[0].scope).toBe('backup');
  });
});
