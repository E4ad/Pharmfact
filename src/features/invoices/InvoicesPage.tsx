import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
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
import { invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { invoiceMissionIds } from '../../services/businessRules';
import {
  buildInvoiceOperationalRows,
  filterInvoiceRows,
  type InvoiceOperationalRow,
  type InvoiceQueue,
} from '../../services/invoiceOperations';
import { buildInvoicePipelineMetrics } from '../../services/dashboardMetrics';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus } from '../../storage/schema';
import { findPharmacie, pharmacieDisplayName } from '../../storage/selectors';
import { downloadInvoicePdf } from '../../services/downloadInvoicePdf';
import { logMappedError, mapError } from '../../services/errorMapper';
import { undoManager } from '../../services/undoManager';
import { formatMoney } from '../../services/money';
import type { AppState } from '../../storage/schema';
import { mergeGeneratedInvoices, splitGeneratedInvoiceMissions } from '../../services/invoiceGrouping';
import { todayIso } from '../../services/ids';

const queueLabels: Record<InvoiceQueue, string> = {
  all: 'Toutes',
  active: 'Actives',
  archived: 'Archivées',
  to_send: 'À envoyer',
  overdue: 'En retard',
  sent: 'À encaisser',
  paid: 'Payées',
  attention: 'À vérifier',
  corrected_originals: 'Originaux corrigés',
  corrected_versions: 'Versions à transmettre',
};

function getInvoiceRelations(state: AppState, invoice: Invoice) {
  const originalInvoice = invoice.correctedFromInvoiceId
    ? state.invoices.find((item) => item.id === invoice.correctedFromInvoiceId)
    : undefined;
  const correctedInvoices = state.invoices.filter(
    (item) => item.correctedFromInvoiceId === invoice.id,
  );
  return { originalInvoice, correctedInvoices };
}

export function InvoicesPage() {
  const state = useAppState();
  const { notify } = useNotifications();
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [queue, setQueue] = useState<InvoiceQueue>(() =>
    parseInvoiceQueue(searchParams.get('filter') ?? searchParams.get('queue')),
  );
  const [pharmacieIdFilter, setPharmacieIdFilter] = useState<string>(() => searchParams.get('pharmacieId') ?? '');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [splitMissionIds, setSplitMissionIds] = useState<Set<string>>(() => new Set());
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
  const selectedDetailRow = useMemo(
    () => rows.find((row) => row.invoice.id === selected?.id),
    [rows, selected],
  );
  const selectedRelations = useMemo(
    () => (selected ? getInvoiceRelations(state, selected) : null),
    [state, selected],
  );
  const selectedPharmacyIds = useMemo(
    () => [...new Set(selectedRows.map((row) => row.invoice.pharmacieId).filter(Boolean))],
    [selectedRows],
  );
  const canGroupSelected =
    selectedRows.length > 1 &&
    selectedPharmacyIds.length === 1 &&
    selectedRows.every((row) => row.invoice.status === 'GENERATED');
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.invoice.id));

  useEffect(() => {
    setQueue(parseInvoiceQueue(searchParams.get('filter') ?? searchParams.get('queue')));
    setPharmacieIdFilter(searchParams.get('pharmacieId') ?? '');
  }, [searchParams]);

  useEffect(() => {
    setSplitMissionIds(new Set());
  }, [selected?.id]);

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
      else next.set('filter', nextQueue === 'sent' ? 'receivable' : nextQueue);
      return next;
    });
  }

  function groupSelectedInvoices() {
    if (!canGroupSelected) return;

    try {
      const result = mergeGeneratedInvoices(
        state,
        selectedRows.map((row) => row.invoice.id),
      );

      updateAppState(() => result.state);
      setSelectedIds(new Set());
      notify({
        severity: 'success',
        message: `Facture groupée ${result.newInvoice.numero} créée pour ${selectedRows.length} facture(s).`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de regrouper les factures.';
      notify({ severity: 'error', message, persist: true });
    }
  }

  function splitSelectedMissionIds(invoice: Invoice) {
    const missionIds = [...splitMissionIds];
    if (!missionIds.length) return;

    try {
      const result = splitGeneratedInvoiceMissions(state, invoice.id, missionIds);
      updateAppState(() => result.state);
      setSelected(result.newInvoice);
      setSplitMissionIds(new Set());
      notify({
        severity: 'success',
        message: `Nouvelle facture ${result.newInvoice.numero} créée à partir de ${invoice.numero}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de dissocier cette facture.';
      notify({ severity: 'error', message, persist: true });
    }
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
        title="Factures & encaissements"
        description="Priorisez les factures à envoyer, les retards, les encaissements et les écarts à corriger avant réédition."
        data-testid="invoices-page-header"
      />
      {!state.invoices.length ? (
        <EmptyState
          title="Aucune facture"
          description="Les factures apparaîtront ici après génération depuis une mission."
        />
      ) : (
        <PageSection
          title="File opérationnelle"
          description="Les factures avec anomalie ou échéance dépassée remontent en premier. Sélectionnez une ou plusieurs lignes pour les actions répétitives."
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
                        [
                          'all',
                          'attention',
                          'corrected_originals',
                          'corrected_versions',
                          'overdue',
                          'to_send',
                          'sent',
                          'paid',
                          'archived',
                        ] as InvoiceQueue[]
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
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={groupSelectedInvoices}
                        disabled={!canGroupSelected}
                        title={
                          canGroupSelected
                            ? undefined
                            : 'Sélectionnez au moins deux factures générées d’une même pharmacie.'
                        }
                      >
                        Regrouper
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
                            Priorité
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Date
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
                            Heures
                          </TableCell>
                          <TableCell component="th" scope="col">
                            Montant
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
                          const { originalInvoice, correctedInvoices } = getInvoiceRelations(state, invoice);
                          const selectedRow = selectedIds.has(invoice.id);
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
                                <Stack spacing={0.5}>
                                  <Chip
                                    size="small"
                                    color={
                                      row.priority === 3
                                        ? 'error'
                                        : row.priority === 2
                                          ? 'warning'
                                          : row.priority === 1
                                            ? 'primary'
                                            : 'default'
                                    }
                                    variant={row.priority === 0 ? 'outlined' : 'filled'}
                                    label={row.priorityLabel}
                                  />
                                  {row.consistencyIssues.length ? (
                                    <Tooltip
                                      title={row.consistencyIssues
                                        .map((issue) => issue.detail)
                                        .join(' ')}
                                    >
                                      <Chip
                                        size="small"
                                        icon={<WarningAmberRoundedIcon />}
                                        color="warning"
                                        variant="outlined"
                                        label={`${row.consistencyIssues.length} écart`}
                                      />
                                    </Tooltip>
                                  ) : null}
                                  {row.hasCorrectedVersions ? (
                                    <Chip
                                      size="small"
                                      color="info"
                                      variant="outlined"
                                      label={`${row.correctedVersionCount} version${row.correctedVersionCount > 1 ? 's' : ''} corrigée${row.correctedVersionCount > 1 ? 's' : ''}`}
                                    />
                                  ) : null}
                                  {row.isCorrectedVersion ? (
                                    <Chip
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                      label="Version corrigée"
                                    />
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>{invoice.dateFacture}</TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" sx={{ fontWeight: 750 }}>
                                    {invoice.numero}
                                  </Typography>
                                  {invoice.correctedFromInvoiceId ? (
                                    <Typography variant="caption" color="text.secondary">
                                      Version corrigée de {originalInvoice?.numero ?? 'la facture d’origine'}
                                    </Typography>
                                  ) : correctedInvoices.length ? (
                                    <Typography variant="caption" color="text.secondary">
                                      Corrigée par {correctedInvoices.length} version{correctedInvoices.length > 1 ? 's' : ''}
                                    </Typography>
                                  ) : null}
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
                                  {!row.isOverdue && invoice.status === 'SENT' ? (
                                    <Typography variant="caption" color="text.secondary">
                                      J-{row.daysUntilDue}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell>{invoice.hours.toFixed(2)} h</TableCell>
                              <TableCell>
                                <MoneyValue cents={invoice.amountCents} />
                              </TableCell>
                              <TableCell>
                                <StatusChip kind="invoice" status={invoice.status} />
                              </TableCell>
                              <TableCell align="right">
                                <Stack
                                  direction="row"
                                  sx={{ gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}
                                >
                                  <Button
                                    size="small"
                                    startIcon={<VisibilityRoundedIcon />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelected(invoice);
                                    }}
                                  >
                                    Détail
                                  </Button>
                                  {invoice.status === 'GENERATED' ? (
                                    <Button
                                      size="small"
                                      startIcon={<SendRoundedIcon />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setStatus(invoice.id, 'SENT');
                                      }}
                                    >
                                      Envoyer
                                    </Button>
                                  ) : null}
{invoice.status !== 'sent' &&
                                   invoice.status !== 'archived' &&
                                   invoice.status !== 'VOIDED' &&
                                   invoice.status !== 'GENERATED' &&
                                   invoice.status !== 'PAID' ? (
                                     <Button
                                       size="small"
                                       startIcon={<PaidRoundedIcon />}
                                       onClick={(event) => {
                                         event.stopPropagation();
                                         setStatus(invoice.id, 'sent');
                                       }}
                                     >
                                       Payée
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
                                    Télécharger PDF
                                  </LoadingButton>
{invoice.status !== 'archived' && invoice.status !== 'ARCHIVED' ? (
                                     <Button
                                       size="small"
                                       color="inherit"
                                       startIcon={<ArchiveRoundedIcon />}
                                       onClick={(event) => {
                                         event.stopPropagation();
                                         setStatus(invoice.id, 'archived');
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
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="md"
        fullWidth
        aria-labelledby="invoice-detail-title"
        aria-describedby="invoice-detail-description"
        slotProps={{
          paper: {
            sx: {
              zIndex: 1400,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <DialogTitle id="invoice-detail-title">{selected?.numero}</DialogTitle>
        <DialogContent sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {selected ? (
            <Stack id="invoice-detail-description" spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <LoadingButton
                  size="small"
                  variant="contained"
                  startIcon={<DownloadRoundedIcon />}
                  loading={downloadingId === selected.id}
                  loadingLabel="Génération..."
                  onClick={() => downloadPdf(selected)}
                >
                  Télécharger le PDF
                </LoadingButton>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => setSelected(null)}
                >
                  Fermer
                </Button>
              </Stack>
              <Box>
                <Typography variant="body2" color="text.secondary">Statut</Typography>
                <Typography sx={{ fontWeight: 750 }}>{invoiceStatusLabels[selected.status]}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Échéance</Typography>
                <Typography sx={{ fontWeight: 750 }}>{selected.dateEcheance}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Missions</Typography>
                <Typography sx={{ fontWeight: 750 }}>{invoiceMissionIds(selected).join(', ') || '—'}</Typography>
              </Box>
              {selected ? (
                <InvoiceRelationBlock
                  invoice={selected}
                  originalInvoice={selectedRelations?.originalInvoice}
                  correctedInvoices={selectedRelations?.correctedInvoices ?? []}
                  onSelectRelated={(nextInvoice) => setSelected(nextInvoice)}
                />
              ) : null}
              {selectedDetailRow?.consistencyIssues.length ? (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Points à vérifier</Typography>
                  {selectedDetailRow.consistencyIssues.map((issue) => (
                    <Chip
                      key={issue.id}
                      color={issue.severity === 'error' ? 'error' : 'warning'}
                      variant="outlined"
                      label={`${issue.label}: ${issue.detail}`}
                      sx={{
                        justifyContent: 'flex-start',
                        height: 'auto',
                        py: 0.75,
                        '& .MuiChip-label': { whiteSpace: 'normal' },
                      }}
                    />
                  ))}
                </Stack>
              ) : null}
              {selected.paymentTerms ? (
                <Typography>Conditions: {selected.paymentTerms}</Typography>
              ) : null}
              {selected.smallSupplierMention ? (
                <Typography color="text.secondary">{selected.smallSupplierMention}</Typography>
              ) : null}
              <Typography>Heures: {selected.hours.toFixed(2)} h</Typography>
              <MoneyValue cents={selected.amountCents} variant="h4" />
              <Typography color="text.secondary">
                Les PDF sont générés automatiquement au format professionnel.
              </Typography>
              {invoiceMissionIds(selected).length > 1 ? (
                <SurfaceCard contentSx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Dissocier
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cochez les missions à extraire dans une nouvelle facture. Disponible uniquement pour une facture générée.
                    </Typography>
                    <Stack spacing={0.5}>
                      {invoiceMissionIds(selected).map((missionId) => {
                        const checked = splitMissionIds.has(missionId);
                        const mission = state.missions.find((item) => item.id === missionId);
                        return (
                          <Button
                            key={missionId}
                            variant="text"
                            color="inherit"
                            onClick={() =>
                              setSplitMissionIds((current) => {
                                const next = new Set(current);
                                if (next.has(missionId)) next.delete(missionId);
                                else next.add(missionId);
                                return next;
                              })
                            }
                            disabled={selected.status !== 'GENERATED'}
                            sx={{
                              justifyContent: 'flex-start',
                              gap: 1,
                              textTransform: 'none',
                              px: 1,
                              py: 0.5,
                            }}
                          >
                            <Checkbox checked={checked} tabIndex={-1} disableRipple />
                            <Box sx={{ textAlign: 'left' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {mission?.missionCode ?? missionId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {mission?.dateDebut ?? '—'} · {mission?.dateFin ?? '—'}
                              </Typography>
                            </Box>
                          </Button>
                        );
                      })}
                    </Stack>
                    <Button
                      variant="outlined"
                      onClick={() => splitSelectedMissionIds(selected)}
                      disabled={selected.status !== 'GENERATED' || splitMissionIds.size === 0 || splitMissionIds.size === invoiceMissionIds(selected).length}
                    >
                      Créer une facture séparée
                    </Button>
                  </Stack>
                </SurfaceCard>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function InvoiceRelationBlock({
  invoice,
  originalInvoice,
  correctedInvoices,
  onSelectRelated,
}: {
  invoice: Invoice;
  originalInvoice?: Invoice;
  correctedInvoices: Invoice[];
  onSelectRelated: (invoice: Invoice) => void;
}) {
  if (!originalInvoice && !correctedInvoices.length) return null;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Traçabilité</Typography>
      {originalInvoice ? (
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Cette facture corrige {originalInvoice.numero}.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onSelectRelated(originalInvoice)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Ouvrir la facture d’origine
          </Button>
        </Stack>
      ) : null}
      {correctedInvoices.length ? (
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            {invoice.numero} a {correctedInvoices.length} version{correctedInvoices.length > 1 ? 's' : ''} corrigée{correctedInvoices.length > 1 ? 's' : ''}.
          </Typography>
          {correctedInvoices.map((item) => (
            <Button
              key={item.id}
              size="small"
              variant="text"
              onClick={() => onSelectRelated(item)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Ouvrir {item.numero}
            </Button>
          ))}
        </Stack>
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
      queue: 'to_send' as const,
      label: 'À envoyer',
      value: String(summary.toSendCount),
      helper: formatMoney(summary.toSendCents),
      tone: 'primary',
    },
    {
      queue: 'sent' as const,
      label: 'À encaisser',
      value: formatMoney(summary.receivableCents),
      helper: `${summary.receivableCount} facture${summary.receivableCount > 1 ? 's' : ''}`,
      tone: 'primary',
    },
    {
      queue: 'overdue' as const,
      label: 'Échues',
      value: String(summary.overdueCount),
      helper: formatMoney(summary.overdueCents),
      tone: 'warning',
    },
    {
      queue: 'attention' as const,
      label: 'À vérifier',
      value: String(summary.toVerifyCount),
      helper: 'Écart mission/facture',
      tone: 'error',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
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
  if (value === 'receivable') return 'sent';
  if (
    value === 'all' ||
    value === 'to_send' ||
    value === 'overdue' ||
    value === 'sent' ||
    value === 'paid' ||
    value === 'archived' ||
    value === 'attention' ||
    value === 'corrected_originals' ||
    value === 'corrected_versions'
  ) {
    return value;
  }
  return 'all';
}
