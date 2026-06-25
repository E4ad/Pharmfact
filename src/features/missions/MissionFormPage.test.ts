import { describe, expect, it } from 'vitest';
import type { AppState, Invoice, Mission } from '../../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../../storage/seedData';
import { buildNextMissionState } from './MissionFormPage';

function mission(patch: Partial<Mission> = {}): Mission {
  return {
    id: 'mis_regen',
    missionCode: 'MIS-REGEN',
    pharmacienId: 'ph_regen',
    pharmacieId: 'pha_regen',
    status: 'COMPLETED',
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: '2026-06-05',
    dateFin: '2026-06-05',
    days: [{ id: 'day_regen', dateService: '2026-06-05', startTime: '08:00', endTime: '17:00', unpaidBreakMinutes: 60, description: 'Mission', hours: 8, expenses: [] }],
    hourlyRateCents: 8000,
    mealFeeCents: 0,
    mileageKm: 0,
    mileageRateCents: 61,
    totalHours: 8,
    subtotalCents: 64000,
    mealTotalCents: 0,
    mileageTotalCents: 0,
    totalCents: 64000,
    events: [],
    createdAt: '2026-06-05T00:00:00.000Z',
    updatedAt: '2026-06-05T00:00:00.000Z',
    invoiceId: 'inv_regen',
    ...patch,
  };
}

const invoice: Invoice = {
  id: 'inv_regen',
  numero: 'FAC-2026-REGEN',
  missionId: 'mis_regen',
  missionIds: ['mis_regen'],
  pharmacienId: 'ph_regen',
  pharmacieId: 'pha_regen',
  dateFacture: '2026-06-06',
  dateEcheance: '2026-07-06',
  status: 'SENT',
  paymentStatus: 'to_collect',
  hours: 8,
  amountCents: 64000,
  createdAt: '2026-06-06T00:00:00.000Z',
};

const paidInvoice: Invoice = {
  ...invoice,
  id: 'inv_paid',
  numero: 'FAC-2026-PAID',
  status: 'PAID',
  paymentStatus: 'paid',
  paidAt: '2026-06-10',
};

function state(existing: Mission): AppState {
  return {
    version: 3,
    activePharmacienId: 'ph_regen',
    pharmaciens: [{ id: 'ph_regen', nom: 'QA Pharmacien', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 8000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
    pharmacies: [{ id: 'pha_regen', nom: 'QA Pharmacie', adresse: '', ville: '', codePostal: '', telephone: '', email: '', defaultBreakMinutes: 60 }],
    missions: [existing],
    invoices: [invoice],
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

describe('MissionFormPage buildNextMissionState', () => {
  it('updates the linked invoice when regenerating a sent mission', () => {
    const existing = mission();
    const finalMission = mission({ totalHours: 9, subtotalCents: 72000, totalCents: 72000 });

    const result = buildNextMissionState({
      current: state(existing),
      mode: 'edit',
      existing,
      action: 'save_regenerate',
      finalMission,
      pendingReceipts: [],
    });

    expect(result.regeneratedInvoice?.amountCents).toBe(72000);
    expect(result.state.invoices[0].amountCents).toBe(72000);
    expect(result.state.invoices[0].hours).toBe(9);
  });

  it('creates a corrected version for paid missions without altering the paid invoice', () => {
    const existing = mission({ invoiceId: paidInvoice.id });
    const correctedState = state(existing);
    correctedState.invoices = [paidInvoice];
    const finalMission = mission({ invoiceId: paidInvoice.id, totalHours: 9, subtotalCents: 72000, totalCents: 72000 });

    const result = buildNextMissionState({
      current: correctedState,
      mode: 'edit',
      existing,
      action: 'create_corrected_version',
      finalMission,
      pendingReceipts: [],
    });

    expect(result.regeneratedInvoice?.status).toBe('draft');
    expect(result.regeneratedInvoice?.correctedFromInvoiceId).toBe(paidInvoice.id);
    expect(result.state.invoices).toHaveLength(2);
    expect(result.state.invoices[0]).toBe(paidInvoice);
    expect(result.state.missions[0].invoiceId).toBe(result.regeneratedInvoice?.id);
    expect(result.state.missions[0].events.at(-1)?.label).toContain('Version corrigée');
  });
});
