import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {
  Box,
  Button,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { MoneyValue } from '../../components/MoneyValue';
import { StatusChip } from '../../components/StatusChip';
import { LoadingButton } from '../../components/LoadingButton';
import { FadeIn } from '../../components/FadeIn';
import { useNotifications } from '../../components/NotificationSystem';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { MetricCard } from '../../components/MetricCard';
import { invoiceStatusLabels, transitionInvoice, createInvoicePayment, addPaymentToInvoice } from '../../services/invoiceWorkflow';
import {
  buildInvoiceOperationalRows,
  filterInvoiceRows,
  type InvoiceQueue,
} from '../../services/invoiceOperations';
import { buildInvoicePipelineMetrics } from '../../services/dashboardMetrics';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoicePayment, InvoiceStatus } from '../../storage/schema';
import { findPharmacie, pharmacieDisplayName } from '../../storage/selectors';
import { downloadInvoicePdf } from '../../services/downloadInvoicePdf';
import { logMappedError, mapError } from '../../services/errorMapper';
import { undoManager } from '../../services/undoManager';
import { formatMoney } from '../../services/money';
import { todayIso } from '../../services/ids';
import { PaymentModal } from './PaymentModal';

const queueLabels: Record<InvoiceQueue, string> = {
  all: 'Toutes',
  to_collect: 'À encaisser',
  overdue: 'En retard',
  paid: 'Payées',
  archived: 'Archivées',
};

export function InvoicesPage() {
  const state = useAppState();
  const { notify } = useNotifications();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [queue, setQueue] = useState<InvoiceQueue>(() =>
    parseInvoiceQueue(searchParams.get('filter') ?? searchParams.get('queue')),
  );
  const [pharmacieIdFilter, setPharmacieIdFilter] = useState<string>(() => searchParams.get('pharmacieId') ?? '');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const today = todayIso();
  const rows = useMemo(() => buildInvoiceOperationalRows(state), [state]);
  const pipelineMetrics = useMemo(() => buildInvoicePipelineMetrics(state, today), [state, today]);
  const visibleRows = useMemo(
    () =>
      filterInvoiceRows(rows, queue, search).filter((row) =>
        pharmacieIdFilter ? row.invoice.pharmacieId === pharmacieIdFilter : true,
      ),
    [rows, queue, search, pharmacieIdFilter],
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.invoice.id)),
    [rows, selectedIds],
  );
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.invoice.id));

  useEffect(() => {
    setQueue(parseInvoiceQueue(searchParams.get('filter') ?? searchParams.get('queue')));
    setPharmacieIdFilter(searchParams.get('pharmacieId') ?? '');
  }, [searchParams]);

  function setStatus(invoiceId: string, status: InvoiceStatus, options?: { quiet?: boolean }) {
    const previousInvoice = state.invoices.find((invoice) => invoice.id === invoiceId);
    if (!previousInvoice) return;

    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) =>
        invoice.id === invoiceId ? transitionInvoice(invoice, status) : invoice,
      ),
    }));

    const undoId = undoManager.add({
      description: `Restaurer la facture ${previousInvoice.numero}`,
      undo: () => {
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.map((invoice) =>
            invoice.id === invoiceId ? previousInvoice : invoice,
          ),
        }));
      },
    });

    if (!options?.quiet) {
      notify({
        severity: 'success',
        message: `Facture ${invoiceStatusLabels[status].toLowerCase()}.`,
        onUndo: () => undoManager.undo(undoId),
      });
    }
  }

  function setBulkStatus(status: InvoiceStatus) {
    const actionableIds = selectedRows
      .filter((row) => row.invoice.status !== status && row.invoice.status !== 'VOIDED')
      .map((row) => row.invoice.id);
    if (!actionableIds.length) return;

    const previousInvoices = state.invoices.filter((invoice) => actionableIds.includes(invoice.id));
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) =>
        actionableIds.includes(invoice.id) ? transitionInvoice(invoice, status) : invoice,
      ),
    }));

    const undoId = undoManager.add({
      description: `Restaurer ${previousInvoices.length} facture${previousInvoices.length > 1 ? 's' : ''}`,
      undo: () => {
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.map(
            (invoice) => previousInvoices.find((previous) => previous.id === invoice.id) ?? invoice,
          ),
        }));
      },
    });

    setSelectedIds(new Set());
    notify({
      severity: 'success',
      message: `${actionableIds.length} facture${actionableIds.length > 1 ? 's' : ''} ${invoiceStatusLabels[status].toLowerCase()}${actionableIds.length > 1 ? 's' : ''}.`,
      onUndo: () => undoManager.undo(undoId),
    });
  }

  function toggleRow(invoiceId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleRows.forEach((row) => next.delete(row.invoice.id));
      else visibleRows.forEach((row) => next.add(row.invoice.id));
      return next;
    });
  }

  function setInvoiceQueue(nextQueue: InvoiceQueue) {
    setQueue(nextQueue);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('queue');
      if (nextQueue === 'all') next.delete('filter');
      else next.set('filter', nextQueue === 'to_collect' ? 'receivable' : nextQueue);
      return next;
    });
  }

  function savePayment(invoice: Invoice, input: Omit<InvoicePayment, 'id' | 'createdAt'>) {
    const payment = createInvoicePayment(invoice, input);
    const updatedInvoice = addPaymentToInvoice(invoice, payment, invoice.amountCents);
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((inv) => (inv.id === invoice.id ? updatedInvoice : inv)),
    }));
    notify({ severity: 'success', message: `Paiement de ${formatMoney(input.amount)} enregistré.` });
  }

  async function downloadPdf(invoice: Invoice) {
    setDownloadingId(invoice.id);
    try {
      const result = await downloadInvoicePdf(invoice, state);
      if (result.status === 'downloaded') {
        notify({ severity: 'success', message: 'PDF téléchargé.' });
      } else if (result.status === 'error') {
        throw result.error;
      }
    } catch (error) {
      const mapped = mapError(error, { code: 'PDF_GENERATION_FAILED' });
      logMappedError(mapped, error);
      if (mapped.shouldDisplay) {
        notify({
          severity: mapped.severity,
          message: mapped.message,
          persist: mapped.severity === 'error',
        });
      }
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Stack spacing={{ xs: 3, md: 4 }}>
      <PageHeader
        eyebrow="Factures"
        title="Encaissements"
        description="Suivez les paiements à recevoir, les retards et les encaissements sur l'ensemble de vos factures envoyées."
        data-testid="invoices-page-header"
      />
      {!state.invoices.length ? (
        <EmptyState
          title="Aucune facture"
          description="Les factures apparaîtront ici après génération depuis une mission."
        />
      ) : (
        <PageSection
          title="Suivi des paiements"
          description="Sélectionnez une ou plusieurs factures pour les opérations en lot."
        >
          <FadeIn>
            <Stack spacing={2.5}>
              <InvoiceSummaryStrip summary={pipelineMetrics} queue={queue} onQueueChange={setInvoiceQueue} />
              <SurfaceCard>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: { xs: 'stretch', md: 'center' },
                    }}
                  >
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={queue}
                      onChange={(_, value: InvoiceQueue | null) => value && setInvoiceQueue(value)}
                      aria-label="File de factures"
                      sx={{ flexWrap: 'wrap', gap: 0.75 }}
                    >
                      {(
                        ['all', 'to_collect', 'overdue', 'paid', 'archived'] as InvoiceQueue[]
                      ).map((item) => (
                        <ToggleButton
                          key={item}
                          value={item}
                          aria-label={queueLabels[item]}
                          sx={{ borderRadius: 1, border: 1, borderColor: 'divider' }}
                        >
                          {queueLabels[item]}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <TextField
                      size="small"
                      label="Rechercher"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="FAC-2026, MIS-..."
                      sx={{ minWidth: { md: 260 } }}
                    />
                  </Stack>
                  {selectedRows.length ? (
                    <Box
                      sx={(theme) => ({
                        display: 'flex',
                        gap: 1,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: theme.runtimeTokens.controlRadius,
                        bgcolor: theme.palette.action.hover,
                        border: `1px solid ${theme.palette.divider}`,
                      })}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 750 }}>
                        {selectedRows.length} sélectionnée{selectedRows.length > 1 ? 's' : ''}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<SendRoundedIcon />}
                        onClick={() => setBulkStatus('SENT')}
                      >
                        Marquer envoyées
                      </Button>
                      <Button
                        size="small"
                        startIcon={<PaidRoundedIcon />}
                        onClick={() => setBulkStatus('PAID')}
                      >
                        Marquer payées
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<ArchiveRoundedIcon />}
                        onClick={() => setBulkStatus('ARCHIVED')}
                      >
                        Archiver
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Effacer
                      </Button>
                    </Box>
                  ) : null}
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table aria-label="Liste des factures">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={selectedIds.size > 0 && !allVisibleSelected}
                              checked={allVisibleSelected}
                              onChange={toggleAllVisible}
                              slotProps={{
                                input: { 'aria-label': 'Sélectionner les factures visibles' },
                              }}
                            />
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Numéro
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Pharmacie
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Missions
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Échéance
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Montant
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Solde dû
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Statut
                          </TableCell>
                          <TableCell component="th" scope="col" align="right">
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visibleRows.map((row) => {
                          const invoice = row.invoice;
                          const pharmacie = findPharmacie(state, invoice.pharmacieId);
                          const selectedRow = selectedIds.has(invoice.id);
                          const canCollect =
                            (invoice.status === 'SENT' || invoice.status === 'sent') &&
                            invoice.paymentStatus !== 'paid';
                          return (
                            <TableRow
                              key={invoice.id}
                              hover
                              selected={selectedRow}
                              onClick={() => toggleRow(invoice.id)}
                              sx={(theme) => ({
                                cursor: 'pointer',
                                '&.Mui-selected': {
                                  bgcolor:
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(144, 202, 249, 0.14)'
                                      : 'rgba(25, 118, 210, 0.08)',
                                },
                              })}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedRow}
                                  onChange={() => toggleRow(invoice.id)}
                                  onClick={(event) => event.stopPropagation()}
                                  slotProps={{
                                    input: { 'aria-label': `Sélectionner ${invoice.numero}` },
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" sx={{ fontWeight: 750 }}>
                                    {invoice.numero}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {invoice.dateFacture}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>{pharmacieDisplayName(pharmacie)}</TableCell>
                              <TableCell>{row.missionCount}</TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2">{invoice.dateEcheance}</Typography>
                                  {row.isOverdue ? (
                                    <Typography variant="caption" color="error">
                                      En retard de {Math.abs(row.daysUntilDue)} j
                                    </Typography>
                                  ) : null}
                                  {!row.isOverdue && (invoice.status === 'SENT' || invoice.status === 'sent') ? (
                                    <Typography variant="caption" color="text.secondary">
                                      J-{row.daysUntilDue}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <MoneyValue cents={invoice.amountCents} />
                              </TableCell>
                              <TableCell>
                                <MoneyValue cents={invoice.balanceDue ?? invoice.amountCents} />
                              </TableCell>
                              <TableCell>
                                <StatusChip kind="invoice" status={invoice.status} />
                              </TableCell>
                              <TableCell align="right">
                                <Stack
                                  direction="row"
                                  sx={{ gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}
                                >
                                  {canCollect ? (
                                    <Button
                                      size="small"
                                      startIcon={<PaidRoundedIcon />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setPaymentInvoice(invoice);
                                      }}
                                    >
                                      Encaisser
                                    </Button>
                                  ) : null}
                                  <LoadingButton
                                    size="small"
                                    variant="contained"
                                    startIcon={<DownloadRoundedIcon />}
                                    loading={downloadingId === invoice.id}
                                    loadingLabel="Génération..."
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      downloadPdf(invoice);
                                    }}
                                  >
                                    PDF
                                  </LoadingButton>
                                  {invoice.status !== 'archived' && invoice.status !== 'ARCHIVED' ? (
                                    <Button
                                      size="small"
                                      color="inherit"
                                      startIcon={<ArchiveRoundedIcon />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setStatus(invoice.id, 'ARCHIVED');
                                      }}
                                    >
                                      Archiver
                                    </Button>
                                  ) : null}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {!visibleRows.length ? (
                      <EmptyState
                        title="Aucune facture dans cette file"
                        description="Ajustez les filtres ou videz la recherche pour retrouver les factures."
                      />
                    ) : null}
                  </Box>
                </Stack>
              </SurfaceCard>
            </Stack>
          </FadeIn>
        </PageSection>
      )}
      {paymentInvoice ? (
        <PaymentModal
          open={true}
          onClose={() => setPaymentInvoice(null)}
          onSave={(input) => {
            savePayment(paymentInvoice, input);
            setPaymentInvoice(null);
          }}
          invoice={paymentInvoice}
        />
      ) : null}
    </Stack>
  );
}

function InvoiceSummaryStrip({
  summary,
  queue,
  onQueueChange,
}: {
  summary: ReturnType<typeof buildInvoicePipelineMetrics>;
  queue: InvoiceQueue;
  onQueueChange: (queue: InvoiceQueue) => void;
}) {
  const items = [
    {
      queue: 'to_collect' as const,
      label: 'À encaisser',
      value: formatMoney(summary.receivableCents),
      helper: `${summary.receivableCount} facture${summary.receivableCount !== 1 ? 's' : ''}`,
      tone: 'primary',
    },
    {
      queue: 'overdue' as const,
      label: 'En retard',
      value: String(summary.overdueCount),
      helper: formatMoney(summary.overdueCents),
      tone: 'warning',
    },
    {
      queue: 'paid' as const,
      label: 'Payées',
      value: String(summary.paidCount),
      helper: formatMoney(summary.paidCents),
      tone: 'success',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 1.5,
      }}
    >
      {items.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          helperText={item.helper}
          tone={item.tone as 'default' | 'primary' | 'success' | 'warning' | 'error'}
          actionLabel={queue === item.queue ? 'Filtre actif' : 'Filtrer'}
          onAction={() => onQueueChange(item.queue)}
          compact
        />
      ))}
    </Box>
  );
}

function parseInvoiceQueue(value: string | null): InvoiceQueue {
  if (value === 'receivable') return 'to_collect';
  if (
    value === 'all' ||
    value === 'to_collect' ||
    value === 'overdue' ||
    value === 'paid' ||
    value === 'archived'
  ) {
    return value;
  }
  return 'all';
}
