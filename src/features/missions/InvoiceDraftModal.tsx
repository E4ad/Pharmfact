import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { borderRadiusScale, typographyScale } from '../../design-system/tokens';
import { StatusChip } from '../../components/StatusChip';
import { invoiceStatusLabels } from '../../services/invoiceWorkflow';
import { pharmacieDisplayName } from '../../storage/selectors';
import type { AppState, Invoice, Mission, Pharmacie, Pharmacien } from '../../storage/schema';
import { MissionSummaryPanel } from './components/MissionSummaryPanel';
import { formatMissionDatesSummary } from './missionFormatters';

function addressLabel(pharmacie?: Pharmacie): string {
  if (!pharmacie) return 'Adresse non renseignée';
  const city = pharmacie.ville
    ? `${pharmacie.ville}${pharmacie.codePostal ? `, QC ${pharmacie.codePostal}` : ''}`
    : '';
  return [pharmacie.adresse, city].filter(Boolean).join(' · ') || 'Adresse non renseignée';
}

export function InvoiceDraftModal({
  open,
  onClose,
  mission,
  pharmacy,
  invoice,
  onEditMission,
  onGeneratePdf,
  onMarkSent,
  onDownloadPdfDirect,
}: {
  open: boolean;
  onClose: () => void;
  mission: Mission;
  pharmacy?: Pharmacie;
  pharmacien?: Pharmacien;
  invoice: Invoice;
  state: AppState;
  onEditMission: (id: string) => void;
  onGeneratePdf: (invoiceId: string) => Promise<void>;
  onMarkSent: (invoiceId: string) => void;
  onDownloadPdfDirect: (invoiceId: string) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const totalHours = mission.days.reduce((sum, d) => sum + d.hours, 0);
  const dateSummary = formatMissionDatesSummary(mission.days.map((d) => d.dateService));
  const isDraft = invoice.status === 'draft';
  const isReady = invoice.status === 'ready_to_send' || invoice.status === 'GENERATED';

  async function handleGeneratePdf() {
    setGenerating(true);
    try {
      await onGeneratePdf(invoice.id);
    } finally {
      setGenerating(false);
    }
  }

  const topBar = (
    <>
      {isReady ? (
        <IconButton
          aria-label="Télécharger le PDF"
          size="small"
          onClick={() => onDownloadPdfDirect(invoice.id)}
          sx={{
            width: 32,
            height: 32,
            borderRadius: borderRadiusScale.full,
            bgcolor: 'rgba(255,255,255,0.12)',
            color: 'common.white',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
          }}
        >
          <PictureAsPdfRoundedIcon sx={{ fontSize: typographyScale.base }} />
        </IconButton>
      ) : null}
      <IconButton
        aria-label="Fermer"
        size="small"
        onClick={onClose}
        sx={{
          width: 32,
          height: 32,
          borderRadius: borderRadiusScale.full,
          bgcolor: 'rgba(255,255,255,0.12)',
          color: 'common.white',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
        }}
      >
        <CloseRoundedIcon sx={{ fontSize: typographyScale.base }} />
      </IconButton>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { 'aria-label': 'Facture brouillon' } }}
    >
      <Box sx={{ p: 2.5, pb: 0 }}>
        <MissionSummaryPanel
          topBar={topBar}
          missionCode={mission.missionCode}
          pharmacyName={pharmacy ? pharmacieDisplayName(pharmacy) : 'Remplacement officine'}
          pharmacyAddress={addressLabel(pharmacy)}
          dates={dateSummary}
          daysWorked={mission.days.length}
          paidHours={totalHours}
          hourlyRateCents={mission.hourlyRateCents}
          subtotalCents={mission.subtotalCents}
          expensesCents={mission.mealTotalCents + mission.mileageTotalCents}
          totalCents={mission.totalCents}
        />
      </Box>
      <DialogContent sx={{ p: 2.5, pt: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {invoice.numero}
              </Typography>
              <StatusChip kind="invoice" status={invoice.status} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {invoiceStatusLabels[invoice.status] ?? invoice.status}
            </Typography>
          </Box>

          <Stack spacing={1}>
            {isDraft ? (
              <Button
                variant="contained"
                startIcon={<PictureAsPdfRoundedIcon />}
                onClick={handleGeneratePdf}
                disabled={generating}
                fullWidth
                sx={{ borderRadius: borderRadiusScale.full, fontWeight: 700 }}
              >
                {generating ? 'Génération…' : 'Générer et télécharger le PDF'}
              </Button>
            ) : null}

            {isReady ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<SendRoundedIcon />}
                  onClick={() => { onMarkSent(invoice.id); onClose(); }}
                  fullWidth
                  sx={{ borderRadius: borderRadiusScale.full, fontWeight: 700 }}
                >
                  Marquer comme envoyée
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfRoundedIcon />}
                  onClick={() => onDownloadPdfDirect(invoice.id)}
                  fullWidth
                  sx={{ borderRadius: borderRadiusScale.full, fontWeight: 700 }}
                >
                  Télécharger le PDF
                </Button>
              </>
            ) : null}

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<EditRoundedIcon />}
              onClick={() => onEditMission(mission.id)}
              fullWidth
              sx={{ borderRadius: borderRadiusScale.full, fontWeight: 700, color: 'text.secondary' }}
            >
              Modifier la mission
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
