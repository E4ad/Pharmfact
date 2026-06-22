import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { NotFoundState } from '../../components/NotFoundState';
import { useAppState } from '../../storage/localStore';
import { findInvoice, findMission, findPharmacien, findPharmacie } from '../../storage/selectors';
import { InvoiceTemplate } from './InvoiceTemplate';
import { invoiceMissionIds } from '../../services/businessRules';
import type { Mission } from '../../storage/schema';

export function InvoicePrintPage() {
  const { invoiceId } = useParams();
  const state = useAppState();
  const invoice = findInvoice(state, invoiceId);
  const missions = invoice ? invoiceMissionIds(invoice).map((id) => findMission(state, id)).filter((item): item is Mission => Boolean(item)) : [];
  const mission = missions[0];
  const pharmacien = invoice ? findPharmacien(state, invoice.pharmacienId) : undefined;
  const pharmacie = invoice ? findPharmacie(state, invoice.pharmacieId) : undefined;

  useEffect(() => {
    document.title = `${invoice?.numero ?? 'Facture'} · Pharmfact`;
  }, [invoice?.numero]);

  if (!invoice) {
    return (
      <NotFoundState
        title="Facture introuvable"
        description="La facture demandée n’existe pas dans le stockage local."
        actionLabel="Retour aux factures"
        actionTo="/invoices"
        redirectTo="/invoices"
        toastMessage="La facture n’existe plus dans les données locales."
      />
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="invoice-preview-page">
      <section className="invoice-preview-shell" aria-label="Aperçu de la facture">
        <InvoiceTemplate invoice={invoice} state={state} mission={mission} missions={missions} pharmacien={pharmacien} pharmacie={pharmacie} />
      </section>
    </main>
  );
}
