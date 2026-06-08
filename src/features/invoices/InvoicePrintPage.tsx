import { useParams } from 'react-router-dom';
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

  if (!invoice) {
    return (
      <main className="invoice-preview-page">
        <EmptyState title="Facture introuvable" description="La facture demandée n’existe pas dans le stockage local." />
      </main>
    );
  }

  return (
    <main className="invoice-preview-page">
      <main className="invoice-preview-shell">
        <InvoiceTemplate invoice={invoice} mission={mission} pharmacien={pharmacien} pharmacie={pharmacie} />
      </main>
    </main>
  );
}
