export type LocalDataSettings = {
  autoBackupEnabled: boolean;
};

export function createDefaultLocalDataSettings(): LocalDataSettings {
  return {
    autoBackupEnabled: true,
  };
}