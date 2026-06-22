import type { AppState, Mission, Pharmacie } from '../storage/schema';
import { addDaysIso } from './ids';
import { buildDataHealthSummary } from './dataHealth';
import { buildInvoiceOperationalRows, buildInvoiceOperationalSummary } from './invoiceOperations';
import { buildSmallSupplierSnapshot } from './smallSupplier';
import { missionsReadyToInvoice } from './businessRules';
import { metricDefinitions } from './metricCatalog';

export type MissionWindowMetrics = {
  windowStartIso: string;
  windowEndIso: string;
  upcomingCount: number;
  estimatedCents: number;
  estimatedHours: number;
  toInvoiceCount: number;
  toInvoiceCents: number;
  upcomingMissions: Mission[];
  toInvoiceMissions: Mission[];
};

export type InvoicePipelineMetrics = {
  toSendCount: number;
  toSendCents: number;
  receivableCount: number;
  receivableCents: number;
  overdueCount: number;
  overdueCents: number;
  toVerifyCount: number;
  paidCount: number;
  paidCents: number;
  archivedCount: number;
};

export type PharmacyMetrics = {
  totalInvoicedCents: number;
  lastMissionDate?: string;
  unpaidInvoices: AppState['invoices'];
};

export type HomeMetricSnapshot = {
  id: keyof typeof metricDefinitions;
  label: string;
  value: string;
  helperText: string;
  ownerHref: string;
};

export function buildMissionWindowMetrics(state: AppState, todayIso: string): MissionWindowMetrics {
  const windowEndIso = addDaysIso(todayIso, 7);
  const upcomingMissions = state.missions.filter((mission) => {
    return (
      mission.status !== 'ARCHIVED' &&
      mission.status !== 'CANCELLED' &&
      mission.dateDebut >= todayIso &&
      mission.dateDebut <= windowEndIso
    );
  });

  const estimatedMissions = state.missions.filter((mission) => {
    return (
      mission.status !== 'ARCHIVED' &&
      mission.status !== 'CANCELLED' &&
      mission.dateDebut <= windowEndIso &&
      mission.dateFin >= todayIso &&
      (mission.status === 'CONFIRMED' || mission.status === 'IN_PROGRESS' || mission.status === 'COMPLETED')
    );
  });

  const toInvoiceMissions = missionsReadyToInvoice(state);

  return {
    windowStartIso: todayIso,
    windowEndIso,
    upcomingCount: upcomingMissions.length,
    estimatedCents: estimatedMissions.reduce((sum, mission) => sum + mission.totalCents, 0),
    estimatedHours: estimatedMissions.reduce((sum, mission) => sum + mission.totalHours, 0),
    toInvoiceCount: toInvoiceMissions.length,
    toInvoiceCents: toInvoiceMissions.reduce((sum, mission) => sum + mission.totalCents, 0),
    upcomingMissions,
    toInvoiceMissions,
  };
}

export function buildInvoicePipelineMetrics(state: AppState, todayIso: string): InvoicePipelineMetrics {
  const rows = buildInvoiceOperationalRows(state, todayIso);
  const summary = buildInvoiceOperationalSummary(rows);

  const receivableRows = rows.filter(
    (row) => row.invoice.status === 'GENERATED' || row.invoice.status === 'SENT',
  );

  return {
    toSendCount: summary.toSendCount,
    toSendCents: summary.draftCents,
    receivableCount: receivableRows.length,
    receivableCents: receivableRows.reduce((sum, row) => sum + row.invoice.amountCents, 0),
    overdueCount: summary.overdueCount,
    overdueCents: summary.overdueCents,
    toVerifyCount: summary.attentionCount,
    paidCount: summary.paidCount,
    paidCents: summary.paidCents,
    archivedCount: summary.archivedCount,
  };
}

export function buildFinanceSignals(state: AppState, todayIso: string) {
  return {
    smallSupplier: buildSmallSupplierSnapshot(state, todayIso),
    dataHealth: buildDataHealthSummary(state),
  };
}

export function buildPharmacyMetrics(state: AppState, pharmacie: Pharmacie): PharmacyMetrics {
  const invoices = state.invoices.filter((invoice) => invoice.pharmacieId === pharmacie.id);
  const missions = state.missions.filter((mission) => mission.pharmacieId === pharmacie.id);

  return {
    totalInvoicedCents: invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    lastMissionDate: missions.map((mission) => mission.dateFin).sort().at(-1),
    unpaidInvoices: invoices.filter((invoice) => invoice.status === 'SENT' || invoice.status === 'GENERATED'),
  };
}

export function buildHomeMetricSnapshots(state: AppState, todayIso: string): HomeMetricSnapshot[] {
  const missionMetrics = buildMissionWindowMetrics(state, todayIso);
  const invoiceMetrics = buildInvoicePipelineMetrics(state, todayIso);

  return [
    {
      id: 'missionsUpcoming7d',
      label: 'Missions à venir - 7 jours',
      value: String(missionMetrics.upcomingCount),
      helperText: 'Fenêtre glissante de 7 jours',
      ownerHref: '/missions?filter=upcoming_7d',
    },
    {
      id: 'missionsEstimated7d',
      label: 'Montant estimé - 7 jours',
      value: formatCents(missionMetrics.estimatedCents),
      helperText: 'Missions planifiées ou en cours',
      ownerHref: '/missions?filter=estimated_7d',
    },
    {
      id: 'missionsToInvoice',
      label: metricDefinitions.missionsToInvoice.label,
      value: String(missionMetrics.toInvoiceCount),
      helperText: formatCents(missionMetrics.toInvoiceCents),
      ownerHref: '/missions?filter=to_invoice',
    },
    {
      id: 'invoicesToCollect',
      label: 'À encaisser',
      value: formatCents(invoiceMetrics.receivableCents),
      helperText: `${invoiceMetrics.receivableCount} facture${invoiceMetrics.receivableCount > 1 ? 's' : ''} en circulation`,
      ownerHref: '/invoices?filter=receivable',
    },
  ];
}

function formatCents(value: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value / 100);
}
