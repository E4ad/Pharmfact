import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { borderRadiusScale, typographyScale } from '../../design-system/tokens';
import { StatusChip } from '../../components/StatusChip';
import { MissionSummaryPanel } from './components/MissionSummaryPanel';
import { PaymentModal } from '../invoices/PaymentModal';
import type { Invoice, InvoicePayment, Mission, MissionStatus, Pharmacie } from '../../storage/schema';
import { calculateBalanceDue } from '../../services/invoiceWorkflow';
import { deriveMissionBusinessStatus } from '../../services/businessRules';
import { nextMissionStatuses, missionStatusLabels } from '../../services/missionStatus';
import { expenseTypeConfig } from '../../services/expenseTypes';
import { formatMoney } from '../../services/money';
import { pharmacieDisplayName } from '../../storage/selectors';

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`));
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function hoursLabel(hours: number): string {
  return `${hours.toFixed(2).replace('.', ',')} h`;
}

function addressLabel(pharmacy?: Pharmacie): string {
  if (!pharmacy) return 'Adresse non renseignée';
  const city = pharmacy.ville ? `${pharmacy.ville}${pharmacy.codePostal ? `, QC ${pharmacy.codePostal}` : ''}` : '';
  return [pharmacy.adresse, city].filter(Boolean).join(' · ') || 'Adresse non renseignée';
}

function formatMissionDatesSummary(dates: string[]): string {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) return 'Dates à préciser';
  const formatter = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  if (sorted.length === 1) return formatter.format(new Date(`${sorted[0]}T00:00:00`));
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  return `${formatShortDate(first)} – ${formatShortDate(last)}`;
}

interface MissionDetailPanelProps {
  mission: Mission;
  pharmacy?: Pharmacie;
  invoice?: Invoice;
  onClose: () => void;
  onEditMission: (missionId: string) => void;
  onOpenInvoice: (missionId: string) => void;
  onDownloadPdf: (invoiceId: string) => void;
  onDownloadIcs: (mission: Mission) => void;
  onChangeMissionStatus: (missionId: string, status: MissionStatus) => void;
  onGenerateInvoice: (mission: Mission) => void;
  onSavePayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id' | 'createdAt'>) => void;
}

const iconBtnSx = {
  width: 32,
  height: 32,
  borderRadius: borderRadiusScale.full,
  bgcolor: 'action.hover',
  color: 'text.secondary',
  '&:hover': { bgcolor: 'action.selected' },
};

export function MissionDetailPanel({
  mission,
  pharmacy,
  invoice,
  onClose,
  onEditMission,
  onOpenInvoice,
  onDownloadPdf,
  onDownloadIcs,
  onChangeMissionStatus,
  onGenerateInvoice,
  onSavePayment,
}: MissionDetailPanelProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const businessStatus = deriveMissionBusinessStatus(mission, invoice);
  const canDownloadPdf = Boolean(invoice);
  const canDownloadIcs = mission.status === 'CONFIRMED' || mission.status === 'COMPLETED';
  const hasFees = mission.days.flatMap((d) => d.expenses ?? []).some((e) => e.amountCents > 0);
  const totalHours = mission.days.reduce((sum, day) => sum + day.hours, 0);
  const sortedDays = mission.days.slice().sort((a, b) =>
    `${a.dateService}${a.startTime}`.localeCompare(`${b.dateService}${b.startTime}`),
  );
  const nextStatuses = nextMissionStatuses(mission.status);
  const balanceDue = invoice ? calculateBalanceDue(invoice) : 0;
  const canShowFacturation = mission.status === 'COMPLETED' || Boolean(invoice);
  const canShowPaiement = Boolean(invoice);
  const isDraftMission = mission.status === 'DRAFT' || mission.status === 'CANCELLED' || mission.status === 'ARCHIVED';

  return (
    <>
      <Box
        data-testid="mission-detail-panel"
        sx={{
          borderTop: '2px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Compact action bar */}
        <Box
          sx={{
            px: 2.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {pharmacy ? pharmacieDisplayName(pharmacy) : 'Mission'} · {mission.missionCode}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {canDownloadPdf && invoice ? (
              <IconButton
                aria-label="Télécharger le PDF"
                size="small"
                onClick={() => onDownloadPdf(invoice.id)}
                sx={iconBtnSx}
              >
                <PictureAsPdfRoundedIcon sx={{ fontSize: typographyScale.base }} />
              </IconButton>
            ) : null}
            {canDownloadIcs ? (
              <IconButton
                aria-label="Télécharger le calendrier ICS"
                size="small"
                onClick={() => onDownloadIcs(mission)}
                sx={iconBtnSx}
              >
                <CalendarMonthRoundedIcon sx={{ fontSize: typographyScale.base }} />
              </IconButton>
            ) : null}
            <IconButton
              aria-label="Fermer le panneau"
              size="small"
              onClick={onClose}
              sx={iconBtnSx}
            >
              <ExpandLessRoundedIcon sx={{ fontSize: typographyScale.base }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Body */}
        <Box sx={{ p: 2.5, pb: 0 }}>
          <MissionSummaryPanel
            missionCode={mission.missionCode}
            pharmacyName={pharmacy ? pharmacieDisplayName(pharmacy) : 'Mission pharmacie'}
            pharmacyAddress={addressLabel(pharmacy)}
            dates={formatMissionDatesSummary(mission.days.map((d) => d.dateService))}
            daysWorked={mission.days.length}
            paidHours={totalHours}
            hourlyRateCents={mission.hourlyRateCents}
            subtotalCents={mission.subtotalCents}
            expensesCents={mission.mealTotalCents + mission.mileageTotalCents}
            totalCents={mission.totalCents}
          >
            <Box sx={{ pt: 1.5, pb: 0.5, borderTop: '1px solid', borderColor: 'rgba(255,255,255,0.18)' }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mission</Typography>
                <StatusChip kind="businessMission" status={businessStatus} />
                {invoice ? (
                  <>
                    <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Facture</Typography>
                    <StatusChip kind="invoice" status={invoice.status} />
                    {invoice.paymentStatus ? (
                      <>
                        <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Paiement</Typography>
                        <StatusChip kind="payment" status={invoice.paymentStatus} />
                      </>
                    ) : null}
                  </>
                ) : null}
              </Stack>
            </Box>
          </MissionSummaryPanel>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, p: 2.5, pt: 2 }}>
          {/* Changement de statut */}
          {nextStatuses.length > 0 ? (
            <Box sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                Changer le statut
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    size="small"
                    variant="outlined"
                    color={status === 'CANCELLED' ? 'error' : 'primary'}
                    onClick={() => {
                      if (status === 'CANCELLED') {
                        setConfirmCancelOpen(true);
                      } else {
                        onChangeMissionStatus(mission.id, status);
                      }
                    }}
                    sx={{ borderRadius: borderRadiusScale.full, fontWeight: 700 }}
                  >
                    {missionStatusLabels[status]}
                  </Button>
                ))}
              </Stack>
            </Box>
          ) : null}

          {/* Jours travaillés */}
          <Box sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Jours travaillés
            </Typography>
            <Stack spacing={0.5}>
              {sortedDays.map((day) => (
                <Box
                  key={day.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '140px 1fr auto' },
                    gap: 1.5,
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 8,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 750 }}>{formatShortDate(day.dateService)}</Typography>
                  <Typography variant="body2">
                    {day.startTime}–{day.endTime}
                    {day.unpaidBreakMinutes > 0 ? ` · pause ${day.unpaidBreakMinutes} min` : ''}
                    {day.description ? ` · ${day.description}` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, textAlign: { xs: 'left', sm: 'right' } }}>
                    {hoursLabel(day.hours)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Frais */}
          {hasFees ? (
            <Box sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Frais
              </Typography>
              <Stack spacing={0.5}>
                {mission.days.flatMap((d) => d.expenses ?? []).filter((e) => e.amountCents > 0).map((expense) => {
                  const config = expenseTypeConfig(expense.typeKey);
                  const detail = expense.typeKey === 'MILEAGE' && expense.distanceKm
                    ? `${config.label} · ${expense.distanceKm.toLocaleString('fr-CA')} km AR`
                    : config.label;
                  return (
                    <Box key={expense.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>{detail}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(expense.amountCents)}</Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          ) : null}

          {/* Facturation */}
          {canShowFacturation ? (
            <Box sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Facturation
              </Typography>
              {invoice ? (
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Facture</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{invoice.numero}</Typography>
                      <StatusChip kind="invoice" status={invoice.status} />
                    </Stack>
                  </Box>
                  {invoice.dateEcheance ? (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>Échéance</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium' }).format(new Date(`${invoice.dateEcheance}T00:00:00`))}
                      </Typography>
                    </Box>
                  ) : null}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onOpenInvoice(mission.id)}
                    sx={{ alignSelf: 'flex-start', borderRadius: borderRadiusScale.full, fontWeight: 700 }}
                  >
                    Ouvrir la facture →
                  </Button>
                </Stack>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onGenerateInvoice(mission)}
                  sx={{ borderRadius: borderRadiusScale.full, fontWeight: 700 }}
                >
                  Générer la facture
                </Button>
              )}
            </Box>
          ) : null}

          {/* Paiement */}
          {canShowPaiement && invoice ? (
            <Box sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Paiement
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>Solde à encaisser</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(balanceDue)}
                  </Typography>
                </Box>
                {(invoice.payments ?? []).length > 0 ? (
                  <Stack spacing={0.5}>
                    {(invoice.payments ?? []).map((payment) => (
                      <Box key={payment.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 8, bgcolor: 'action.hover' }}>
                        <Stack spacing={0}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatMoney(payment.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.receivedAt} · {payment.method}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : null}
                {invoice.paymentStatus !== 'paid' ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPaymentModalOpen(true)}
                    sx={{ alignSelf: 'flex-start', borderRadius: borderRadiusScale.full, fontWeight: 700 }}
                  >
                    Enregistrer un paiement
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ) : null}

          {/* Historique */}
          {mission.events.length > 0 ? (
            <Box>
              <Button
                fullWidth
                variant="text"
                onClick={() => setHistoryOpen((prev) => !prev)}
                sx={{ justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 750, p: 0, minHeight: 'auto', color: 'text.secondary' }}
                endIcon={historyOpen ? '▴' : '▾'}
                aria-expanded={historyOpen}
              >
                Historique
              </Button>
              {historyOpen ? (
                <Box sx={{ mt: 1.5 }}>
                  {mission.events.slice().reverse().map((event) => (
                    <Typography key={event.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {formatEventDate(event.eventDate)} · {event.label}
                    </Typography>
                  ))}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>

        {/* Footer */}
        {!isDraftMission ? (
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              variant="outlined"
              onClick={() => onEditMission(mission.id)}
              sx={{ borderRadius: borderRadiusScale.full, fontWeight: 700 }}
            >
              Modifier la mission
            </Button>
          </Box>
        ) : null}
      </Box>

      {/* PaymentModal */}
      {invoice ? (
        <PaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          invoice={invoice}
          onSave={(payment) => {
            setPaymentModalOpen(false);
            onSavePayment(invoice.id, payment);
          }}
        />
      ) : null}

      {/* Confirmation annulation */}
      <Dialog open={confirmCancelOpen} onClose={() => setConfirmCancelOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Annuler la mission ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Cette action est difficile à inverser. La mission passera en statut Annulée.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmCancelOpen(false)} sx={{ fontWeight: 700 }}>Retour</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onChangeMissionStatus(mission.id, 'CANCELLED');
              setConfirmCancelOpen(false);
              onClose();
            }}
            sx={{ fontWeight: 700 }}
          >
            Confirmer l'annulation
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
