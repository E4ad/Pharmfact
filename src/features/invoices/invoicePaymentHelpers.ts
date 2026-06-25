import type { Invoice, InvoicePayment, PaymentMethod } from '../../storage/schema';
import { addPaymentToInvoice, calculateBalanceDue, calculatePaymentStatus } from '../../services/invoiceWorkflow';

export function updateInvoicePayment(
  invoice: Invoice,
  paymentId: string,
  updates: Partial<Omit<InvoicePayment, 'id' | 'createdAt'>>,
): Invoice {
  const payments = invoice.payments ?? [];
  const updatedPayments = payments.map((p) =>
    p.id === paymentId
      ? { ...p, ...updates, updatedAt: new Date().toISOString() }
      : p,
  );
  
  const paidAmountCents = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = calculateBalanceDue({ ...invoice, paidAmountCents });
  const paymentStatus = calculatePaymentStatus({ ...invoice, paidAmountCents });
  
  return {
    ...invoice,
    payments: updatedPayments,
    paidAmountCents,
    balanceDue,
    paymentStatus,
    ...(paymentStatus === 'paid' ? { paidAt: updatedPayments[updatedPayments.length - 1]?.receivedAt } : {}),
  };
}

export function removePaymentFromInvoice(invoice: Invoice, paymentId: string): Invoice {
  const payments = invoice.payments ?? [];
  const updatedPayments = payments.filter((p) => p.id !== paymentId);
  
  const paidAmountCents = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = calculateBalanceDue({ ...invoice, paidAmountCents });
  const paymentStatus = calculatePaymentStatus({ ...invoice, paidAmountCents });
  
  return {
    ...invoice,
    payments: updatedPayments,
    paidAmountCents,
    balanceDue,
    paymentStatus,
    paidAt: paymentStatus === 'paid' ? updatedPayments[updatedPayments.length - 1]?.receivedAt : undefined,
  };
}

export function formatPaymentMethodName(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    transfer: 'Virement',
    cheque: 'Chèque',
    direct_deposit: 'Dépôt direct',
    interac: 'Interac',
    cash: 'Comptant',
    other: 'Autre',
    VIREMENT: 'Virement',
    CHEQUE: 'Chèque',
    INTERAC: 'Interac',
    COMPTANT: 'Comptant',
    AUTRE: 'Autre',
  };
  return labels[method] ?? method;
}