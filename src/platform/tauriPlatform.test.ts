import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

import { tauriPlatform } from './tauriPlatform';

describe('tauriPlatform storage', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it('loads missing native state as null', async () => {
    mocks.invoke.mockResolvedValueOnce('null');

    await expect(tauriPlatform.storage.loadState()).resolves.toBeNull();
    expect(mocks.invoke).toHaveBeenCalledWith('load_state');
  });

  it('loads native state through the Rust command', async () => {
    const state = { version: 3, pharmaciens: [], pharmacies: [], missions: [] };
    mocks.invoke.mockResolvedValueOnce(JSON.stringify(state));

    await expect(tauriPlatform.storage.loadState()).resolves.toMatchObject(state);
    expect(mocks.invoke).toHaveBeenCalledWith('load_state');
  });

  it('surfaces invalid native state as a load error', async () => {
    mocks.invoke.mockResolvedValueOnce('{invalid');

    await expect(tauriPlatform.storage.loadState()).rejects.toThrow('Impossible de charger les données locales');
  });

  it('saves native state through the Rust command', async () => {
    const state = { version: 3, pharmaciens: [] };
    mocks.invoke.mockResolvedValueOnce(undefined);

    await tauriPlatform.storage.saveState(state as any);

    expect(mocks.invoke).toHaveBeenCalledWith('save_state', {
      state: JSON.stringify(state, null, 2),
    });
  });
});
