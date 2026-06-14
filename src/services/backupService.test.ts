import { describe, expect, it } from 'vitest';
import { createSeedState } from '../storage/seedData';
import { createBackup, parseAndValidateBackup } from './backupService';

describe('backupService', () => {
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
});
