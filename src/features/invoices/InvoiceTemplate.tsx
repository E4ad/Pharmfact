import type { Invoice, Mission, Pharmacien, Pharmacie } from '../../storage/schema';
import { normalizeMissionExpense } from '../../services/expenseTypes';
import './InvoiceTemplate.css';

type Props = {
  invoice: Invoice;
  mission?: Mission;
  pharmacien?: Pharmacien;
  pharmacie?: Pharmacie;
};

type TaxSummary = ReturnType<typeof taxSummary>;

function money(cents: number): string {
  return `${(Math.round(cents) / 100).toFixed(2).replace('.', ',')} $`;
}

function invoiceStatusLabel(invoice: Invoice): string {
  if (invoice.status === 'PAID') return 'PAYÉE';
  if (invoice.status === 'ARCHIVED') return 'ARCHIVÉE';
  if (invoice.status === 'VOIDED') return 'ANNULÉE';
  if (invoice.status === 'SENT') return 'ENVOYÉE AU PAIEMENT';
  return 'À PAYER';
}

function invoiceStatusClass(invoice: Invoice): string {
  if (invoice.status === 'PAID') return 'invoice-status is-paid';
  if (invoice.status === 'ARCHIVED') return 'invoice-status is-archived';
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

function allExpenses(mission?: Mission) {
  const dayExpenses = mission?.days.flatMap((day) => (day.expenses ?? []).map((expense) => ({ ...normalizeMissionExpense(expense, mission.id, day.id), dateService: day.dateService }))) ?? [];
  if (dayExpenses.length) return dayExpenses;
  const fallback: Array<ReturnType<typeof normalizeMissionExpense> & { dateService: string }> = [];
  if ((mission?.mealTotalCents ?? 0) > 0) fallback.push({ ...normalizeMissionExpense({ id: 'meal', type: 'REPAS', typeKey: 'MEAL', label: 'Frais repas forfaitaires', amountCents: mission?.mealTotalCents ?? 0 }), dateService: mission?.dateDebut ?? '' });
  if ((mission?.mileageTotalCents ?? 0) > 0) fallback.push({ ...normalizeMissionExpense({ id: 'km', type: 'KM', typeKey: 'MILEAGE', label: 'Kilométrage', amountCents: mission?.mileageTotalCents ?? 0, distanceKm: mission?.mileageKm, unitRateCents: mission?.mileageRateCents }), dateService: mission?.dateDebut ?? '' });
  return fallback;
}

export function InvoiceTemplate(props: Props) {
  return <InvoiceDocument {...props} />;
}

function InvoiceDocument({ invoice, mission, pharmacien, pharmacie }: Props) {
  const taxes = taxSummary(invoice, pharmacien);
  const expenses = allExpenses(mission);
  const feeSubtotalCents = expenses.reduce((sum, expense) => sum + (expense.amountCents ?? Math.round((expense.amount ?? 0) * 100)), 0);
  const serviceSubtotalCents = Math.max(invoice.amountCents - feeSubtotalCents, 0);

  return (
    <article className="invoice-document" aria-label={`Facture ${invoice.numero}`}>
      <InvoiceHeader invoice={invoice} mission={mission} pharmacien={pharmacien} />
      <div className="invoice-section-divider" />
      <InvoiceClientBlock mission={mission} pharmacie={pharmacie} />
      <div className="invoice-section-divider" />
      <InvoiceItemsTable invoice={invoice} mission={mission} />
      <InvoiceExpensesTable expenses={expenses} />
      <div className="invoice-section-divider" />
      <InvoiceTotalsBox taxes={taxes} feeSubtotalCents={feeSubtotalCents} serviceSubtotalCents={serviceSubtotalCents} />
      <InvoicePaymentTerms invoice={invoice} />
    </article>
  );
}

function InvoiceHeader({ invoice, mission, pharmacien }: { invoice: Invoice; mission?: Mission; pharmacien?: Pharmacien }) {
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
                Mission : {mission?.missionCode ?? invoice.missionId}
              </div>
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

function InvoiceClientBlock({ mission, pharmacie }: { mission?: Mission; pharmacie?: Pharmacie }) {
  return (
    <table className="invoice-info-table">
      <tbody>
        <tr>
          <td className="invoice-client-col">
            <div className="invoice-info-label">Facturé à</div>
            <div className="invoice-info-value">
              <div className="invoice-client-name">{pharmacie?.nom ?? 'Pharmacie'}</div>
              <div>{pharmacie?.adresse || 'Adresse non renseignée'}</div>
              <div>{pharmacie?.ville ? `${pharmacie.ville}, QC ${pharmacie.codePostal}` : 'Ville non renseignée'}</div>
              <div>Téléphone : {pharmacie?.telephone || '—'}</div>
              <div>Courriel : {pharmacie?.email || '—'}</div>
              <div className="invoice-mission-summary">Remplacement pharmacien communautaire</div>
            </div>
          </td>
          <td className="invoice-transport-col">
            <div className="invoice-info-label">Déplacement</div>
            <div className="invoice-info-value">
              {mission && mission.mileageKm > 0 ? <>{mission.mileageKm.toFixed(1)} km (aller-retour)<br />{(mission.mileageRateCents / 100).toFixed(2).replace('.', ',')} $/km</> : 'Aucun déplacement facturé'}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function InvoiceItemsTable({ invoice, mission }: { invoice: Invoice; mission?: Mission }) {
  const rows = mission?.days.length ? mission.days : [{ id: 'invoice-row', dateService: invoice.dateFacture, description: 'Mission de remplacement', hours: invoice.hours }];
  return (
    <section className="invoice-lines-section">
      <div className="invoice-subsection-label">Prestations</div>
      <table className="invoice-item-table">
        <thead><tr><th className="invoice-date-col">Date</th><th>Description</th><th className="invoice-qty-col">Qté</th><th className="invoice-rate-col">Taux</th><th className="invoice-amount-col">Montant</th></tr></thead>
        <tbody>{rows.map((day) => { const hours = 'hours' in day ? day.hours : invoice.hours; const rateCents = mission?.hourlyRateCents ?? Math.round(invoice.amountCents / Math.max(invoice.hours, 1)); return <tr key={day.id}><td className="invoice-date-col">{day.dateService}</td><td>{day.description || 'Mission de remplacement'}</td><td className="invoice-qty-col">{hours.toFixed(2)} h</td><td className="invoice-rate-col">{money(rateCents)}</td><td className="invoice-amount-col">{money(Math.round(hours * rateCents))}</td></tr>; })}</tbody>
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
        <tbody>{expenses.map((expense) => <tr key={expense.id}><td>{expense.dateService}</td><td>{expense.typeKey === 'MEAL' || expense.type === 'REPAS' ? 'Repas' : expense.typeKey === 'MILEAGE' || expense.type === 'KM' ? 'Kilométrage' : 'Autre'}</td><td>{expense.label}</td><td>{(expense.typeKey === 'MILEAGE' || expense.type === 'KM') && expense.distanceKm ? `${expense.distanceKm.toFixed(1)} km × ${(expense.unitRate ?? ((expense.unitRateCents ?? 0) / 100)).toFixed(2)} $` : expense.notes ?? '—'}</td><td className="invoice-amount-col">{money(expense.amountCents ?? Math.round((expense.amount ?? 0) * 100))}</td></tr>)}</tbody>
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
  if (invoice.status === 'PAID') return <section className="invoice-payment-box"><h3>Modalités de paiement</h3><p>Facture acquittée le {invoice.paidAt ?? invoice.dateFacture}.</p><p>Référence : {invoice.numero}</p></section>;
  if (invoice.status === 'VOIDED') return <section className="invoice-payment-box"><h3>Statut de la facture</h3><p>Facture annulée.</p><p>Référence : {invoice.numero}</p></section>;
  if (invoice.status === 'SENT') return <section className="invoice-payment-box"><h3>Modalités de paiement</h3><p>Paiement attendu avant le {invoice.dateEcheance}.</p><p>Référence à indiquer : {invoice.numero}</p></section>;
  return <section className="invoice-payment-box"><h3>Modalités de paiement</h3><p>Paiement exigible avant le {invoice.dateEcheance}.</p><p>Référence à indiquer : {invoice.numero}</p></section>;
}
