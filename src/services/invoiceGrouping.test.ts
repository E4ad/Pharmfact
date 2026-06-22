import { describe, expect, it } from 'vitest';
import type { AppState, Mission } from '../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';
import { createInvoiceFromMissions } from './invoiceWorkflow';
import { mergeGeneratedInvoices, splitGeneratedInvoiceMissions } from './invoiceGrouping';

function mission(id: string, code: string, totalCents: number): Mission {
  return {
    id,
    missionCode: code,
    pharmacienId: 'ph_1',
    pharmacieId: 'pha_1',
    status: 'COMPLETED',
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: '2026-06-01',
    dateFin: '2026-06-01',
    days: [
      {
        id: `${id}-day`,
        dateService: '2026-06-01',
        startTime: '08:00',
        endTime: '16:00',
        unpaidBreakMinutes: 60,
        description: 'Mission',
        hours: 7,
        expenses: [],
      },
    ],
    hourlyRateCents: 8000,
    mealFeeCents: 0,
    mileageKm: 0,
    mileageRateCents: 61,
    totalHours: 7,
    subtotalCents: totalCents,
    mealTotalCents: 0,
    mileageTotalCents: 0,
    totalCents,
    events: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}

function baseState(missions: Mission[]): AppState {
  return {
    version: 3,
    activePharmacienId: 'ph_1',
    pharmaciens: [{ id: 'ph_1', nom: 'QA Pharmacien', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 8000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
    pharmacies: [{ id: 'pha_1', nom: 'QA Pharmacie', adresse: '', ville: '', codePostal: '', telephone: '', email: '', defaultBreakMinutes: 60 }],
    missions,
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
  };
}

describe('invoiceGrouping', () => {
  it('splits a grouped generated invoice into a new invoice', () => {
    const m1 = mission('mis_1', 'MIS-1', 64000);
    const m2 = mission('mis_2', 'MIS-2', 72000);
    const state = baseState([m1, m2]);
    const groupedInvoice = createInvoiceFromMissions([m1, m2], state);
    const groupedState = {
      ...state,
      missions: [
        { ...m1, invoiceId: groupedInvoice.id },
        { ...m2, invoiceId: groupedInvoice.id },
      ],
      invoices: [groupedInvoice],
    };

    const result = splitGeneratedInvoiceMissions(groupedState, groupedInvoice.id, ['mis_2']);

    expect(result.state.invoices).toHaveLength(2);
    expect(result.newInvoice.missionIds).toEqual(['mis_2']);
    expect(result.state.invoices.find((invoice) => invoice.id === groupedInvoice.id)?.missionIds).toEqual(['mis_1']);
    expect(result.state.missions.find((mission) => mission.id === 'mis_2')?.invoiceId).toBe(result.newInvoice.id);
  });

  it('regroups generated invoices only when they target the same pharmacy', () => {
    const m1 = mission('mis_1', 'MIS-1', 64000);
    const m2 = mission('mis_2', 'MIS-2', 72000);
    const state = baseState([m1, m2]);
    const inv1 = createInvoiceFromMissions([m1], state);
    const stateWithFirstInvoice = { ...state, invoices: [inv1] };
    const inv2 = createInvoiceFromMissions([m2], stateWithFirstInvoice);
    const invoiceState = {
      ...state,
      missions: [
        { ...m1, invoiceId: inv1.id },
        { ...m2, invoiceId: inv2.id },
      ],
      invoices: [inv1, inv2],
    };

    const result = mergeGeneratedInvoices(invoiceState, [inv1.id, inv2.id]);

    expect(result.state.invoices).toHaveLength(1);
    expect(result.newInvoice.missionIds).toEqual(['mis_1', 'mis_2']);
    expect(result.state.missions.every((mission) => mission.invoiceId === result.newInvoice.id)).toBe(true);
  });
});
