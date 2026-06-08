import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { Alert, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useState } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { MoneyValue } from '../../components/MoneyValue';
import { PageBackButton } from '../../components/PageBackButton';
import { StatusChip } from '../../components/StatusChip';
import { apiUrl, assertBackendAvailable } from '../../services/api';
import { invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { exportAppState, updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus } from '../../storage/schema';
import { findPharmacie } from '../../storage/selectors';

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
      await assertBackendAvailable();
      const response = await fetch(apiUrl(`/invoices/${invoice.id}/pdf`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: JSON.parse(exportAppState()) }),
      });
      if (!response.ok) {
        console.error('[qa-pdf-download-failed]', { invoiceId: invoice.id, status: response.status, body: await response.text() });
        throw new Error('pdf failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.numero}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ severity: 'success', message: 'PDF téléchargé.' });
    } catch (error) {
      setToast({ severity: 'error', message: error instanceof Error && error.name === 'BACKEND_UNAVAILABLE' ? 'Serveur API inaccessible' : 'Le PDF n’a pas pu être généré. Vérifiez que le serveur est démarré puis réessayez.' });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <PageBackButton to="/activity" />
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Factures</Typography>
          <Typography variant="h2">Vue d’ensemble</Typography>
          <Typography color="text.secondary">Aperçu clair des factures générées, avec une facture imprimable 100% React inspirée du modèle existant.</Typography>
        </Stack>
      </Stack>
      {!state.invoices.length ? (
        <EmptyState title="Aucune facture" description="Les factures apparaîtront ici après génération depuis une mission." />
      ) : (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table>
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
                      <TableCell>{pharmacie?.nom ?? 'Pharmacie'}</TableCell>
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
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected?.numero}</DialogTitle>
        <DialogContent>
          {selected ? (
            <Stack spacing={2}>
              <Typography>Statut: {invoiceStatusLabels[selected.status]}</Typography>
              <Typography>Échéance: {selected.dateEcheance}</Typography>
              <Typography>Heures: {selected.hours.toFixed(2)} h</Typography>
              <MoneyValue cents={selected.amountCents} variant="h4" />
              <Typography color="text.secondary">Le PDF final est généré côté serveur avec Playwright.</Typography>
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
