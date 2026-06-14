import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { Alert, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useState } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { MoneyValue } from '../../components/MoneyValue';
import { BackHomeButton } from '../../components/BackHomeButton';
import { StatusChip } from '../../components/StatusChip';
import { invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { exportAppState, updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus } from '../../storage/schema';
import { findPharmacie, pharmacieDisplayName } from '../../storage/selectors';
import { getPlatformAsync } from '../../services/platformService';
import { logMappedError, mapError } from '../../services/errorMapper';

export function InvoicesPage() {
  const state = useAppState();
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  function setStatus(invoiceId: string, status: InvoiceStatus) {
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === invoiceId ? transitionInvoice(invoice, status) : invoice),
    }));
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
        setToast({ severity: 'success', message: 'PDF téléchargé.' });
      }
    } catch (error) {
      const mapped = mapError(error, { code: 'PDF_GENERATION_FAILED' });
      logMappedError(mapped, error);
      if (mapped.shouldDisplay) {
        setToast({ severity: 'error', message: mapped.message });
      }
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <BackHomeButton to="/activity" data-testid="invoices-back-button" />
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Factures</Typography>
          <Typography variant="h2">Vue d’ensemble</Typography>
          <Typography color="text.secondary">Aperçu clair des factures générées.</Typography>
        </Stack>
      </Stack>
      {!state.invoices.length ? (
        <EmptyState title="Aucune facture" description="Les factures apparaîtront ici après génération depuis une mission." />
      ) : (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table aria-label="Liste des factures">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Numéro</TableCell>
                  <TableCell>Pharmacie</TableCell>
                  <TableCell>Heures</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="right">Actions</TableCell>
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
                          <Button size="small" variant="contained" startIcon={<DownloadRoundedIcon />} disabled={downloadingId === invoice.id} onClick={() => downloadPdf(invoice)}>{downloadingId === invoice.id ? 'Génération...' : 'Télécharger PDF'}</Button>
                          {invoice.status !== 'ARCHIVED' ? <Button size="small" color="inherit" startIcon={<ArchiveRoundedIcon />} onClick={() => setStatus(invoice.id, 'ARCHIVED')}>Archiver</Button> : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth
        slotProps={{
          paper: {
            sx: { zIndex: 1400 },
          },
        }}
      >
        <DialogTitle>{selected?.numero}</DialogTitle>
        <DialogContent>
          {selected ? (
            <Stack spacing={2}>
              <Typography>Statut: {invoiceStatusLabels[selected.status]}</Typography>
              <Typography>Échéance: {selected.dateEcheance}</Typography>
              <Typography>Heures: {selected.hours.toFixed(2)} h</Typography>
              <MoneyValue cents={selected.amountCents} variant="h4" />
              <Typography color="text.secondary">Les PDF sont générés automatiquement au format professionnel.</Typography>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
      <Snackbar open={Boolean(toast)} autoHideDuration={3200} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
}
