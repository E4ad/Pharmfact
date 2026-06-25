import type { AppState, Invoice, InvoiceStatus, PaymentStatus, Mission, PaymentMethod, InvoicePayment } from '../storage/schema';
import { addDaysIso, createId, todayIso } from './ids';
import { assertSamePharmacy } from './businessRules';
import { resolveInvoiceDefaults, resolveTaxSettingsForInvoice } from '../storage/selectors';

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  GENERATED: 'Générée',
  SENT: 'Envoyée',
  PAID: 'Payée',
  ARCHIVED: 'Archivée',
  VOIDED: 'Annulée',
  draft: 'Brouillon',
  ready_to_send: 'Prête à envoyer',
  replaced: 'Remplacée',
  archived: 'Archivée',
  sent: 'Envoyée',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  to_collect: 'À encaisser',
  partial: 'Partiel',
  paid: 'Payé',
};

export function invoiceStatusTone(status: InvoiceStatus): 'default' | 'primary' | 'success' | 'error' {
  if (status === 'GENERATED' || status === 'SENT' || status === 'draft' || status === 'ready_to_send') return 'primary';
  if (status === 'PAID' || status === 'archived') return 'success';
  if (status === 'VOIDED') return 'error';
  return 'default';
}

export function paymentStatusTone(status: PaymentStatus): 'default' | 'primary' | 'success' {
  if (status === 'to_collect') return 'primary';
  if (status === 'partial') return 'default';
  if (status === 'paid') return 'success';
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
  const amountCents = missions.reduce((sum, mission) => sum + mission.totalCents, 0);
  return {
    id: createId('inv'),
    numero: generateInvoiceNumber(state.invoices, dateFacture),
    missionIds: missions.map((mission) => mission.id),
    missionId: firstMission.id,
    pharmacienId: firstMission.pharmacienId,
    pharmacieId: firstMission.pharmacieId,
    dateFacture,
    dateEcheance: addDaysIso(dateFacture, invoiceDefaults.invoiceDueDays),
    status: 'draft',
    paymentStatus: 'to_collect',
    hours: Math.round(missions.reduce((sum, mission) => sum + mission.totalHours, 0) * 100) / 100,
    amountCents,
    paidAmountCents: 0,
    balanceDue: amountCents,
    paymentTerms: invoiceDefaults.paymentTerms,
    smallSupplierMention:
      taxSettings.taxStatus === 'SMALL_SUPPLIER'
        ? 'Petit fournisseur: TPS/TVQ non applicables. À valider selon votre situation fiscale.'
        : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function transitionInvoice(invoice: Invoice, status: InvoiceStatus): Invoice {
  const now = todayIso();
  const isPaidInvoice = invoice.status === 'PAID' || invoice.paymentStatus === 'paid';
  if (isPaidInvoice && (status !== 'archived' && status !== 'ARCHIVED')) return invoice;
  if (status === 'SENT' || status === 'sent') return { ...invoice, status: 'sent', sentAt: now };
  if (status === 'PAID') return { ...invoice, status: 'sent', paymentStatus: 'paid', paidAt: now };
  if (status === 'archived' || status === 'ARCHIVED') return { ...invoice, status: 'archived', archivedAt: now };
  if (status === 'draft' || status === 'ready_to_send' || status === 'replaced' || status === 'GENERATED' || status === 'VOIDED') {
    return { ...invoice, status: status === 'GENERATED' ? 'draft' : status === 'VOIDED' ? 'VOIDED' : status };
  }
  return { ...invoice, status };
}

export function createInvoicePayment(
  invoice: Invoice,
  input: {
    amount: number;
    receivedAt: string;
    method: PaymentMethod;
    note?: string;
  },
): InvoicePayment {
  return {
    id: createId('pay'),
    amount: input.amount,
    receivedAt: input.receivedAt,
    method: input.method,
    note: input.note,
    createdAt: new Date().toISOString(),
  };
}

export function addPaymentToInvoice(
  invoice: Invoice,
  payment: InvoicePayment,
  newAmountCents: number,
): Invoice {
  const amountCents = invoice.amountCents;
  const currentPaid = invoice.paidAmountCents ?? 0;
  const newPaid = currentPaid + payment.amount;
  const balanceDue = Math.max(0, amountCents - newPaid);
  
  let paymentStatus: PaymentStatus = 'to_collect';
  if (balanceDue === 0 && newPaid > 0) {
    paymentStatus = 'paid';
  } else if (newPaid > 0) {
    paymentStatus = 'partial';
  }
  
  const updatedInvoice: Invoice = {
    ...invoice,
    payments: [...(invoice.payments ?? []), payment],
    paidAmountCents: newPaid,
    balanceDue,
    paymentStatus,
    ...(paymentStatus === 'paid' ? { paidAt: payment.receivedAt } : {}),
  };
  
  return updatedInvoice;
}

export function calculateBalanceDue(invoice: Invoice): number {
  const amountCents = invoice.amountCents;
  const paidAmountCents = invoice.paidAmountCents ?? 0;
  return Math.max(0, amountCents - paidAmountCents);
}

export function calculatePaymentStatus(invoice: Invoice): PaymentStatus {
  const amountCents = invoice.amountCents;
  const paidAmountCents = invoice.paidAmountCents ?? 0;
  if (paidAmountCents === 0) return 'to_collect';
  if (paidAmountCents >= amountCents) return 'paid';
  return 'partial';
}

export function generateInvoiceVersion(
  originalInvoice: Invoice,
  missions: Mission[],
  state: AppState,
): Invoice {
  const baseNumber = originalInvoice.numero.replace(/\s*v\d+$/, '');
  const version = (originalInvoice.versionInfo?.version ?? 1) + 1;
  
  const dateFacture = todayIso();
  const invoiceDefaults = resolveInvoiceDefaults(state, originalInvoice.pharmacienId);
  
  const newInvoice: Invoice = {
    ...originalInvoice,
    id: createId('inv'),
    numero: `${baseNumber} v${version}`,
    status: 'draft',
    paymentStatus: 'to_collect',
    dateFacture,
    dateEcheance: addDaysIso(dateFacture, invoiceDefaults.invoiceDueDays),
    hours: Math.round(missions.reduce((sum, mission) => sum + mission.totalHours, 0) * 100) / 100,
    amountCents: missions.reduce((sum, mission) => sum + mission.totalCents, 0),
    paidAmountCents: 0,
    balanceDue: missions.reduce((sum, mission) => sum + mission.totalCents, 0),
    payments: [],
    sentAt: undefined,
    paidAt: undefined,
    archivedAt: undefined,
    correctionState: {
      missionChangedAfterDraft: true,
      pdfNeedsRegeneration: false,
      correctionRequired: true,
    },
    previousPaidAmount: originalInvoice.paidAmountCents,
    remainingBalanceFromCorrection: undefined,
    overpayment: undefined,
    pdfGeneratedAt: undefined,
    pdfPath: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return newInvoice;
}
