import type { AppState, Invoice } from '../storage/schema';
import { createId } from './ids';
import { createInvoiceFromMissions } from './invoiceWorkflow';
import { invoiceMissionIds, assertSamePharmacy } from './businessRules';

function hydrateMissions(state: AppState, missionIds: string[]) {
  return missionIds
    .map((missionId) => state.missions.find((mission) => mission.id === missionId))
    .filter((mission): mission is NonNullable<typeof mission> => Boolean(mission));
}

function recalculateInvoice(invoice: Invoice, missions: AppState['missions']) {
  return {
    ...invoice,
    missionIds: missions.map((mission) => mission.id),
    missionId: missions[0]?.id ?? invoice.missionId,
    hours: Math.round(missions.reduce((sum, mission) => sum + mission.totalHours, 0) * 100) / 100,
    amountCents: missions.reduce((sum, mission) => sum + mission.totalCents, 0),
  };
}

export function splitGeneratedInvoiceMissions(
  state: AppState,
  invoiceId: string,
  missionIdsToExtract: string[],
): { state: AppState; newInvoice: Invoice } {
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new Error('Facture introuvable.');
  }
  if (invoice.status !== 'GENERATED') {
    throw new Error('La dissociation n’est disponible que pour une facture générée.');
  }

  const sourceMissionIds = invoiceMissionIds(invoice);
  const selectedIds = [...new Set(missionIdsToExtract)];
  const selectedSet = new Set(selectedIds);

  if (selectedIds.length === 0) {
    throw new Error('Sélectionnez au moins une mission à dissocier.');
  }
  if (selectedIds.length >= sourceMissionIds.length) {
    throw new Error('Laissez au moins une mission dans la facture d’origine.');
  }
  if (!selectedIds.every((id) => sourceMissionIds.includes(id))) {
    throw new Error('Une mission sélectionnée ne fait pas partie de cette facture.');
  }

  const retainedMissionIds = sourceMissionIds.filter((id) => !selectedSet.has(id));
  const extractedMissions = hydrateMissions(state, selectedIds);
  const retainedMissions = hydrateMissions(state, retainedMissionIds);

  if (!extractedMissions.length || !retainedMissions.length) {
    throw new Error('Impossible de dissocier cette facture.');
  }

  if (!assertSamePharmacy([...extractedMissions, ...retainedMissions]).ok) {
    throw new Error('La facture contient des missions de pharmacies différentes.');
  }

  const newInvoice = createInvoiceFromMissions(extractedMissions, state);
  const remainingInvoice = recalculateInvoice(invoice, retainedMissions);

  return {
    state: {
      ...state,
      invoices: [
        ...state.invoices.map((item) => (item.id === invoice.id ? remainingInvoice : item)),
        newInvoice,
      ],
      missions: state.missions.map((mission) =>
        selectedSet.has(mission.id)
          ? {
              ...mission,
              invoiceId: newInvoice.id,
              events: [
                ...mission.events,
                {
                  id: createId('evt'),
                  eventType: 'INVOICE_CREATED',
                  label: `Dissociée de ${invoice.numero} vers ${newInvoice.numero}`,
                  eventDate: new Date().toISOString(),
                },
              ],
            }
          : mission,
      ),
    },
    newInvoice,
  };
}

export function mergeGeneratedInvoices(
  state: AppState,
  invoiceIds: string[],
): { state: AppState; newInvoice: Invoice } {
  const selectedIds = [...new Set(invoiceIds)];
  const invoices = selectedIds
    .map((id) => state.invoices.find((invoice) => invoice.id === id))
    .filter((invoice): invoice is Invoice => Boolean(invoice));

  if (invoices.length < 2) {
    throw new Error('Sélectionnez au moins deux factures à regrouper.');
  }
  if (invoices.some((invoice) => invoice.status !== 'GENERATED')) {
    throw new Error('Le regroupement est réservé aux factures générées.');
  }

  const missionIds = [...new Set(invoices.flatMap((invoice) => invoiceMissionIds(invoice)))];
  const missions = hydrateMissions(state, missionIds);

  if (!missions.length) {
    throw new Error('Aucune mission à regrouper.');
  }
  if (!assertSamePharmacy(missions).ok) {
    throw new Error('Le regroupement n’est possible que pour une seule pharmacie.');
  }

  const newInvoice = createInvoiceFromMissions(missions, state);
  const missionIdSet = new Set(missions.map((mission) => mission.id));

  return {
    state: {
      ...state,
      invoices: [...state.invoices.filter((invoice) => !selectedIds.includes(invoice.id)), newInvoice],
      missions: state.missions.map((mission) =>
        missionIdSet.has(mission.id)
          ? {
              ...mission,
              invoiceId: newInvoice.id,
              events: [
                ...mission.events,
                {
                  id: createId('evt'),
                  eventType: 'INVOICE_CREATED',
                  label: `Facture groupée ${newInvoice.numero} créée`,
                  eventDate: new Date().toISOString(),
                },
              ],
            }
          : mission,
      ),
    },
    newInvoice,
  };
}
