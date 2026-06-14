import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { useAppState } from '../../storage/localStore';
import { findInvoice, findMission, findPharmacien, findPharmacie } from '../../storage/selectors';
import { InvoiceTemplate } from './InvoiceTemplate';

export function InvoicePrintPage() {
  const { invoiceId } = useParams();
  const state = useAppState();
  const invoice = findInvoice(state, invoiceId);
  const mission = invoice ? findMission(state, invoice.missionId) : undefined;
  const pharmacien = invoice ? findPharmacien(state, invoice.pharmacienId) : undefined;
  const pharmacie = invoice ? findPharmacie(state, invoice.pharmacieId) : undefined;

  useEffect(() => {
    document.title = `${invoice?.numero ?? 'Facture'} · Pharmfact`;
  }, [invoice?.numero]);

  if (!invoice) {
    return (
      <main id="main-content" tabIndex={-1} className="invoice-preview-page">
        <EmptyState title="Facture introuvable" description="La facture demandée n’existe pas dans le stockage local." />
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="invoice-preview-page">
      <section className="invoice-preview-shell" aria-label="Aperçu de la facture">
        <InvoiceTemplate invoice={invoice} mission={mission} pharmacien={pharmacien} pharmacie={pharmacie} />
      </section>
    </main>
  );
}
