import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { NotFoundState } from '../../components/NotFoundState';
import { useNotifications } from '../../components/NotificationSystem';
import { buildMissionIcs, buildMissionIcsFilename, downloadIcs } from '../../services/calendarIcs';
import { createInvoiceFromMission, invoiceStatusLabels, paymentStatusLabels } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { createId } from '../../services/ids';
import { setAppStateAsync, useAppState } from '../../storage/localStore';
import { findPharmacien, findPharmacie, missionInvoice, pharmacieDisplayName } from '../../storage/selectors';
import './MissionFormPage.css';

function formatMissionInvoiceDates(dates: string[]): string {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) return 'Dates à confirmer';
  const formatter = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  if (sorted.length === 1) return formatter.format(new Date(`${sorted[0]}T00:00:00`));
  return `du ${formatter.format(new Date(`${sorted[0]}T00:00:00`))} au ${formatter.format(new Date(`${sorted.at(-1)}T00:00:00`))}`;
}

export function MissionInvoicePage() {
  const { missionId } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [actionsOpen, setActionsOpen] = useState(false);
  const mission = state.missions.find((item) => item.id === missionId);
  const pharmacie = mission ? findPharmacie(state, mission.pharmacieId) : undefined;
  const pharmacien = mission ? findPharmacien(state, mission.pharmacienId) : undefined;
  const invoice = mission ? missionInvoice(state, mission) : undefined;
  const datesLabel = useMemo(
    () => formatMissionInvoiceDates(mission?.days.map((day) => day.dateService) ?? []),
    [mission],
  );

  useEffect(() => {
    if (mission && !invoice) setActionsOpen(true);
  }, [invoice, mission]);

  if (!mission) {
    return (
      <NotFoundState
        title="Mission introuvable"
        description="La mission à facturer n’existe plus dans le stockage local."
        actionLabel="Retour aux missions"
        actionTo="/missions"
      />
    );
  }

  async function generateInvoice() {
    if (!mission) return;
    const invoiceToStore = createInvoiceFromMission(mission, state);
    await setAppStateAsync({
      ...state,
      invoices: [...state.invoices, invoiceToStore],
      missions: state.missions.map((item) =>
        item.id === mission.id
          ? {
              ...item,
              invoiceId: invoiceToStore.id,
              events: [
                ...item.events,
                {
                  id: createId('evt'),
                  eventType: 'INVOICE_CREATED',
                  label: `Brouillon ${invoiceToStore.numero} généré`,
                  eventDate: new Date().toISOString(),
                },
              ],
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    });
    setActionsOpen(false);
    notify({ severity: 'success', message: `Brouillon ${invoiceToStore.numero} généré.` });
  }

  function downloadCalendar() {
    if (!mission) return;
    const ics = buildMissionIcs(mission, pharmacien, pharmacie);
    downloadIcs(buildMissionIcsFilename(mission, pharmacie), ics);
    notify({ severity: 'success', message: 'ICS téléchargé.' });
  }

  const pharmacyName = pharmacie ? pharmacieDisplayName(pharmacie) : 'Pharmacie non sélectionnée';
  const pharmacyAddress = pharmacie ? [pharmacie.adresse, pharmacie.ville, pharmacie.codePostal].filter(Boolean).join(', ') : 'Adresse non renseignée';

  return (
    <main className="mission-form-page">
      <PageHeader
        eyebrow="Facturation"
        title="Facturation de la mission"
        backTo="/missions"
        backLabel="Missions"
        sx={(theme) => ({
          borderRadius: 10,
          minHeight: 70,
          px: { xs: 2, md: 2.5 },
          py: { xs: 0.75, md: 1 },
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        })}
      />

      <div className="mission-invoice-workspace">
        <section className="mission-form-card">
          <div className="mission-section-title">
            <h2>Rappel mission</h2>
          </div>
          <div className="mission-invoice-recap">
            <strong>{pharmacyName}</strong>
            <span>{pharmacyAddress}</span>
            <span>{datesLabel}</span>
            <strong>Total estimé : {formatMoney(mission.totalCents)}</strong>
          </div>
        </section>

        <section className="mission-form-card">
          <div className="mission-section-title">
            <h2>Facture</h2>
          </div>
          {invoice ? (
            <div className="mission-invoice-recap">
              <strong>{invoice.numero}</strong>
              <span>Statut : {invoiceStatusLabels[invoice.status]} · {invoice.paymentStatus ? paymentStatusLabels[invoice.paymentStatus] : ''}</span>
              <span>Montant : {formatMoney(invoice.amountCents)}</span>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" onClick={() => navigate(`/invoices/${invoice.id}/preview`)}>
                  Voir le PDF
                </Button>
                <Button variant="outlined" onClick={() => navigate(`/missions/${mission.id}/edit`)}>
                  Modifier la mission
                </Button>
              </Stack>
            </div>
          ) : (
            <div className="mission-invoice-recap">
              <strong>Facture à créer</strong>
              <span>La facture sera générée comme brouillon à partir de la mission validée.</span>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" onClick={generateInvoice}>
                  Générer la facture
                </Button>
                <Button variant="outlined" onClick={downloadCalendar}>
                  Télécharger ICS
                </Button>
              </Stack>
            </div>
          )}
        </section>
      </div>

      <Dialog open={actionsOpen} onClose={() => setActionsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mission validée</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Vous pouvez générer la facture maintenant ou télécharger le calendrier de la mission.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: 1 }}>
          <Button onClick={() => navigate('/missions')}>Retour aux missions</Button>
          <Button onClick={() => navigate(`/missions/${mission.id}/edit`)}>Modifier la mission</Button>
          <Button variant="outlined" onClick={downloadCalendar}>Télécharger ICS</Button>
          <Button variant="contained" onClick={generateInvoice}>Générer la facture</Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}
