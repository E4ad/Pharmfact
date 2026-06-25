import { describe, expect, it } from 'vitest';
import { buildSmallSupplierSnapshot } from './smallSupplier';
import type { AppState } from '../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';

function state(amounts: number[], thresholdCents = 100000): AppState {
  return {
    version: 3,
    activePharmacienId: null,
    pharmaciens: [],
    pharmacies: [],
    missions: [],
    invoices: amounts.map((amount, index) => ({
      id: `inv${index}`,
      numero: `F${index}`,
      missionIds: [],
      missionId: 'mis1',
      pharmacienId: 'ph1',
      pharmacieId: 'pha1',
      dateFacture: `2026-0${index + 1}-01`,
      dateEcheance: `2026-0${index + 1}-28`,
      status: 'sent',
      paymentStatus: 'to_collect',
      hours: 1,
      amountCents: amount,
      paidAmountCents: 0,
      balanceDue: amount,
      createdAt: '',
    })),
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: { ...createDefaultFiscalSettings(2026), smallSupplierThresholdCents: thresholdCents, smallSupplierWarningRate: 0.8 },
    distanceReferences: [],
    opqPharmacistRegistry: { entries: [], sourceUrl: '' },
    appOptions: createDefaultAppOptions(),
    uiSettings: { themeMode: 'system' },
    localDataSettings: { autoBackupEnabled: true },
    ui: { missionFilters: {} },
  };
}

describe('smallSupplier', () => {
  it('reports normal, warning and exceeded states', () => {
    expect(buildSmallSupplierSnapshot(state([10000]), '2026-06-30').status).toBe('normal');
    expect(buildSmallSupplierSnapshot(state([40000, 40000]), '2026-06-30').status).toBe('warning');
    expect(buildSmallSupplierSnapshot(state([60000, 50000]), '2026-06-30').status).toBe('exceeded');
  });
});

