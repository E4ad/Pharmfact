import { updateAppState, useAppState } from '../storage/localStore';
import type { FiscalSettings } from '../storage/schema';

export function useFinancialSettings(): FiscalSettings {
  return useAppState().fiscalSettings;
}

export function updateFinancialSettings(updater: (settings: FiscalSettings) => FiscalSettings): void {
  updateAppState((state) => {
    const nextSettings = updater(state.fiscalSettings);
    return {
      ...state,
      fiscalSettings: {
        ...nextSettings,
        currentYear: nextSettings.currentFiscalYear,
        federalDefaultNetTaxOwingThresholdCents: nextSettings.federalNetTaxOwingThresholdCents,
      },
    };
  });
}
