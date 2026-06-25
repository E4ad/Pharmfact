import type { AppState, Invoice, Mission, Pharmacien, Pharmacie } from '../../storage/schema';
import { normalizeMissionExpense } from '../../services/expenseTypes';
import { getMissionInvoiceLabel } from '../../services/actTypes';
import { invoiceMissionIds } from '../../services/businessRules';
import './InvoiceTemplate.css';

type Props = {
  invoice: Invoice;
  state: AppState;
  mission?: Mission;
  missions?: Mission[];
  pharmacien?: Pharmacien;
  pharmacie?: Pharmacie;
};

type TaxSummary = ReturnType<typeof taxSummary>;
type InvoiceExpenseLine = ReturnType<typeof normalizeMissionExpense> & { dateService: string; missionCode?: string };

function money(cents: number): string {
  return `${(Math.round(cents) / 100).toFixed(2).replace('.', ',')} $`;
}

function invoiceStatusLabel(invoice: Invoice): string {
  if (invoice.status === 'PAID' || invoice.paymentStatus === 'paid') return 'PAYÉE';
  if (invoice.status === 'archived' || invoice.status === 'ARCHIVED') return 'ARCHIVÉE';
  if (invoice.status === 'VOIDED') return 'ANNULÉE';
  if (invoice.status === 'SENT' || invoice.status === 'sent') return 'ENVOYÉE AU PAIEMENT';
  return 'À PAYER';
}

function invoiceStatusClass(invoice: Invoice): string {
  if (invoice.status === 'PAID' || invoice.paymentStatus === 'paid') return 'invoice-status is-paid';
  if (invoice.status === 'archived' || invoice.status === 'ARCHIVED') return 'invoice-status is-archived';
  if (invoice.status === 'VOIDED') return 'invoice-status is-voided';
  return 'invoice-status';
}

function taxSummary(invoice: Invoice, pharmacien?: Pharmacien) {
  const collectsTaxes = pharmacien?.taxStatus === 'REGISTERED';
  const gstCents = collectsTaxes ? Math.round(invoice.amountCents * 0.05) : 0;
  const qstCents = collectsTaxes ? Math.round(invoice.amountCents * 0.09975) : 0;
  return {
    collectsTaxes,
    gstCents,
    qstCents,
    grandTotalCents: invoice.amountCents + gstCents + qstCents,
  };
}

function invoiceMissions(mission?: Mission, missions?: Mission[]): Mission[] {
  return missions?.length ? missions : mission ? [mission] : [];
}

function resolveInvoiceRelations(state: AppState, invoice: Invoice): {
  originalInvoice?: Invoice;
  correctedInvoices: Invoice[];
} {
  const originalInvoice = invoice.correctedFromInvoiceId
    ? state.invoices.find((item) => item.id === invoice.correctedFromInvoiceId)
    : undefined;
  const correctedInvoices = state.invoices.filter((item) => item.correctedFromInvoiceId === invoice.id);
  return { originalInvoice, correctedInvoices };
}

function allExpenses(missions: Mission[]): InvoiceExpenseLine[] {
  const dayExpenses = missions.flatMap((mission) =>
    mission.days.flatMap((day) =>
      (day.expenses ?? [])
        .map((expense) => ({ ...normalizeMissionExpense(expense, mission.id, day.id), dateService: day.dateService, missionCode: mission.missionCode }))
        .filter((expense) => expense.billable),
    ),
  );
  if (dayExpenses.length) return dayExpenses;
  const fallback: InvoiceExpenseLine[] = [];
  missions.forEach((mission) => {
    if (mission.mealTotalCents > 0) fallback.push({ ...normalizeMissionExpense({ id: `meal-${mission.id}`, type: 'REPAS', typeKey: 'MEAL', label: 'Frais repas forfaitaires', amountCents: mission.mealTotalCents }), dateService: mission.dateDebut, missionCode: mission.missionCode });
    if (mission.mileageTotalCents > 0) fallback.push({ ...normalizeMissionExpense({ id: `km-${mission.id}`, type: 'KM', typeKey: 'MILEAGE', label: 'Kilométrage', amountCents: mission.mileageTotalCents, distanceKm: mission.mileageKm, unitRateCents: mission.mileageRateCents }), dateService: mission.dateDebut, missionCode: mission.missionCode });
  });
  return fallback;
}

export function InvoiceTemplate(props: Props) {
  return <InvoiceDocument {...props} />;
}

function InvoiceDocument({ invoice, state, mission, missions, pharmacien, pharmacie }: Props) {
  const missionList = invoiceMissions(mission, missions);
  const taxes = taxSummary(invoice, pharmacien);
  const expenses = allExpenses(missionList);
  const feeSubtotalCents = expenses.reduce((sum, expense) => sum + (expense.amountCents ?? Math.round((expense.amount ?? 0) * 100)), 0);
  const serviceSubtotalCents = Math.max(invoice.amountCents - feeSubtotalCents, 0);
  const relations = resolveInvoiceRelations(state, invoice);

  return (
    <article className="invoice-document" aria-label={`Facture ${invoice.numero}`}>
      <InvoiceHeader invoice={invoice} missions={missionList} pharmacien={pharmacien} relations={relations} />
      <div className="invoice-section-divider" />
      <InvoiceClientBlock missions={missionList} pharmacie={pharmacie} />
      <div className="invoice-section-divider" />
      <InvoiceItemsTable invoice={invoice} missions={missionList} />
      <InvoiceExpensesTable expenses={expenses} />
      <div className="invoice-section-divider" />
      <InvoiceTotalsBox taxes={taxes} feeSubtotalCents={feeSubtotalCents} serviceSubtotalCents={serviceSubtotalCents} />
      <InvoicePaymentTerms invoice={invoice} />
    </article>
  );
}

function InvoiceHeader({
  invoice,
  missions,
  pharmacien,
  relations,
}: {
  invoice: Invoice;
  missions: Mission[];
  pharmacien?: Pharmacien;
  relations: ReturnType<typeof resolveInvoiceRelations>;
}) {
  const missionLabel = missions.length
    ? missions.map((item) => item.missionCode).join(', ')
    : invoiceMissionIds(invoice).join(', ');
  return (
    <table className="invoice-header-table">
      <tbody>
        <tr>
          <td>
            <div className="invoice-company-name">{pharmacien?.nom ?? 'Pharmacien'}</div>
            <div className="invoice-company-tagline">Pharmacien remplaçant indépendant</div>
            <div className="invoice-company-details">
              {pharmacien?.adresse || 'Adresse non renseignée'}<br />
              {pharmacien?.ville ? `${pharmacien.ville}, QC ${pharmacien.codePostal}` : 'Ville non renseignée'}<br />
              Téléphone : {pharmacien?.telephone || '—'}<br />
              Courriel : {pharmacien?.email || '—'}
            </div>
          </td>
          <td>
            <div className="invoice-box">
              <div className="invoice-title">Facture</div>
              <div className="invoice-meta">
                Facture nº : {invoice.numero}<br />
                Date : {invoice.dateFacture}<br />
                Échéance : {invoice.dateEcheance}<br />
                Mission : {missionLabel || '—'}
              </div>
              {relations.originalInvoice ? (
                <div className="invoice-meta">
                  Version corrigée de : {relations.originalInvoice.numero}
                </div>
              ) : null}
              {relations.correctedInvoices.length ? (
                <div className="invoice-meta">
                  Corrigée par : {relations.correctedInvoices.map((item) => item.numero).join(', ')}
                </div>
              ) : null}
              <InvoiceStatusBadge invoice={invoice} />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function InvoiceStatusBadge({ invoice }: { invoice: Invoice }) {
  return <div className={invoiceStatusClass(invoice)}>{invoiceStatusLabel(invoice)}</div>;
}

function InvoiceClientBlock({ missions, pharmacie }: { missions: Mission[]; pharmacie?: Pharmacie }) {
  const pharmacyName = pharmacie?.displayLabel || pharmacie?.nom;
  const mission = missions[0];
  const totalMileageKm = missions.reduce((sum, item) => sum + Math.max(item.mileageKm || 0, 0), 0);
  const mileageRateCents = missions.find((item) => item.mileageRateCents)?.mileageRateCents ?? mission?.mileageRateCents;

  return (
    <table className="invoice-info-table">
      <tbody>
        <tr>
          <td className="invoice-client-col">
            <div className="invoice-info-label">Facturé à</div>
            <div className="invoice-info-value">
              <div className="invoice-client-name">{pharmacyName ?? 'Pharmacie'}</div>
              {pharmacie?.billingContactName ? <div>Contact : {pharmacie.billingContactName}</div> : null}
              <div>{pharmacie?.adresse || 'Adresse non renseignée'}</div>
              <div>{pharmacie?.ville ? `${pharmacie.ville}, QC ${pharmacie.codePostal}` : 'Ville non renseignée'}</div>
              <div>Téléphone : {pharmacie?.billingPhone || pharmacie?.telephone || '—'}</div>
              <div>Courriel : {pharmacie?.billingEmail || pharmacie?.email || '—'}</div>
              <div className="invoice-mission-summary">{mission ? getMissionInvoiceLabel(mission) : 'Services professionnels'}</div>
            </div>
          </td>
          <td className="invoice-transport-col">
            <div className="invoice-info-label">Déplacement</div>
            <div className="invoice-info-value">
              {totalMileageKm > 0 ? <>{totalMileageKm.toFixed(1)} km facturés<br />{((mileageRateCents ?? 0) / 100).toFixed(2).replace('.', ',')} $/km</> : 'Aucun déplacement facturé'}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function InvoiceItemsTable({ invoice, missions }: { invoice: Invoice; missions: Mission[] }) {
  const rows = missions.length
    ? missions.flatMap((mission) => mission.days.map((day) => ({ ...day, mission })))
    : [{ id: 'invoice-row', dateService: invoice.dateFacture, description: 'Mission de remplacement', hours: invoice.hours, mission: undefined as Mission | undefined }];
  return (
    <section className="invoice-lines-section">
      <div className="invoice-subsection-label">Prestations</div>
      <table className="invoice-item-table">
        <thead><tr><th className="invoice-date-col">Date</th><th>Description</th><th className="invoice-qty-col">Qté</th><th className="invoice-rate-col">Taux</th><th className="invoice-amount-col">Montant</th></tr></thead>
        <tbody>{rows.map((day) => { const hours = day.hours; const rateCents = day.mission?.hourlyRateCents ?? Math.round(invoice.amountCents / Math.max(invoice.hours, 1)); return <tr key={`${day.mission?.id ?? 'invoice'}-${day.id}`}><td className="invoice-date-col">{day.dateService}</td><td>{day.mission ? `${getMissionInvoiceLabel(day.mission)} · ${day.mission.missionCode}` : day.description || 'Mission de remplacement'}</td><td className="invoice-qty-col">{hours.toFixed(2)} h</td><td className="invoice-rate-col">{money(rateCents)}</td><td className="invoice-amount-col">{money(Math.round(hours * rateCents))}</td></tr>; })}</tbody>
      </table>
    </section>
  );
}

function InvoiceExpensesTable({ expenses }: { expenses: ReturnType<typeof allExpenses> }) {
  if (!expenses.length) return null;
  return (
    <section className="invoice-lines-section">
      <div className="invoice-subsection-label">Frais</div>
      <table className="invoice-expense-table">
        <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Détail</th><th className="invoice-amount-col">Montant</th></tr></thead>
        <tbody>{expenses.map((expense) => <tr key={expense.id}><td>{expense.dateService}</td><td>{expense.typeKey === 'MEAL' || expense.type === 'REPAS' ? 'Repas' : expense.typeKey === 'MILEAGE' || expense.type === 'KM' ? 'Kilométrage' : 'Autre'}</td><td>{expense.missionCode ? `${expense.label} · ${expense.missionCode}` : expense.label}</td><td>{(expense.typeKey === 'MILEAGE' || expense.type === 'KM') && expense.distanceKm ? `${expense.distanceKm.toFixed(1)} km × ${(expense.unitRate ?? ((expense.unitRateCents ?? 0) / 100)).toFixed(2)} $` : expense.notes ?? '—'}</td><td className="invoice-amount-col">{money(expense.amountCents ?? Math.round((expense.amount ?? 0) * 100))}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function InvoiceTotalsBox({ taxes, feeSubtotalCents, serviceSubtotalCents }: { taxes: TaxSummary; feeSubtotalCents: number; serviceSubtotalCents: number }) {
  return (
    <div className="invoice-totals-section"><div className="invoice-totals-wrapper"><table className="invoice-totals-table"><tbody>
      <tr><td className="invoice-totals-label">Sous-total prestation</td><td className="invoice-totals-value">{money(serviceSubtotalCents)}</td></tr>
      <tr><td className="invoice-totals-label">Sous-total frais</td><td className="invoice-totals-value">{money(feeSubtotalCents)}</td></tr>
      <tr><td className="invoice-totals-label">TPS (5%)</td><td className={`invoice-totals-value ${taxes.collectsTaxes ? '' : 'invoice-exempt'}`}>{taxes.collectsTaxes ? money(taxes.gstCents) : 'Non applicable'}</td></tr>
      <tr><td className="invoice-totals-label">TVQ (9,975%)</td><td className={`invoice-totals-value ${taxes.collectsTaxes ? '' : 'invoice-exempt'}`}>{taxes.collectsTaxes ? money(taxes.qstCents) : 'Non applicable'}</td></tr>
      <tr className="invoice-total-final"><td>TOTAL</td><td>{money(taxes.grandTotalCents)}</td></tr>
    </tbody></table></div></div>
  );
}

function InvoicePaymentTerms({ invoice }: { invoice: Invoice }) {
  const smallSupplier = invoice.smallSupplierMention ? <p>{invoice.smallSupplierMention}</p> : null;
  const terms = invoice.paymentTerms ? <p>{invoice.paymentTerms}</p> : null;
  if (invoice.status === 'PAID' || invoice.paymentStatus === 'paid') return <section className="invoice-payment-box"><h3>Modalités de paiement</h3><p>Facture acquittée le {invoice.paidAt ?? invoice.dateFacture}.</p><p>Référence : {invoice.numero}</p>{smallSupplier}</section>;
  if (invoice.status === 'VOIDED') return <section className="invoice-payment-box"><h3>Statut de la facture</h3><p>Facture annulée.</p><p>Référence : {invoice.numero}</p></section>;
  if (invoice.status === 'SENT' || invoice.status === 'sent') return <section className="invoice-payment-box"><h3>Modalités de paiement</h3><p>Paiement attendu avant le {invoice.dateEcheance}.</p>{terms}<p>Référence à indiquer : {invoice.numero}</p>{smallSupplier}</section>;
  return <section className="invoice-payment-box"><h3>Modalités de paiement</h3><p>Paiement exigible avant le {invoice.dateEcheance}.</p>{terms}<p>Référence à indiquer : {invoice.numero}</p>{smallSupplier}</section>;
}
