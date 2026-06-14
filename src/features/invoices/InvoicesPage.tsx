import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useState } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { MoneyValue } from '../../components/MoneyValue';
import { StatusChip } from '../../components/StatusChip';
import { LoadingButton } from '../../components/LoadingButton';
import { FadeIn } from '../../components/FadeIn';
import { useNotifications } from '../../components/NotificationSystem';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus } from '../../storage/schema';
import { findPharmacie, pharmacieDisplayName } from '../../storage/selectors';
import { getPlatformAsync } from '../../services/platformService';
import { logMappedError, mapError } from '../../services/errorMapper';
import { undoManager } from '../../services/undoManager';

export function InvoicesPage() {
  const state = useAppState();
  const { notify } = useNotifications();
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  function setStatus(invoiceId: string, status: InvoiceStatus) {
    const previousInvoice = state.invoices.find((invoice) => invoice.id === invoiceId);
    if (!previousInvoice) return;

    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === invoiceId ? transitionInvoice(invoice, status) : invoice),
    }));

    const undoId = undoManager.add({
      description: `Restaurer la facture ${previousInvoice.numero}`,
      undo: () => {
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.map((invoice) => (invoice.id === invoiceId ? previousInvoice : invoice)),
        }));
      },
    });

    notify({
      severity: 'success',
      message: `Facture ${invoiceStatusLabels[status].toLowerCase()}.`,
      onUndo: () => undoManager.undo(undoId),
    });
  }

  async function downloadPdf(invoice: Invoice) {
    setDownloadingId(invoice.id);
    try {
      // Utiliser getPlatformAsync pour garantir que tauriPlatform est chargé en mode Tauri
      const platform = await getPlatformAsync();
      console.log('[PDF] Début téléchargement facture:', invoice.numero);
      const blob = await platform.pdf.generateInvoicePdf(invoice, state);
      console.log('[PDF] Blob reçu, taille:', blob.size);
      const saved = await platform.pdf.downloadPdf(blob, invoice.numero);
      if (saved) {
        notify({ severity: 'success', message: 'PDF téléchargé.' });
      }
    } catch (error) {
      const mapped = mapError(error, { code: 'PDF_GENERATION_FAILED' });
      logMappedError(mapped, error);
      if (mapped.shouldDisplay) {
        notify({ severity: mapped.severity, message: mapped.message, persist: mapped.severity === 'error' });
      }
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Stack spacing={{ xs: 3, md: 4 }}>
      <PageHeader
        eyebrow="Factures"
        title="Vue d’ensemble"
        description="Contrôlez les statuts, les montants et les téléchargements PDF depuis une vue unique."
        data-testid="invoices-page-header"
      />
      {!state.invoices.length ? (
        <EmptyState title="Aucune facture" description="Les factures apparaîtront ici après génération depuis une mission." />
      ) : (
        <PageSection
          title="Factures générées"
          description={`${state.invoices.length} facture${state.invoices.length > 1 ? 's' : ''} disponible${state.invoices.length > 1 ? 's' : ''}. Les actions rapides restent groupées par facture.`}
        >
          <FadeIn>
            <SurfaceCard contentSx={{ overflowX: 'auto' }}>
            <Table aria-label="Liste des factures">
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col">Date</TableCell>
                  <TableCell component="th" scope="col">Numéro</TableCell>
                  <TableCell component="th" scope="col">Pharmacie</TableCell>
                  <TableCell component="th" scope="col">Heures</TableCell>
                  <TableCell component="th" scope="col">Montant</TableCell>
                  <TableCell component="th" scope="col">Statut</TableCell>
                  <TableCell component="th" scope="col" align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.invoices.map((invoice) => {
                  const pharmacie = findPharmacie(state, invoice.pharmacieId);
                  return (
                    <TableRow key={invoice.id} hover>
                      <TableCell>{invoice.dateFacture}</TableCell>
                      <TableCell>{invoice.numero}</TableCell>
                      <TableCell>{pharmacieDisplayName(pharmacie)}</TableCell>
                      <TableCell>{invoice.hours.toFixed(2)} h</TableCell>
                      <TableCell><MoneyValue cents={invoice.amountCents} /></TableCell>
                      <TableCell><StatusChip kind="invoice" status={invoice.status} /></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelected(invoice)}>Détail</Button>
                          {invoice.status === 'GENERATED' ? <Button size="small" startIcon={<SendRoundedIcon />} onClick={() => setStatus(invoice.id, 'SENT')}>Envoyer</Button> : null}
                          {invoice.status !== 'PAID' && invoice.status !== 'ARCHIVED' && invoice.status !== 'VOIDED' ? <Button size="small" startIcon={<PaidRoundedIcon />} onClick={() => setStatus(invoice.id, 'PAID')}>Payée</Button> : null}
                          <LoadingButton
                            size="small"
                            variant="contained"
                            startIcon={<DownloadRoundedIcon />}
                            loading={downloadingId === invoice.id}
                            loadingLabel="Génération..."
                            onClick={() => downloadPdf(invoice)}
                          >
                            Télécharger PDF
                          </LoadingButton>
                          {invoice.status !== 'ARCHIVED' ? <Button size="small" color="inherit" startIcon={<ArchiveRoundedIcon />} onClick={() => setStatus(invoice.id, 'ARCHIVED')}>Archiver</Button> : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </SurfaceCard>
          </FadeIn>
        </PageSection>
      )}
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="invoice-detail-title"
        aria-describedby="invoice-detail-description"
        slotProps={{
          paper: {
            sx: { zIndex: 1400 },
          },
        }}
      >
        <DialogTitle id="invoice-detail-title">{selected?.numero}</DialogTitle>
        <DialogContent>
          {selected ? (
            <Stack id="invoice-detail-description" spacing={2}>
              <Typography>Statut: {invoiceStatusLabels[selected.status]}</Typography>
              <Typography>Échéance: {selected.dateEcheance}</Typography>
              <Typography>Heures: {selected.hours.toFixed(2)} h</Typography>
              <MoneyValue cents={selected.amountCents} variant="h4" />
              <Typography color="text.secondary">Les PDF sont générés automatiquement au format professionnel.</Typography>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
