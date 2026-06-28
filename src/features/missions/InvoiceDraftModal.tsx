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
} from '@mui/material';
import { useState } from 'react';
import { borderRadiusScale, typographyScale } from '../../design-system/tokens';
import type { AppState, Invoice, Mission, Pharmacie, Pharmacien } from '../../storage/schema';
import { InvoiceTemplate } from '../invoices/InvoiceTemplate';

export function InvoiceDraftModal({
  open,
  onClose,
  mission,
  pharmacy,
  pharmacien,
  invoice,
  state,
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
          sx={{ width: 32, height: 32, borderRadius: borderRadiusScale.full }}
        >
          <PictureAsPdfRoundedIcon sx={{ fontSize: typographyScale.base }} />
        </IconButton>
      ) : null}
      <IconButton
        aria-label="Fermer"
        size="small"
        onClick={onClose}
        sx={{ width: 32, height: 32, borderRadius: borderRadiusScale.full }}
      >
        <CloseRoundedIcon sx={{ fontSize: typographyScale.base }} />
      </IconButton>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { 'aria-label': 'Prévisualisation facture' } }}
    >
      {/* Top bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {topBar}
      </Box>

      {/* Invoice preview */}
      <Box
        sx={{
          overflowY: 'auto',
          maxHeight: '65vh',
          bgcolor: '#f0f0f0',
          p: 1,
        }}
      >
        <Box sx={{ zoom: 0.72, transformOrigin: 'top center' }}>
          <InvoiceTemplate
            invoice={invoice}
            state={state}
            mission={mission}
            pharmacien={pharmacien}
            pharmacie={pharmacy}
          />
        </Box>
      </Box>

      {/* Actions */}
      <DialogContent sx={{ p: 2, pt: 1.5 }}>
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
      </DialogContent>
    </Dialog>
  );
}
