import { todayIso } from './ids';
import type { AppState, Invoice, Mission, Pharmacie } from '../storage/schema';
import { invoiceConsistencyIssues } from './invoiceOperations';

export type BusinessMissionStatus =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'sent'
  | 'paid'
  | 'archived';

export type BusinessAlert = {
  id: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  href?: string;
};

export const businessMissionStatusLabels: Record<BusinessMissionStatus, string> = {
  draft: 'Brouillon',
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
  invoiced: 'Facturée',
  sent: 'Envoyée',
  paid: 'Payée',
  archived: 'Archivée',
};

export function invoiceMissionIds(invoice: Pick<Invoice, 'missionIds' | 'missionId'>): string[] {
  return invoice.missionIds?.length
    ? invoice.missionIds
    : invoice.missionId
      ? [invoice.missionId]
      : [];
}

export function invoiceForMission(invoices: Invoice[], mission: Mission): Invoice | undefined {
  return invoices.find(
    (invoice) =>
      invoice.id === mission.invoiceId || invoiceMissionIds(invoice).includes(mission.id),
  );
}

export function deriveMissionBusinessStatus(
  mission: Mission,
  invoice?: Invoice,
): BusinessMissionStatus {
  if (invoice?.status === 'PAID') return 'paid';
  if (invoice?.status === 'SENT') return 'sent';
  if (invoice && invoice.status !== 'VOIDED') return 'invoiced';
  if (mission.status === 'ARCHIVED') return 'archived';
  if (mission.status === 'DRAFT') return 'draft';
  if (mission.status === 'IN_PROGRESS') return 'in_progress';
  if (mission.status === 'COMPLETED') return 'completed';
  return 'planned';
}

export function missionsReadyToInvoice(state: AppState): Mission[] {
  return state.missions.filter(
    (mission) => mission.status === 'COMPLETED' && !invoiceForMission(state.invoices, mission),
  );
}

export function assertSamePharmacy(
  missions: Mission[],
): { ok: true; pharmacieId?: string } | { ok: false; pharmacieIds: string[] } {
  const pharmacieIds = [...new Set(missions.map((mission) => mission.pharmacieId).filter(Boolean))];
  if (pharmacieIds.length <= 1) return { ok: true, pharmacieId: pharmacieIds[0] };
  return { ok: false, pharmacieIds };
}

export function buildBusinessAlerts(state: AppState, nowIso = todayIso()): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];
  const duplicateNumbers = new Set(
    state.invoices
      .map((invoice) => invoice.numero)
      .filter((numero, index, all) => numero && all.indexOf(numero) !== index),
  );

  missionsReadyToInvoice(state).forEach((mission) => {
    alerts.push({
      id: `mission-not-invoiced-${mission.id}`,
      severity: 'warning',
      title: 'Mission terminée non facturée',
      message: `${mission.missionCode} est terminée et n’a pas encore de facture.`,
      actionLabel: 'Générer facture',
      href: `/missions?selected=${mission.id}`,
    });
  });

  state.invoices.forEach((invoice) => {
    const linkedMissionIds = invoiceMissionIds(invoice);
    const linkedMissions = linkedMissionIds
      .map((missionId) => state.missions.find((mission) => mission.id === missionId))
      .filter((mission): mission is Mission => Boolean(mission));

    if (!invoice.pharmacieId) {
      alerts.push({
        id: `invoice-no-client-${invoice.id}`,
        severity: 'error',
        title: 'Facture sans client',
        message: `${invoice.numero || 'Facture'} n’a pas de pharmacie associée.`,
        href: '/invoices',
      });
    }
    if (!invoice.numero?.trim()) {
      alerts.push({
        id: `invoice-no-number-${invoice.id}`,
        severity: 'error',
        title: 'Facture sans numéro',
        message: 'Une facture n’a pas de numéro.',
        href: '/invoices',
      });
    }
    if (duplicateNumbers.has(invoice.numero)) {
      alerts.push({
        id: `invoice-duplicate-${invoice.id}`,
        severity: 'error',
        title: 'Numéro de facture dupliqué',
        message: `${invoice.numero} est utilisé plus d’une fois.`,
        href: '/invoices',
      });
    }
    if (invoice.status === 'SENT' && invoice.dateEcheance < nowIso) {
      alerts.push({
        id: `invoice-overdue-${invoice.id}`,
        severity: 'warning',
        title: 'Facture en retard',
        message: `${invoice.numero} est échue depuis le ${invoice.dateEcheance}.`,
        actionLabel: 'Marquer payée',
        href: '/invoices',
      });
    }
    if (invoice.dateEcheance < invoice.dateFacture) {
      alerts.push({
        id: `invoice-date-${invoice.id}`,
        severity: 'error',
        title: 'Date incohérente',
        message: `${invoice.numero} a une échéance avant la date de facture.`,
        href: '/invoices',
      });
    }
    if (invoice.amountCents <= 0 || invoice.hours < 0) {
      alerts.push({
        id: `invoice-amount-${invoice.id}`,
        severity: 'error',
        title: 'Montant incohérent',
        message: `${invoice.numero} a un montant ou des heures invalides.`,
        href: '/invoices',
      });
    }

    invoiceConsistencyIssues(invoice, linkedMissions).forEach((issue) => {
      alerts.push({
        id: `invoice-consistency-${issue.id}-${invoice.id}`,
        severity: issue.severity === 'error' ? 'error' : 'warning',
        title: issue.label,
        message: `${invoice.numero}: ${issue.detail}`,
        actionLabel: 'Vérifier facture',
        href: '/invoices',
      });
    });
  });

  state.missions.forEach((mission) => {
    if (mission.hourlyRateCents <= 0) {
      alerts.push({
        id: `mission-rate-${mission.id}`,
        severity: 'warning',
        title: 'Taux horaire manquant',
        message: `${mission.missionCode} n’a pas de taux horaire valide.`,
        href: `/missions/${mission.id}/edit`,
      });
    }
    if (mission.dateFin < mission.dateDebut) {
      alerts.push({
        id: `mission-date-${mission.id}`,
        severity: 'error',
        title: 'Date incohérente',
        message: `${mission.missionCode} se termine avant son début.`,
        href: `/missions/${mission.id}/edit`,
      });
    }
    if (mission.totalCents < 0 || mission.totalHours < 0) {
      alerts.push({
        id: `mission-amount-${mission.id}`,
        severity: 'error',
        title: 'Montant incohérent',
        message: `${mission.missionCode} a un total invalide.`,
        href: `/missions/${mission.id}/edit`,
      });
    }
  });

  return alerts;
}

export function pharmacyMetrics(
  state: AppState,
  pharmacie: Pharmacie,
): {
  totalInvoicedCents: number;
  lastMissionDate?: string;
  unpaidInvoices: Invoice[];
} {
  const invoices = state.invoices.filter((invoice) => invoice.pharmacieId === pharmacie.id);
  const missions = state.missions.filter((mission) => mission.pharmacieId === pharmacie.id);
  return {
    totalInvoicedCents: invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    lastMissionDate: missions
      .map((mission) => mission.dateFin)
      .sort()
      .at(-1),
    unpaidInvoices: invoices.filter(
      (invoice) => invoice.status === 'SENT' || invoice.status === 'GENERATED',
    ),
  };
}
