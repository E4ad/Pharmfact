import type { AppState, Invoice, InvoiceStatus, Mission } from '../storage/schema';
import { addDaysIso, createId, todayIso } from './ids';

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
  const dateFacture = todayIso();
  return {
    id: createId('inv'),
    numero: generateInvoiceNumber(state.invoices, dateFacture),
    missionId: mission.id,
    pharmacienId: mission.pharmacienId,
    pharmacieId: mission.pharmacieId,
    dateFacture,
    dateEcheance: addDaysIso(dateFacture, 30),
    status: 'GENERATED',
    hours: mission.totalHours,
    amountCents: mission.totalCents,
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
