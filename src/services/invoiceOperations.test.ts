import { describe, expect, it } from 'vitest';
import {
  buildInvoiceOperationalRows,
  buildInvoiceOperationalSummary,
  filterInvoiceRows,
  invoiceConsistencyIssues,
} from './invoiceOperations';
import type { AppState, Invoice, Mission } from '../storage/schema';
import { createDefaultAppOptions, createDefaultFiscalSettings } from '../storage/seedData';

function mission(id: string, patch: Partial<Mission> = {}): Mission {
  return {
    id,
    missionCode: id.toUpperCase(),
    pharmacienId: 'ph1',
    pharmacieId: 'pha1',
    status: 'COMPLETED',
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: '2026-06-01',
    dateFin: '2026-06-01',
    days: [
      {
        id: `${id}-day`,
        dateService: '2026-06-01',
        startTime: '09:00',
        endTime: '17:00',
        unpaidBreakMinutes: 30,
        description: 'Remplacement',
        hours: 7.5,
        expenses: [],
      },
    ],
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

function invoice(id: string, patch: Partial<Invoice> = {}): Invoice {
  return {
    id,
    numero: id.toUpperCase(),
    missionIds: ['mis1'],
    missionId: 'mis1',
    pharmacienId: 'ph1',
    pharmacieId: 'pha1',
    dateFacture: '2026-06-01',
    dateEcheance: '2026-06-30',
    status: 'SENT',
    hours: 7.5,
    amountCents: 75000,
    createdAt: '',
    ...patch,
  };
}

function state(patch: Partial<AppState> = {}): AppState {
  return {
    version: 3,
    activePharmacienId: 'ph1',
    pharmaciens: [
      {
        id: 'ph1',
        nom: 'A',
        adresse: '',
        ville: '',
        codePostal: '',
        telephone: '',
        email: '',
        hourlyRateCents: 10000,
        distanceKmDomicile: 0,
        taxStatus: 'SMALL_SUPPLIER',
      },
    ],
    pharmacies: [
      {
        id: 'pha1',
        nom: 'P1',
        adresse: '',
        ville: '',
        codePostal: '',
        telephone: '',
        email: '',
        defaultBreakMinutes: 30,
      },
    ],
    missions: [mission('mis1')],
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

describe('invoiceOperations', () => {
  it('detects mismatches between an invoice and linked missions', () => {
    const issues = invoiceConsistencyIssues(invoice('inv1', { amountCents: 80000, hours: 8 }), [
      mission('mis1'),
    ]);

    expect(issues.map((issue) => issue.id)).toEqual(['hours-mismatch', 'amount-mismatch']);
  });

  it('prioritizes blocking and overdue invoices before stable rows', () => {
    const appState = state({
      invoices: [
        invoice('paid', { status: 'PAID', dateEcheance: '2026-06-10' }),
        invoice('overdue', { status: 'SENT', dateEcheance: '2026-06-10' }),
        invoice('missing', { missionIds: ['missing'], missionId: 'missing', status: 'GENERATED' }),
      ],
    });

    const rows = buildInvoiceOperationalRows(appState, '2026-06-20');

    expect(rows.map((row) => row.invoice.id)).toEqual(['missing', 'overdue', 'paid']);
    expect(rows[0].priorityLabel).toBe('Bloquant');
    expect(rows[1].isOverdue).toBe(true);
  });

  it('summarizes operational queues and filters them', () => {
    const rows = buildInvoiceOperationalRows(
      state({
        invoices: [
          invoice('draft', { status: 'GENERATED', amountCents: 10000 }),
          invoice('sent', { status: 'SENT', amountCents: 20000, dateEcheance: '2026-06-30' }),
          invoice('late', { status: 'SENT', amountCents: 30000, dateEcheance: '2026-06-01' }),
          invoice('paid', { status: 'PAID', amountCents: 40000 }),
          invoice('original', { status: 'PAID', correctedFromInvoiceId: undefined }),
          invoice('corrected', {
            status: 'GENERATED',
            correctedFromInvoiceId: 'original',
            numero: 'CORR-1',
          }),
        ],
      }),
      '2026-06-20',
    );

    const summary = buildInvoiceOperationalSummary(rows);

    expect(summary.toSendCount).toBe(2);
    expect(summary.sentCount).toBe(2);
    expect(summary.overdueCents).toBe(30000);
    expect(summary.receivableCents).toBe(50000);
    expect(filterInvoiceRows(rows, 'overdue').map((row) => row.invoice.id)).toEqual(['late']);
    expect(filterInvoiceRows(rows, 'to_send').map((row) => row.invoice.id)).toEqual(['draft', 'corrected']);
    expect(filterInvoiceRows(rows, 'corrected_versions').map((row) => row.invoice.id)).toEqual(['corrected']);
    expect(filterInvoiceRows(rows, 'corrected_originals').map((row) => row.invoice.id)).toEqual(['original']);
    expect(summary.correctedVersionCount).toBe(1);
    expect(summary.correctedOriginalCount).toBe(1);
  });
});
