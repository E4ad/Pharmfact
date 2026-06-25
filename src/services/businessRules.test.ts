import { describe, expect, it } from 'vitest';
import { buildBusinessAlerts, deriveMissionBusinessStatus, missionsReadyToInvoice } from './businessRules';
import { createInvoiceFromMissions } from './invoiceWorkflow';
import type { AppState, Mission } from '../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';

function mission(id: string, pharmacieId = 'pha1', patch: Partial<Mission> = {}): Mission {
  return {
    id,
    missionCode: id.toUpperCase(),
    pharmacienId: 'ph1',
    pharmacieId,
    status: 'COMPLETED',
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: '2026-06-01',
    dateFin: '2026-06-01',
    days: [{ id: `${id}-day`, dateService: '2026-06-01', startTime: '09:00', endTime: '17:00', unpaidBreakMinutes: 30, description: 'Remplacement', hours: 7.5, expenses: [] }],
    hourlyRateCents: 10000,
    mealFeeCents: 0,
    mileageKm: 0,
    mileageRateCents: 0,
    totalHours: 7.5,
    subtotalCents: 75000,
    mealTotalCents: 0,
    mileageTotalCents: 0,
    totalCents: 75000,
    events: [],
    createdAt: '',
    updatedAt: '',
    ...patch,
  };
}

function state(patch: Partial<AppState> = {}): AppState {
  return {
    version: 3,
    activePharmacienId: 'ph1',
    pharmaciens: [{ id: 'ph1', nom: 'A', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 10000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
    pharmacies: [{ id: 'pha1', nom: 'P1', adresse: '', ville: '', codePostal: '', telephone: '', email: '', defaultBreakMinutes: 30 }],
    missions: [],
    invoices: [],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: createDefaultFiscalSettings(2026),
    distanceReferences: [],
    opqPharmacistRegistry: { entries: [], sourceUrl: '' },
    appOptions: createDefaultAppOptions(),
    uiSettings: { themeMode: 'system' },
    localDataSettings: { autoBackupEnabled: true },
    ui: { missionFilters: {} },
    ...patch,
  };
}

describe('businessRules', () => {
  it('returns completed missions without invoice', () => {
    const appState = state({ missions: [mission('mis1')] });
    expect(missionsReadyToInvoice(appState).map((item) => item.id)).toEqual(['mis1']);
  });

  it('derives invoice-driven mission status', () => {
    const item = mission('mis1');
    expect(deriveMissionBusinessStatus(item)).toBe('completed');
    expect(deriveMissionBusinessStatus(item, { id: 'inv1', numero: 'F1', missionIds: ['mis1'], pharmacienId: 'ph1', pharmacieId: 'pha1', dateFacture: '2026-06-01', dateEcheance: '2026-07-01', status: 'SENT', paymentStatus: 'to_collect', hours: 7.5, amountCents: 75000, createdAt: '' })).toBe('sent');
  });

  it('creates a multi-mission invoice for one pharmacy', () => {
    const appState = state({ missions: [mission('mis1'), mission('mis2')] });
    const invoice = createInvoiceFromMissions(appState.missions, appState);
    expect(invoice.missionIds).toEqual(['mis1', 'mis2']);
    expect(invoice.amountCents).toBe(150000);
    expect(invoice.smallSupplierMention).toContain('Petit fournisseur');
  });

  it('rejects multi-mission invoice across pharmacies', () => {
    const appState = state({ missions: [mission('mis1', 'pha1'), mission('mis2', 'pha2')] });
    expect(() => createInvoiceFromMissions(appState.missions, appState)).toThrow(/une seule pharmacie/i);
  });

  it('emits requested anti-error alerts', () => {
    const appState = state({
      missions: [mission('mis1', 'pha1', { hourlyRateCents: 0, dateFin: '2026-05-31' })],
      invoices: [
        { id: 'inv1', numero: 'F1', missionIds: ['misx'], pharmacienId: 'ph1', pharmacieId: '', dateFacture: '2026-06-10', dateEcheance: '2026-06-01', status: 'sent', paymentStatus: 'to_collect', hours: 1, amountCents: 10000, createdAt: '' },
        { id: 'inv2', numero: 'F1', missionIds: ['misy'], pharmacienId: 'ph1', pharmacieId: 'pha1', dateFacture: '2026-06-01', dateEcheance: '2026-06-30', status: 'sent', paymentStatus: 'to_collect', hours: -1, amountCents: 0, createdAt: '' },
      ],
    });
    const ids = buildBusinessAlerts(appState, '2026-07-01').map((alert) => alert.id);
    expect(ids).toContain('mission-not-invoiced-mis1');
    expect(ids).toContain('mission-rate-mis1');
    expect(ids).toContain('mission-date-mis1');
    expect(ids).toContain('invoice-no-client-inv1');
    expect(ids).toContain('invoice-duplicate-inv1');
    expect(ids).toContain('invoice-overdue-inv1');
    expect(ids).toContain('invoice-date-inv1');
    expect(ids).toContain('invoice-amount-inv2');
  });
});

