import type { AppState, Invoice, InvoiceStatus, Mission } from '../storage/schema';
import { addDaysIso, createId, todayIso } from './ids';
import { assertSamePharmacy } from './businessRules';
import { resolveInvoiceDefaults, resolveTaxSettingsForInvoice } from '../storage/selectors';

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  GENERATED: 'Générée',
  SENT: 'Envoyée',
  PAID: 'Payée',
  ARCHIVED: 'Archivée',
  VOIDED: 'Annulée',
};

export function invoiceStatusTone(status: InvoiceStatus): 'default' | 'primary' | 'success' | 'error' {
  if (status === 'GENERATED' || status === 'SENT') return 'primary';
  if (status === 'PAID') return 'success';
  if (status === 'VOIDED') return 'error';
  return 'default';
}

export function generateInvoiceNumber(invoices: Invoice[], dateIso = todayIso()): string {
  const year = dateIso.slice(0, 4);
  const countForYear = invoices.filter((invoice) => invoice.numero.startsWith(`FAC-${year}-`)).length + 1;
  return `FAC-${year}-${String(countForYear).padStart(4, '0')}`;
}

export function createInvoiceFromMission(mission: Mission, state: AppState): Invoice {
  return createInvoiceFromMissions([mission], state);
}

export function createInvoiceFromMissions(missions: Mission[], state: AppState): Invoice {
  if (!missions.length) throw new Error('Aucune mission à facturer.');
  const pharmacyCheck = assertSamePharmacy(missions);
  if (!pharmacyCheck.ok) throw new Error('Une facture multi-missions doit viser une seule pharmacie.');
  const firstMission = missions[0];
  const dateFacture = todayIso();
  const invoiceDefaults = resolveInvoiceDefaults(state, firstMission.pharmacienId);
  const taxSettings = resolveTaxSettingsForInvoice(state, firstMission.pharmacienId);
  return {
    id: createId('inv'),
    numero: generateInvoiceNumber(state.invoices, dateFacture),
    missionIds: missions.map((mission) => mission.id),
    missionId: firstMission.id,
    pharmacienId: firstMission.pharmacienId,
    pharmacieId: firstMission.pharmacieId,
    dateFacture,
    dateEcheance: addDaysIso(dateFacture, invoiceDefaults.invoiceDueDays),
    status: 'GENERATED',
    hours: Math.round(missions.reduce((sum, mission) => sum + mission.totalHours, 0) * 100) / 100,
    amountCents: missions.reduce((sum, mission) => sum + mission.totalCents, 0),
    paymentTerms: invoiceDefaults.paymentTerms,
    smallSupplierMention:
      taxSettings.taxStatus === 'SMALL_SUPPLIER'
        ? 'Petit fournisseur: TPS/TVQ non applicables. À valider selon votre situation fiscale.'
        : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function transitionInvoice(invoice: Invoice, status: InvoiceStatus): Invoice {
  const now = todayIso();
  if (invoice.status === 'PAID' && status !== 'ARCHIVED') return invoice;
  if (status === 'SENT') return { ...invoice, status, sentAt: now };
  if (status === 'PAID') return { ...invoice, status, paidAt: now };
  if (status === 'ARCHIVED') return { ...invoice, status, archivedAt: now };
  return { ...invoice, status };
}
