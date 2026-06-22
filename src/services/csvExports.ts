import { invoiceMissionIds } from './businessRules';
import { buildSmallSupplierSnapshot } from './smallSupplier';
import type { AppState } from '../storage/schema';

export type CsvExportKind = 'revenus' | 'factures' | 'depenses' | 'pharmacies' | 'synthese-annuelle';

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r;]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function money(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '\uFEFF';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';')),
  ];
  return `\uFEFF${lines.join('\n')}\n`;
}

export function buildRevenueRows(state: AppState) {
  return state.missions.map((mission) => ({
    date_debut: mission.dateDebut,
    date_fin: mission.dateFin,
    mission: mission.missionCode,
    pharmacie_id: mission.pharmacieId,
    type_acte: mission.actType,
    heures: mission.totalHours.toFixed(2),
    honoraires: money(mission.subtotalCents),
    frais: money(mission.totalCents - mission.subtotalCents),
    total: money(mission.totalCents),
    statut: mission.status,
  }));
}

export function buildInvoiceRows(state: AppState) {
  return state.invoices.map((invoice) => ({
    date_facture: invoice.dateFacture,
    date_echeance: invoice.dateEcheance,
    numero: invoice.numero,
    pharmacie_id: invoice.pharmacieId,
    mission_ids: invoiceMissionIds(invoice).join(','),
    heures: invoice.hours.toFixed(2),
    montant: money(invoice.amountCents),
    statut: invoice.status,
    envoyee_le: invoice.sentAt ?? '',
    payee_le: invoice.paidAt ?? '',
  }));
}

export function buildExpenseRows(state: AppState) {
  return state.deductibleExpenses.map((expense) => ({
    date: expense.date,
    categorie: expense.category,
    libelle: expense.label,
    montant: money(expense.amountCents),
    deductible: expense.taxDeductible ? 'oui' : 'non',
    mission_id: expense.missionId ?? '',
    justificatif: expense.receiptId ?? (expense.hasReceipt ? 'oui' : 'non'),
    note: expense.notes ?? '',
  }));
}

export function buildPharmacyRows(state: AppState) {
  return state.pharmacies.map((pharmacie) => ({
    id: pharmacie.id,
    nom: pharmacie.nom,
    nom_affiche: pharmacie.displayLabel ?? '',
    ville: pharmacie.ville,
    code_postal: pharmacie.codePostal,
    email_facturation: pharmacie.billingEmail ?? pharmacie.email,
    contact_facturation: pharmacie.billingContactName ?? '',
    telephone_facturation: pharmacie.billingPhone ?? pharmacie.telephone,
    taux_horaire_habituel: pharmacie.usualHourlyRateCents ? money(pharmacie.usualHourlyRateCents) : '',
    conditions_paiement: pharmacie.paymentTerms ?? '',
    distance_km: pharmacie.distanceKm ?? '',
    notes: pharmacie.notes ?? '',
  }));
}

export function buildAnnualSummaryRows(state: AppState, year: number) {
  const invoices = state.invoices.filter((invoice) => invoice.dateFacture.startsWith(String(year)));
  const expenses = state.deductibleExpenses.filter((expense) => expense.date.startsWith(String(year)));
  const smallSupplier = buildSmallSupplierSnapshot(state, `${year}-12-31`);
  return [{
    annee: year,
    revenu_facture: money(invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0)),
    revenu_encaisse: money(invoices.reduce((sum, invoice) => invoice.status === 'PAID' ? sum + invoice.amountCents : sum, 0)),
    depenses_deductibles: money(expenses.filter((expense) => expense.taxDeductible).reduce((sum, expense) => sum + expense.amountCents, 0)),
    factures_impayees: money(invoices.filter((invoice) => invoice.status === 'SENT' || invoice.status === 'GENERATED').reduce((sum, invoice) => sum + invoice.amountCents, 0)),
    petit_fournisseur_cumul: money(smallSupplier.taxableRevenueCents),
    petit_fournisseur_statut: smallSupplier.status,
  }];
}

export function buildCsvExport(state: AppState, kind: CsvExportKind, year = new Date().getFullYear()): string {
  if (kind === 'revenus') return toCsv(buildRevenueRows(state));
  if (kind === 'factures') return toCsv(buildInvoiceRows(state));
  if (kind === 'depenses') return toCsv(buildExpenseRows(state));
  if (kind === 'pharmacies') return toCsv(buildPharmacyRows(state));
  return toCsv(buildAnnualSummaryRows(state, year));
}

