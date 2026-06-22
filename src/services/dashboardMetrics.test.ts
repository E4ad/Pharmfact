import { describe, expect, test } from 'vitest';
import { buildHomeMetricSnapshots, buildInvoicePipelineMetrics, buildMissionWindowMetrics, buildPharmacyMetrics } from './dashboardMetrics';
import { metricDefinitions } from './metricCatalog';
import type { AppState } from '../storage/schema';

function createState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 3,
    activePharmacienId: null,
    pharmaciens: [],
    pharmacies: [],
    missions: [],
    invoices: [],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: {
      reserveRate: 0.3,
      fiscalYearStartMonth: 1,
      currentFiscalYear: 2026,
      smallSupplierThresholdCents: 50_000,
      smallSupplierWarningRate: 0.8,
      instalmentDates: [],
      quebecNetTaxOwingThresholdCents: 30_000,
      federalNetTaxOwingThresholdCents: 30_000,
      federalDefaultNetTaxOwingThresholdCents: 30_000,
      currentYear: 2026,
      defaultTaxStatus: 'SMALL_SUPPLIER',
      includeMissionDeductibleExpenses: true,
      trackExpenseReceipts: true,
      warnMissingExpenseReceipts: true,
      showMonthlyView: true,
      showQuarterlyView: true,
      showAnnualView: true,
      enableInstalmentTracking: true,
      enableSmallSupplierTracking: true,
      enableExpenseTracking: true,
    },
    distanceReferences: [],
    opqPharmacistRegistry: { entries: [], sourceUrl: 'https://example.test' },
    appOptions: {
      missionDefaults: {
        defaultMissionType: 'REMPLACEMENT_OFFICINE',
        defaultStartTime: '09:00',
        defaultEndTime: '17:00',
        defaultBreakMinutes: 60,
        mealAutoEnabled: true,
        mealThresholdHours: 6,
        mealDefaultCents: 1500,
        mileageRateCents: 70,
      },
      invoiceDefaults: { invoiceDueDays: 30 },
      pdfCalendar: {
        calendarIcsEnabled: true,
        pdfFooterEnabled: true,
        calendarEventTitle: 'Mission',
        calendarReminder: 'NONE',
      },
    },
    uiSettings: { themeMode: 'system' },
    localDataSettings: { autoBackupEnabled: true },
    ui: { missionFilters: {} },
    ...overrides,
  };
}

describe('dashboard metrics', () => {
  test('keeps the seven-day mission window inclusive', () => {
    const state = createState({
      missions: [
        {
          id: 'm1',
          missionCode: 'MIS-001',
          pharmacienId: 'ph1',
          pharmacieId: 'pha1',
          status: 'CONFIRMED',
          dateDebut: '2026-06-20',
          dateFin: '2026-06-20',
          days: [],
          hourlyRateCents: 10000,
          mealFeeCents: 0,
          mileageKm: 0,
          mileageRateCents: 0,
          totalHours: 8,
          subtotalCents: 80000,
          mealTotalCents: 0,
          mileageTotalCents: 0,
          totalCents: 80000,
          events: [],
          createdAt: '2026-06-20',
          updatedAt: '2026-06-20',
        } as never,
        {
          id: 'm2',
          missionCode: 'MIS-002',
          pharmacienId: 'ph1',
          pharmacieId: 'pha1',
          status: 'CONFIRMED',
          dateDebut: '2026-06-27',
          dateFin: '2026-06-27',
          days: [],
          hourlyRateCents: 10000,
          mealFeeCents: 0,
          mileageKm: 0,
          mileageRateCents: 0,
          totalHours: 8,
          subtotalCents: 80000,
          mealTotalCents: 0,
          mileageTotalCents: 0,
          totalCents: 80000,
          events: [],
          createdAt: '2026-06-20',
          updatedAt: '2026-06-20',
        } as never,
        {
          id: 'm3',
          missionCode: 'MIS-003',
          pharmacienId: 'ph1',
          pharmacieId: 'pha1',
          status: 'ARCHIVED',
          dateDebut: '2026-06-22',
          dateFin: '2026-06-22',
          days: [],
          hourlyRateCents: 10000,
          mealFeeCents: 0,
          mileageKm: 0,
          mileageRateCents: 0,
          totalHours: 8,
          subtotalCents: 80000,
          mealTotalCents: 0,
          mileageTotalCents: 0,
          totalCents: 80000,
          events: [],
          createdAt: '2026-06-20',
          updatedAt: '2026-06-20',
        } as never,
      ],
    });

    const metrics = buildMissionWindowMetrics(state, '2026-06-20');

    expect(metrics.windowEndIso).toBe('2026-06-27');
    expect(metrics.upcomingCount).toBe(2);
    expect(metrics.estimatedCents).toBe(160000);
  });

  test('counts generated and sent invoices as receivable and separates overdue ones', () => {
    const state = createState({
      invoices: [
        {
          id: 'i1',
          numero: 'FAC-001',
          dateFacture: '2026-06-01',
          dateEcheance: '2026-06-15',
          status: 'GENERATED',
          amountCents: 10000,
          missionId: 'm1',
          pharmacieId: 'pha1',
          pharmacienId: 'ph1',
          hours: 8,
          createdAt: '2026-06-01',
        } as never,
        {
          id: 'i2',
          numero: 'FAC-002',
          dateFacture: '2026-06-01',
          dateEcheance: '2026-06-15',
          status: 'SENT',
          amountCents: 20000,
          missionId: 'm1',
          pharmacieId: 'pha1',
          pharmacienId: 'ph1',
          hours: 8,
          createdAt: '2026-06-01',
        } as never,
        {
          id: 'i3',
          numero: 'FAC-003',
          dateFacture: '2026-06-01',
          dateEcheance: '2026-06-15',
          status: 'PAID',
          amountCents: 30000,
          missionId: 'm1',
          pharmacieId: 'pha1',
          pharmacienId: 'ph1',
          hours: 8,
          createdAt: '2026-06-01',
        } as never,
        {
          id: 'i4',
          numero: 'FAC-004',
          dateFacture: '2026-06-01',
          dateEcheance: '2026-06-15',
          status: 'SENT',
          amountCents: 40000,
          missionId: 'm1',
          pharmacieId: 'pha1',
          pharmacienId: 'ph1',
          hours: 8,
          createdAt: '2026-06-01',
        } as never,
      ],
    });

    const metrics = buildInvoicePipelineMetrics(state, '2026-06-20');

    expect(metrics.toSendCount).toBe(1);
    expect(metrics.receivableCount).toBe(3);
    expect(metrics.receivableCents).toBe(70000);
    expect(metrics.overdueCount).toBe(2);
    expect(metrics.toVerifyCount).toBeGreaterThanOrEqual(0);
  });

  test('exposes pharmacy row metrics and catalog definitions', () => {
    const state = createState({
      missions: [
        {
          id: 'm1',
          missionCode: 'MIS-001',
          pharmacienId: 'ph1',
          pharmacieId: 'pha1',
          status: 'COMPLETED',
          dateDebut: '2026-06-20',
          dateFin: '2026-06-21',
          days: [],
          hourlyRateCents: 10000,
          mealFeeCents: 0,
          mileageKm: 0,
          mileageRateCents: 0,
          totalHours: 8,
          subtotalCents: 80000,
          mealTotalCents: 0,
          mileageTotalCents: 0,
          totalCents: 80000,
          events: [],
          createdAt: '2026-06-20',
          updatedAt: '2026-06-20',
        } as never,
      ],
      invoices: [
        {
          id: 'i1',
          numero: 'FAC-001',
          dateFacture: '2026-06-20',
          dateEcheance: '2026-07-20',
          status: 'SENT',
          amountCents: 25000,
          missionId: 'm1',
          pharmacieId: 'pha1',
          pharmacienId: 'ph1',
          hours: 8,
          createdAt: '2026-06-20',
        } as never,
      ],
    });

    const pharmacy = {
      id: 'pha1',
      nom: 'Pharmacie Centrale',
      displayLabel: 'Pharmacie Centrale',
      adresse: '1 rue Principale',
      ville: 'Montréal',
      codePostal: 'H1H1H1',
      telephone: '',
      email: '',
      defaultBreakMinutes: 60,
    } as never;

    const metrics = buildPharmacyMetrics(state, pharmacy);
    const homeMetrics = buildHomeMetricSnapshots(state, '2026-06-20');

    expect(metrics.totalInvoicedCents).toBe(25000);
    expect(metrics.unpaidInvoices).toHaveLength(1);
    expect(homeMetrics).toHaveLength(4);
    expect(metricDefinitions.missionsUpcoming7d.ownerHref).toBe('/missions?filter=upcoming_7d');
    expect(metricDefinitions.invoicesToCollect.isActionable).toBe(true);
    expect(metricDefinitions.invoicesToCollect.interactionMode).toBe('filter');
  });
});
