import { invoiceMissionIds } from './businessRules';
import type { AppState, Invoice, Mission } from '../storage/schema';

export type SmallSupplierStatus = 'normal' | 'warning' | 'exceeded';

export type SmallSupplierIncludedItem = {
  invoiceId: string;
  invoiceNumber: string;
  missionIds: string[];
  date: string;
  amountCents: number;
};

export type SmallSupplierSnapshot = {
  status: SmallSupplierStatus;
  taxableRevenueCents: number;
  thresholdCents: number;
  warningThresholdCents: number;
  ratio: number;
  periodStart: string;
  periodEnd: string;
  included: SmallSupplierIncludedItem[];
};

function normalizeRate(rate: number): number {
  return rate > 1 ? rate / 100 : rate;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function quarterStart(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function taxableAmountForInvoice(invoice: Invoice, missions: Mission[]): number {
  const ids = new Set(invoiceMissionIds(invoice));
  const invoiceMissions = missions.filter((mission) => ids.has(mission.id));
  if (!invoiceMissions.length) return invoice.amountCents;
  return invoiceMissions.reduce((sum, mission) => sum + mission.totalCents, 0);
}

export function buildSmallSupplierSnapshot(state: AppState, asOfIso: string): SmallSupplierSnapshot {
  const asOf = new Date(`${asOfIso}T00:00:00`);
  const start = quarterStart(addMonths(asOf, -9));
  const periodStart = isoDate(start);
  const periodEnd = asOfIso;
  const includedInvoices = state.invoices.filter((invoice) =>
    invoice.status !== 'VOIDED' &&
    invoice.status !== 'archived' && invoice.status !== 'ARCHIVED' &&
    invoice.dateFacture >= periodStart &&
    invoice.dateFacture <= periodEnd
  );
  const included = includedInvoices.map((invoice) => ({
    invoiceId: invoice.id,
    invoiceNumber: invoice.numero,
    missionIds: invoiceMissionIds(invoice),
    date: invoice.dateFacture,
    amountCents: taxableAmountForInvoice(invoice, state.missions),
  }));
  const taxableRevenueCents = included.reduce((sum, item) => sum + item.amountCents, 0);
  const thresholdCents = state.fiscalSettings.smallSupplierThresholdCents;
  const warningThresholdCents = Math.round(thresholdCents * normalizeRate(state.fiscalSettings.smallSupplierWarningRate));
  const status: SmallSupplierStatus =
    taxableRevenueCents >= thresholdCents ? 'exceeded' : taxableRevenueCents >= warningThresholdCents ? 'warning' : 'normal';

  return {
    status,
    taxableRevenueCents,
    thresholdCents,
    warningThresholdCents,
    ratio: thresholdCents > 0 ? taxableRevenueCents / thresholdCents : 0,
    periodStart,
    periodEnd,
    included,
  };
}

