import type { AppState, Invoice, InvoiceStatus, Mission } from '../storage/schema';
import { todayIso } from './ids';

export type InvoiceQueue =
  | 'all'
  | 'to_send'
  | 'overdue'
  | 'sent'
  | 'paid'
  | 'archived'
  | 'attention'
  | 'corrected_originals'
  | 'corrected_versions';

export type InvoiceConsistencyIssue = {
  id: string;
  severity: 'warning' | 'error';
  label: string;
  detail: string;
};

export type InvoiceOperationalRow = {
  invoice: Invoice;
  missions: Mission[];
  missionCount: number;
  correctedVersionCount: number;
  hasCorrectedVersions: boolean;
  isCorrectedVersion: boolean;
  daysUntilDue: number;
  isOverdue: boolean;
  isActionable: boolean;
  priority: 0 | 1 | 2 | 3;
  priorityLabel: 'Bloquant' | 'Urgent' | 'À traiter' | 'Stable';
  consistencyIssues: InvoiceConsistencyIssue[];
};

export type InvoiceOperationalSummary = {
  toSendCount: number;
  sentCount: number;
  overdueCount: number;
  paidCount: number;
  archivedCount: number;
  attentionCount: number;
  correctedOriginalCount: number;
  correctedVersionCount: number;
  receivableCents: number;
  overdueCents: number;
  paidCents: number;
  draftCents: number;
};

const actionableStatuses = new Set<InvoiceStatus>(['GENERATED', 'SENT']);

function invoiceMissionIds(invoice: Pick<Invoice, 'missionIds' | 'missionId'>): string[] {
  return invoice.missionIds?.length
    ? invoice.missionIds
    : invoice.missionId
      ? [invoice.missionId]
      : [];
}

function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime();
  const to = new Date(`${toIso}T00:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function invoiceConsistencyIssues(
  invoice: Invoice,
  missions: Mission[],
): InvoiceConsistencyIssue[] {
  const issues: InvoiceConsistencyIssue[] = [];
  const missionIds = invoiceMissionIds(invoice);

  if (missionIds.length !== missions.length) {
    issues.push({
      id: 'missing-mission',
      severity: 'error',
      label: 'Mission introuvable',
      detail: 'La facture référence une mission absente des données locales.',
    });
  }

  const expectedHours =
    Math.round(missions.reduce((sum, mission) => sum + mission.totalHours, 0) * 100) / 100;
  const expectedAmountCents = missions.reduce((sum, mission) => sum + mission.totalCents, 0);

  if (missions.length && Math.abs(invoice.hours - expectedHours) >= 0.01) {
    issues.push({
      id: 'hours-mismatch',
      severity: 'warning',
      label: 'Heures modifiées',
      detail: `La facture indique ${invoice.hours.toFixed(2)} h, les missions totalisent ${expectedHours.toFixed(2)} h.`,
    });
  }

  if (missions.length && invoice.amountCents !== expectedAmountCents) {
    issues.push({
      id: 'amount-mismatch',
      severity: 'warning',
      label: 'Montant à vérifier',
      detail: 'Le montant de la facture ne correspond plus au total actuel des missions.',
    });
  }

  const missionPharmacies = new Set(missions.map((mission) => mission.pharmacieId));
  if (
    missionPharmacies.size > 1 ||
    (missionPharmacies.size === 1 && !missionPharmacies.has(invoice.pharmacieId))
  ) {
    issues.push({
      id: 'pharmacy-mismatch',
      severity: 'error',
      label: 'Client incohérent',
      detail: 'La pharmacie de la facture ne correspond pas aux missions liées.',
    });
  }

  return issues;
}

export function buildInvoiceOperationalRows(
  state: AppState,
  nowIso = todayIso(),
): InvoiceOperationalRow[] {
  return state.invoices
    .map((invoice) => {
      const missionIds = invoiceMissionIds(invoice);
      const missions = missionIds
        .map((id) => state.missions.find((mission) => mission.id === id))
        .filter((mission): mission is Mission => Boolean(mission));
      const correctedVersions = state.invoices.filter(
        (item) => item.correctedFromInvoiceId === invoice.id,
      );
      const daysUntilDue = diffDays(nowIso, invoice.dateEcheance);
      const isOverdue = invoice.status === 'SENT' && daysUntilDue < 0;
      const consistencyIssues = invoiceConsistencyIssues(invoice, missions);
      const hasBlockingIssue = consistencyIssues.some((issue) => issue.severity === 'error');
      const isActionable = actionableStatuses.has(invoice.status);
      const isCorrectedVersion = Boolean(invoice.correctedFromInvoiceId);
      const priority: InvoiceOperationalRow['priority'] = hasBlockingIssue
        ? 3
        : isOverdue
          ? 2
          : isActionable
            ? 1
            : 0;
      const priorityLabel: InvoiceOperationalRow['priorityLabel'] =
        priority === 3
          ? 'Bloquant'
          : priority === 2
            ? 'Urgent'
            : priority === 1
              ? 'À traiter'
              : 'Stable';

      return {
        invoice,
        missions,
        missionCount: missionIds.length || 1,
        correctedVersionCount: correctedVersions.length,
        hasCorrectedVersions: correctedVersions.length > 0,
        isCorrectedVersion,
        daysUntilDue,
        isOverdue,
        isActionable,
        priority,
        priorityLabel,
        consistencyIssues,
      };
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        a.daysUntilDue - b.daysUntilDue ||
        b.invoice.dateFacture.localeCompare(a.invoice.dateFacture),
    );
}

export function buildInvoiceOperationalSummary(
  rows: InvoiceOperationalRow[],
): InvoiceOperationalSummary {
  return rows.reduce<InvoiceOperationalSummary>(
    (summary, row) => {
      const { invoice } = row;
      if (invoice.status === 'GENERATED') {
        summary.toSendCount += 1;
        summary.draftCents += invoice.amountCents;
      }
      if (invoice.status === 'SENT') {
        summary.sentCount += 1;
        summary.receivableCents += invoice.amountCents;
      }
      if (row.isOverdue) {
        summary.overdueCount += 1;
        summary.overdueCents += invoice.amountCents;
      }
      if (invoice.status === 'PAID') {
        summary.paidCount += 1;
        summary.paidCents += invoice.amountCents;
      }
      if (invoice.status === 'ARCHIVED') summary.archivedCount += 1;
      if (row.consistencyIssues.length) summary.attentionCount += 1;
      if (row.hasCorrectedVersions) summary.correctedOriginalCount += 1;
      if (row.isCorrectedVersion) summary.correctedVersionCount += 1;
      return summary;
    },
    {
      toSendCount: 0,
      sentCount: 0,
      overdueCount: 0,
      paidCount: 0,
      archivedCount: 0,
      attentionCount: 0,
      correctedOriginalCount: 0,
      correctedVersionCount: 0,
      receivableCents: 0,
      overdueCents: 0,
      paidCents: 0,
      draftCents: 0,
    },
  );
}

export function filterInvoiceRows(
  rows: InvoiceOperationalRow[],
  queue: InvoiceQueue,
  search = '',
): InvoiceOperationalRow[] {
  const normalizedSearch = search.trim().toLowerCase();
  return rows.filter((row) => {
    const { invoice } = row;
    const matchesQueue =
      queue === 'all' ||
      (queue === 'to_send' && invoice.status === 'GENERATED') ||
      (queue === 'overdue' && row.isOverdue) ||
      (queue === 'sent' && invoice.status === 'SENT') ||
      (queue === 'paid' && invoice.status === 'PAID') ||
      (queue === 'archived' && invoice.status === 'ARCHIVED') ||
      (queue === 'attention' && row.consistencyIssues.length > 0) ||
      (queue === 'corrected_originals' && row.hasCorrectedVersions) ||
      (queue === 'corrected_versions' && row.isCorrectedVersion);

    if (!matchesQueue) return false;
    if (!normalizedSearch) return true;

    return [
      invoice.numero,
      invoice.dateFacture,
      invoice.dateEcheance,
      invoice.status,
      invoice.correctedFromInvoiceId ?? '',
      row.hasCorrectedVersions ? 'corrigée' : '',
      ...row.missions.map((mission) => mission.missionCode),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });
}
