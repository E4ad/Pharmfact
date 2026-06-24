import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { brandColors, borderWidth, borderRadiusScale, typographyScale } from '../../design-system/tokens';
import { FadeIn } from '../../components/FadeIn';
import { MissionSummaryPanel } from './components/MissionSummaryPanel';
import { LoadingButton } from '../../components/LoadingButton';
import { StatusChip } from '../../components/StatusChip';
import { useNotifications } from '../../components/NotificationSystem';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { MetricCard } from '../../components/MetricCard';
import { buildMissionIcs, downloadIcs } from '../../services/calendarIcs';
import { createId } from '../../services/ids';
import { expenseTypeConfig } from '../../services/expenseTypes';
import { createInvoiceFromMission, createInvoiceFromMissions, transitionInvoice } from '../../services/invoiceWorkflow';
import type { BusinessMissionStatus } from '../../services/businessRules';
import { businessMissionStatusLabels, businessMissionStatusTone, deriveMissionBusinessStatus, missionsReadyToInvoice } from '../../services/businessRules';
import { buildMissionWindowMetrics } from '../../services/dashboardMetrics';
import { formatMoney } from '../../services/money';
import { daysBetween } from '../../services/missionCalculator';
import { missionStatusLabels, missionStatusTone } from '../../services/missionStatus';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { AppState, Invoice, InvoicePayment, InvoiceStatus, Mission, MissionStatus, MissionDay, MissionEvent, Pharmacie, PharmacyWeeklySchedule, Pharmacien } from '../../storage/schema';
import { downloadInvoicePdf } from '../../services/downloadInvoicePdf';
import { logMappedError, mapError } from '../../services/errorMapper';
import { findInvoice, findPharmacien, findPharmacie, missionInvoice, pharmacieDisplayName } from '../../storage/selectors';
import { undoManager } from '../../services/undoManager';
import { todayIso } from '../../services/ids';

type MissionFocus = 'all' | 'upcoming7d' | 'estimated7d' | 'toInvoice' | 'toFinalize';

type MissionFilterStatus = MissionStatus | 'ALL' | 'ready_to_invoice' | 'invoice_draft' | 'invoice_sent';
const missionFilterOptions: Array<{ value: MissionFilterStatus; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'CONFIRMED', label: 'Planifiée' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'ready_to_invoice', label: 'Prêt à facturer' },
  { value: 'invoice_draft', label: 'Facture à finaliser' },
  { value: 'invoice_sent', label: 'Facturée' },
  { value: 'ARCHIVED', label: 'Archivée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

function missionStatusDisplayLabel(mission: Mission, invoice?: Invoice): string {
  return businessMissionStatusLabels[deriveMissionBusinessStatus(mission, invoice)];
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`));
}

function isSingleDayMission(mission: Mission): boolean {
  return mission.dateDebut === mission.dateFin || mission.days.length <= 1;
}

function firstShiftLabel(mission: Mission, options?: { includeHours?: boolean }): string {
  const firstDay = [...mission.days].sort((a, b) => `${a.dateService}${a.startTime}`.localeCompare(`${b.dateService}${b.startTime}`))[0];
  if (!firstDay) return `${formatShortDate(mission.dateDebut)} · heure à préciser`;
  const workedHours = options?.includeHours ? ` (${hoursLabel(firstDay.hours)})` : '';
  return `${formatShortDate(firstDay.dateService)} · ${firstDay.startTime}–${firstDay.endTime}${workedHours}`;
}

function hoursLabel(hours: number): string {
  return `${hours.toFixed(2).replace('.', ',')} h`;
}

function addressLabel(pharmacie?: Pharmacie): string {
  if (!pharmacie) return 'Adresse non renseignée';
  const city = pharmacie.ville ? `${pharmacie.ville}${pharmacie.codePostal ? `, QC ${pharmacie.codePostal}` : ''}` : '';
  return [pharmacie.adresse, city].filter(Boolean).join(' · ') || 'Adresse non renseignée';
}

function formatMissionDatesSummary(dates: string[]): string {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) return 'Dates à préciser';
  const formatter = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  if (sorted.length === 1) return formatter.format(new Date(`${sorted[0]}T00:00:00`));
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const consecutive = daysBetween(first, last).length === sorted.length;
  if (consecutive) {
    return `du ${new Intl.DateTimeFormat('fr-CA', { day: 'numeric' }).format(new Date(`${first}T00:00:00`))} au ${formatter.format(new Date(`${last}T00:00:00`))}`;
  }
  if (sorted.length <= 4) {
    const parts = sorted.map((date) => new Intl.DateTimeFormat('fr-CA', { day: 'numeric' }).format(new Date(`${date}T00:00:00`)));
    return `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' et ' : ''}${parts.at(-1)} ${new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(new Date(`${first}T00:00:00`))}`;
  }
  return `${sorted.length} jours sélectionnés`;
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function parseMissionFocus(value: string | null): MissionFocus {
  if (value === 'upcoming_7d' || value === 'upcoming7d') return 'upcoming7d';
  if (value === 'estimated_7d' || value === 'estimated7d') return 'estimated7d';
  if (value === 'to_invoice' || value === 'toInvoice') return 'toInvoice';
  if (value === 'to_finalize' || value === 'toFinalize') return 'toFinalize';
  return 'all';
}

function matchesMissionFocus(
  mission: Mission,
  focus: MissionFocus,
  todayIsoValue: string,
  windowEndIso: string,
  state: AppState,
): boolean {
  if (focus === 'all') return true;
  if (focus === 'upcoming7d') {
    return mission.status !== 'ARCHIVED' && mission.status !== 'CANCELLED' && mission.dateDebut >= todayIsoValue && mission.dateDebut <= windowEndIso;
  }
  if (focus === 'estimated7d') {
    return (
      mission.status !== 'ARCHIVED' &&
      mission.status !== 'CANCELLED' &&
      mission.dateDebut <= windowEndIso &&
      mission.dateFin >= todayIsoValue &&
      (mission.status === 'CONFIRMED' || mission.status === 'IN_PROGRESS' || mission.status === 'COMPLETED')
    );
  }
  if (focus === 'toInvoice') {
    return mission.status === 'COMPLETED' && !mission.invoiceId;
  }
  if (focus === 'toFinalize') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'draft' || invoice.status === 'ready_to_send'));
  }
  return true;
}

function matchesMissionStatusFilter(mission: Mission, filter: MissionFilterStatus, state: AppState): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'ready_to_invoice') return mission.status === 'COMPLETED' && !mission.invoiceId;
  if (filter === 'invoice_draft') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'draft' || invoice.status === 'ready_to_send'));
  }
  if (filter === 'invoice_sent') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'SENT' || invoice.status === 'GENERATED'));
  }
  return mission.status === filter;
}

export function MissionsPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('selected'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MissionFilterStatus>('ALL');
  const [focusFilter, setFocusFilter] = useState<MissionFocus>(() => parseMissionFocus(searchParams.get('filter') ?? searchParams.get('focus')));
  const today = todayIso();
  const missionMetrics = useMemo(() => buildMissionWindowMetrics(state, today), [state, today]);

  const invoicesToFinalizeCount = useMemo(
    () => state.invoices.filter((inv) => inv.status === 'draft' || inv.status === 'ready_to_send').length,
    [state.invoices],
  );
  const invoicesToFinalizeCents = useMemo(
    () => state.invoices.filter((inv) => inv.status === 'draft' || inv.status === 'ready_to_send').reduce((sum, inv) => sum + inv.amountCents, 0),
    [state.invoices],
  );

  const missions = useMemo(
    () =>
      [...state.missions]
        .filter((mission) => matchesMissionStatusFilter(mission, statusFilter, state))
        .filter((mission) => matchesMissionFocus(mission, focusFilter, today, missionMetrics.windowEndIso, state))
        .sort((a, b) => `${b.dateDebut}${b.createdAt}`.localeCompare(`${a.dateDebut}${a.createdAt}`)),
    [state.missions, statusFilter, focusFilter, today, missionMetrics.windowEndIso, state],
  );

  const firstMissionIdsByPharmacy = useMemo(() => {
    const firstByPharmacy = new Map<string, Mission>();
    state.missions.forEach((mission) => {
      const current = firstByPharmacy.get(mission.pharmacieId);
      if (!current || `${mission.dateDebut}${mission.createdAt}`.localeCompare(`${current.dateDebut}${current.createdAt}`) < 0) {
        firstByPharmacy.set(mission.pharmacieId, mission);
      }
    });
    return new Set([...firstByPharmacy.values()].map((mission) => mission.id));
  }, [state.missions]);

  const selected = state.missions.find((mission) => mission.id === selectedId);
  const selectedInvoice = selected
    ? findInvoice(state, selected.invoiceId) ?? missionInvoice(state, selected)
    : undefined;
  const invoiceReadyGroups = useMemo(() => {
    const groups = new Map<string, Mission[]>();
    missionsReadyToInvoice(state).forEach((mission) => {
      groups.set(mission.pharmacieId, [...(groups.get(mission.pharmacieId) ?? []), mission]);
    });
    return [...groups.entries()].map(([pharmacieId, groupMissions]) => ({
      pharmacie: findPharmacie(state, pharmacieId),
      missions: groupMissions,
    }));
  }, [state]);

  useEffect(() => {
    document.title = 'Missions · Pharmfact';
  }, []);

  useEffect(() => {
    const selected = searchParams.get('selected');
    setSelectedId(selected);
  }, [searchParams]);

  useEffect(() => {
    setFocusFilter(parseMissionFocus(searchParams.get('filter') ?? searchParams.get('focus')));
  }, [searchParams]);

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.delete('selected');
          return next;
        });
        setHistoryOpen(false);
      }
    }
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, []);

  function openMission(missionId: string) {
    setSelectedId(missionId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('selected', missionId);
      return next;
    });
    setHistoryOpen(false);
  }

  function closeMission() {
    setSelectedId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('selected');
      return next;
    });
    setHistoryOpen(false);
  }

  function setMissionFocus(focus: MissionFocus) {
    setFocusFilter(focus);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('focus');
      if (focus === 'all') next.delete('filter');
      else if (focus === 'toInvoice') next.set('filter', 'to_invoice');
      else if (focus === 'toFinalize') next.set('filter', 'to_finalize');
      else next.set('filter', focus);
      return next;
    });
  }

  function setMissionStatusFilter(filter: MissionFilterStatus) {
    setStatusFilter(filter);
  }

  function generateInvoice(mission: Mission) {
    const currentMission = state.missions.find((item) => item.id === mission.id);
    if (!currentMission || currentMission.invoiceId) return;
    const invoice = createInvoiceFromMission(currentMission, state);

    updateAppState((current) => ({
      ...current,
      invoices: [...current.invoices, invoice],
      missions: current.missions.map((item) =>
        item.id === mission.id
          ? {
              ...item,
              invoiceId: invoice.id,
              events: [
                ...item.events,
                { id: createId('evt'), eventType: 'INVOICE_CREATED', label: `Facture ${invoice.numero} générée`, eventDate: new Date().toISOString() },
              ],
            }
          : item,
      ),
    }));

    const undoId = undoManager.add({
      description: `Supprimer la facture ${invoice.numero}`,
      undo: () => {
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.filter((item) => item.id !== invoice.id),
          missions: current.missions.map((item) => (item.id === currentMission.id ? currentMission : item)),
        }));
      },
    });

    notify({
      severity: 'success',
      message: `Facture ${invoice.numero} générée.`,
      onUndo: () => undoManager.undo(undoId),
    });
  }

  function generateGroupedInvoice(groupMissions: Mission[]) {
    if (!groupMissions.length) return;
    const invoice = createInvoiceFromMissions(groupMissions, state);
    const missionIds = new Set(groupMissions.map((mission) => mission.id));

    updateAppState((current) => ({
      ...current,
      invoices: [...current.invoices, invoice],
      missions: current.missions.map((item) =>
        missionIds.has(item.id)
          ? {
              ...item,
              invoiceId: invoice.id,
              events: [
                ...item.events,
                { id: createId('evt'), eventType: 'INVOICE_CREATED', label: `Facture ${invoice.numero} générée`, eventDate: new Date().toISOString() },
              ],
            }
          : item,
      ),
    }));

    notify({ severity: 'success', message: `Facture ${invoice.numero} générée pour ${groupMissions.length} mission(s).` });
  }

  function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    const previousInvoice = state.invoices.find((invoice) => invoice.id === invoiceId);
    if (!previousInvoice || previousInvoice.status === status) return;

    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => (invoice.id === invoiceId ? transitionInvoice(invoice, status) : invoice)),
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
      message: `Facture ${previousInvoice.numero} passée en « ${previousInvoice.status === 'GENERATED' ? 'Brouillon' : previousInvoice.status === 'SENT' ? 'Envoyée' : previousInvoice.status === 'PAID' ? 'Payée' : previousInvoice.status === 'ARCHIVED' ? 'Archivée' : previousInvoice.status} ».`,
      onUndo: () => undoManager.undo(undoId),
    });
  }

  function downloadCalendar(mission: Mission) {
    const pharmacien = findPharmacien(state, mission.pharmacienId);
    const pharmacie = findPharmacie(state, mission.pharmacieId);
    downloadIcs(`${mission.missionCode}.ics`, buildMissionIcs(mission, pharmacien, pharmacie));
    notify({ severity: 'success', message: 'Invitation calendrier téléchargée.' });
  }

  async function downloadPdf(invoiceId: string) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
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
        notify({ severity: mapped.severity, message: mapped.message, persist: mapped.severity === 'error' });
      }
    }
  }

  function toggleFavoritePharmacie(pharmacieId: string) {
    updateAppState((current) => ({
      ...current,
      pharmacies: current.pharmacies.map((item) =>
        item.id === pharmacieId ? { ...item, isFavorite: !item.isFavorite } : item,
      ),
    }));
  }

  const compactHeaderSx = {
    minHeight: { xs: 96, md: 112 },
    px: { xs: 2, md: 2.5 },
    py: { xs: 1.5, md: 2 },
    borderRadius: borderRadiusScale.xl,
  };

  return (
    <Stack spacing={{ xs: 2.5, md: 3 }} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <PageHeader
        eyebrow="MISSIONS"
        title="Missions"
        description="Suivez vos remplacements, préparez la facturation et gardez le suivi opérationnel au même endroit."
        backTo="/"
        backLabel="Accueil"
        data-testid="missions-page-header"
        actions={
          <Button
            variant="contained"
            onClick={() => navigate('/missions/new')}
            sx={{
              bgcolor: 'common.white',
              color: 'primary.dark',
              fontWeight: 800,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            Créer une mission
          </Button>
        }
        sx={compactHeaderSx}
      />

      <PageSection
        title="Pilotage des missions"
        description="Repérez les missions à venir, les missions à facturer et les montants à suivre."
        spacing={2}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2)', md: 'repeat(4)' },
            gap: 1.5,
          }}
        >
          {[
            { label: 'À venir — 7 jours', value: String(missionMetrics.upcomingCount), helper: focusFilter === 'upcoming7d' ? 'Filtre actif sur la liste' : 'Cliquez pour filtrer la file', tone: 'primary' as const, action: () => setMissionFocus('upcoming7d') },
            { label: 'Montant estimé — 7 jours', value: formatMoney(missionMetrics.estimatedCents), helper: focusFilter === 'estimated7d' ? 'Filtre actif sur la liste' : 'Missions actives dans la fenêtre', tone: 'success' as const, action: () => setMissionFocus('estimated7d') },
            { label: 'À facturer', value: String(missionMetrics.toInvoiceCount), helper: focusFilter === 'toInvoice' ? 'Filtre actif sur la liste' : formatMoney(missionMetrics.toInvoiceCents), tone: 'warning' as const, action: () => setMissionFocus('toInvoice') },
            { label: 'Factures à finaliser', value: String(invoicesToFinalizeCount), helper: formatMoney(invoicesToFinalizeCents), tone: 'default' as const, action: undefined },
          ].map((kpi) => (
            <Box key={kpi.label} sx={{ borderRadius: 8, overflow: 'hidden' }}>
              <MetricCard
                label={kpi.label}
                value={kpi.value}
                helperText={kpi.helper}
                tone={kpi.tone}
                actionLabel="Filtrer"
                onAction={kpi.action}
                compact
              />
            </Box>
          ))}
        </Box>
      </PageSection>

      {invoiceReadyGroups.length ? (
        <PageSection title="Missions à facturer" description="Les regroupements sont limités aux missions d'une même pharmacie." spacing={2}>
          <Stack spacing={1.5}>
            {invoiceReadyGroups.map((group) => (
              <SurfaceCard key={group.pharmacie?.id ?? group.missions[0]?.pharmacieId} contentSx={{ p: 2 }} sx={{ borderRadius: borderRadiusScale.xl }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{pharmacieDisplayName(group.pharmacie)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.missions.length} mission(s) · {formatMoney(group.missions.reduce((sum, mission) => sum + mission.totalCents, 0))}
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={() => generateGroupedInvoice(group.missions)}>
                    Générer facture groupée
                  </Button>
                </Stack>
              </SurfaceCard>
            ))}
          </Stack>
        </PageSection>
      ) : null}

      <PageSection
        title="File de missions"
        description={`${missions.length} mission${missions.length > 1 ? 's' : ''} affichée${missions.length > 1 ? 's' : ''}. Filtrez par état pour prioriser le suivi.`}
        spacing={2}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }} role="group" aria-label="Filtrer les missions par statut">
          {missionFilterOptions.map((option) => {
            const active = statusFilter === option.value;
            return (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => setMissionStatusFilter(option.value)}
                sx={(theme) => ({
                  height: 32,
                  borderRadius: 9999,
                  fontWeight: active ? 800 : 600,
                  bgcolor: active ? 'primary.main' : 'background.paper',
                  color: active ? 'primary.contrastText' : 'text.primary',
                  border: `${borderWidth.thin}px solid ${active ? 'transparent' : theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: active ? 'primary.dark' : 'action.hover',
                  },
                })}
              />
            );
          })}
        </Box>

        <FadeIn>
          <SurfaceCard flush sx={{ borderRadius: borderRadiusScale.xl }}>
            {missions.length ? (
              <Stack spacing={0} role="list">
                {missions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    invoice={findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission)}
                    pharmacie={findPharmacie(state, mission.pharmacieId)}
                    isFirstMissionAtPharmacy={firstMissionIdsByPharmacy.has(mission.id)}
                    selected={selectedId === mission.id}
                    onClick={() => openMission(mission.id)}
                    onToggleFavorite={() => toggleFavoritePharmacie(mission.pharmacieId)}
                    onInvoiceAction={updateInvoiceStatus}
                    onGenerateInvoice={() => generateInvoice(mission)}
                  />
                ))}
              </Stack>
            ) : (
              <EmptyState onPrimary={() => navigate('/missions/new')} onSecondary={() => { setMissionStatusFilter('ALL'); setMissionFocus('all'); }} hasFilter={statusFilter !== 'ALL' || focusFilter !== 'all'} />
            )}
          </SurfaceCard>
        </FadeIn>
      </PageSection>

      {selected ? (
        <MissionDetailModal
          open={!!selected}
          mission={selected}
          pharmacy={findPharmacie(state, selected.pharmacieId)}
          invoice={selectedInvoice}
          payments={selectedInvoice?.payments}
          onClose={closeMission}
          onEditMission={(missionId) => navigate(`/missions/${missionId}/edit`)}
          onOpenInvoice={(missionId) => navigate(`/missions/${missionId}/invoice`)}
          onDownloadPdf={downloadPdf}
          onDownloadIcs={downloadCalendar}
        />
      ) : null}
    </Stack>
  );
}


function EmptyState({ onPrimary, onSecondary, hasFilter }: { onPrimary: () => void; onSecondary: () => void; hasFilter: boolean }) {
  return (
    <Stack spacing={2.5} sx={{ alignItems: 'center', py: 6, px: 3, textAlign: 'center' }}>
      <Typography color="text.secondary" sx={{ fontWeight: 650, maxWidth: 360 }}>
        {hasFilter ? 'Aucune mission dans ce filtre.' : 'Aucune mission pour le moment.'}
      </Typography>
      {!hasFilter ? (
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Créez votre première mission pour commencer le suivi.
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {hasFilter ? (
          <Button variant="outlined" onClick={onSecondary}>Réinitialiser les filtres</Button>
        ) : null}
        <Button variant="contained" onClick={onPrimary}>Créer une mission</Button>
      </Stack>
    </Stack>
  );
}


function MissionCard({
  mission,
  invoice,
  pharmacie,
  isFirstMissionAtPharmacy,
  selected,
  onClick,
  onToggleFavorite,
  onInvoiceAction,
  onGenerateInvoice,
}: {
  mission: Mission;
  invoice?: Invoice;
  pharmacie?: Pharmacie;
  isFirstMissionAtPharmacy: boolean;
  selected: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  onInvoiceAction: (invoiceId: string, status: InvoiceStatus) => void;
  onGenerateInvoice: () => void;
}) {
  const theme = useTheme();
  const businessStatus = deriveMissionBusinessStatus(mission, invoice);
  const tone = businessMissionStatusTone(businessStatus);
  const totalHours = mission.days.reduce((sum, day) => sum + day.hours, 0);
  const dateSummary = formatMissionDatesSummary(mission.days.map((d) => d.dateService));

  const accentColor =
    tone === 'primary' ? theme.palette.primary.main
    : tone === 'warning' ? theme.palette.warning.main
    : tone === 'success' ? theme.palette.success.main
    : tone === 'error' ? theme.palette.error.main
    : theme.palette.divider;

  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1.4fr) minmax(240px, 1fr) auto' },
        gap: { xs: 2, md: 3 },
        p: { xs: 2, md: 2.5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderLeft: `3px solid ${accentColor}`,
        backgroundColor: selected ? 'action.selected' : 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 180ms ease',
        '&:hover, &:focus-visible': {
          backgroundColor: theme.palette.action.hover,
          outline: `3px solid ${brandColors.primary[600]}`,
          outlineOffset: 2,
        },
      })}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {pharmacie ? pharmacieDisplayName(pharmacie) : 'Remplacement officine'}
          </Typography>
          <StatusChip kind="businessMission" status={businessStatus} />
          {isFirstMissionAtPharmacy ? (
            <Tooltip title="Première mission dans cette pharmacie">
              <Box
                component="button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite();
                }}
                aria-label={pharmacie?.isFavorite ? 'Retirer des favorites' : 'Ajouter aux favorites'}
                aria-pressed={Boolean(pharmacie?.isFavorite)}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: borderRadiusScale.full,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 0,
                  bgcolor: pharmacie?.isFavorite ? 'warning.light' : 'action.hover',
                  color: pharmacie?.isFavorite ? 'warning.contrastText' : 'text.secondary',
                  cursor: 'pointer',
                  p: 0,
                  '&:hover': { bgcolor: pharmacie?.isFavorite ? 'warning.main' : 'action.selected' },
                }}
              >
                <StarRoundedIcon sx={{ fontSize: typographyScale.base }} />
              </Box>
            </Tooltip>
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {addressLabel(pharmacie)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {mission.missionCode}
        </Typography>
      </Stack>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 750, overflowWrap: 'anywhere' }}>
          {dateSummary}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalHours.toFixed(2).replace('.', ',')} h payées
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
            minWidth: 100,
          }}
        >
          {formatMoney(mission.totalCents)}
        </Typography>
      </Box>
    </Box>
  );
}


function MissionDetailModal({
  open,
  mission,
  pharmacy,
  invoice,
  payments,
  onClose,
  onEditMission,
  onOpenInvoice,
  onDownloadPdf,
  onDownloadIcs,
}: {
  open: boolean;
  mission: Mission;
  pharmacy?: Pharmacie;
  invoice?: Invoice;
  payments?: InvoicePayment[];
  onClose: () => void;
  onEditMission: (missionId: string) => void;
  onOpenInvoice: (missionId: string) => void;
  onDownloadPdf: (invoiceId: string) => void;
  onDownloadIcs: (mission: Mission) => void;
}) {
  const totalHours = mission.days.reduce((sum, day) => sum + day.hours, 0);
  const businessStatus = deriveMissionBusinessStatus(mission, invoice);
  const canDownloadPdf = Boolean(invoice);
  const canDownloadIcs = mission.status === 'CONFIRMED' || mission.status === 'COMPLETED';
  const hasFees = mission.days.flatMap((d) => d.expenses ?? []).some((e) => e.amountCents > 0);

  const topBar = (
    <>
      {canDownloadPdf && invoice ? (
        <IconButton
          aria-label="Télécharger le PDF"
          size="small"
          onClick={() => onDownloadPdf(invoice.id)}
          sx={{
            width: 32,
            height: 32,
            borderRadius: borderRadiusScale.full,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: 'common.white',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
          }}
        >
          <PictureAsPdfRoundedIcon sx={{ fontSize: typographyScale.base }} />
          <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 800, ml: 0.25 }}>PDF</Typography>
        </IconButton>
      ) : null}
      {canDownloadIcs ? (
        <IconButton
          aria-label="Télécharger le calendrier ICS"
          size="small"
          onClick={() => onDownloadIcs(mission)}
          sx={{
            width: 32,
            height: 32,
            borderRadius: borderRadiusScale.full,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: 'common.white',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
          }}
        >
          <CalendarMonthRoundedIcon sx={{ fontSize: typographyScale.base }} />
          <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 800, ml: 0.25 }}>ICS</Typography>
        </IconButton>
      ) : null}
      <IconButton
        aria-label="Fermer le détail de la mission"
        size="small"
        onClick={onClose}
        sx={{
          width: 32,
          height: 32,
          borderRadius: borderRadiusScale.full,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          color: 'common.white',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
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
      maxWidth="md"
      fullWidth
      aria-labelledby="mission-detail-title"
      aria-describedby="mission-detail-description"
      slotProps={{
        paper: {
          sx: {
            height: { xs: '100vh', sm: '90vh' },
            maxHeight: { xs: '100vh', sm: '90vh' },
            width: { xs: '100%', md: 'min(680px, 100%)' },
            zIndex: 1400,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle id="mission-detail-title" sx={{ p: 2.5, pb: 0 }}>
        <MissionSummaryPanel
          topBar={topBar}
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
          <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'rgba(255,255,255,0.18)' }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mission</Typography>
              <StatusChip kind="businessMission" status={businessStatus} />
              {invoice ? (
                <>
                  <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Facture</Typography>
                  <StatusChip kind="invoice" status={invoice.status} />
                  {invoice.paymentStatus && (
                    <>
                      <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Paiement</Typography>
                      <StatusChip kind="payment" status={invoice.paymentStatus} />
                    </>
                  )}
                </>
              ) : null}
            </Stack>
          </Box>
        </MissionSummaryPanel>
      </DialogTitle>
      <DialogContent
        id="mission-detail-description"
        sx={{
          p: 0,
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
          {pharmacy?.weeklySchedule ? (
            <SurfaceCard contentSx={{ p: 2 }}>
              <MissionDetailScheduleTable schedule={pharmacy.weeklySchedule} />
            </SurfaceCard>
          ) : null}
          <SurfaceCard contentSx={{ p: 2 }}>
            <MissionDetailDays mission={mission} />
          </SurfaceCard>
          {hasFees ? (
            <SurfaceCard contentSx={{ p: 2 }}>
              <MissionDetailFees mission={mission} />
            </SurfaceCard>
          ) : null}
          <MissionDetailActions
            mission={mission}
            invoice={invoice}
            payments={payments}
            onEditMission={onEditMission}
            onOpenInvoice={onOpenInvoice}
            onDownloadPdf={onDownloadPdf}
            onDownloadIcs={onDownloadIcs}
          />
          <SurfaceCard contentSx={{ p: 2 }}>
            <MissionDetailHistory events={mission.events} />
          </SurfaceCard>
        </Box>
      </DialogContent>
    </Dialog>
  );
}


function MissionDetailScheduleTable({ schedule }: { schedule: PharmacyWeeklySchedule }) {
  const days = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' },
  ] as const;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Horaire de la pharmacie
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) 60px 80px 80px', gap: 1, fontSize: '0.85rem' }}>
        <Box sx={{ fontWeight: 800, color: 'text.secondary', pb: 0.5, borderBottom: '2px solid', borderColor: 'divider' }}>Jour</Box>
        <Box sx={{ fontWeight: 800, color: 'text.secondary', pb: 0.5, borderBottom: '2px solid', borderColor: 'divider' }}>Ouvert</Box>
        <Box sx={{ fontWeight: 800, color: 'text.secondary', pb: 0.5, borderBottom: '2px solid', borderColor: 'divider' }}>Début</Box>
        <Box sx={{ fontWeight: 800, color: 'text.secondary', pb: 0.5, borderBottom: '2px solid', borderColor: 'divider' }}>Fin</Box>
        {days.map(({ key, label }) => {
          const day = schedule[key];
          const open = day?.enabled ?? false;
          return (
            <>
              <Box key={`${key}-label`} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 650 }}>{label}</Box>
              <Box key={`${key}-open`} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>{open ? 'Oui' : 'Non'}</Box>
              <Box key={`${key}-start`} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>{open ? (day.startTime || '—') : '—'}</Box>
              <Box key={`${key}-end`} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>{open ? (day.endTime || '—') : '—'}</Box>
            </>
          );
        })}
      </Box>
      {schedule.sourceLabel ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
          Horaire importé depuis {schedule.sourceLabel}. À vérifier.
        </Typography>
      ) : null}
    </Box>
  );
}

function MissionDetailDays({ mission }: { mission: Mission }) {
  const sortedDays = mission.days.slice().sort((a, b) => `${a.dateService}${a.startTime}`.localeCompare(`${b.dateService}${b.startTime}`));

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Jours travaillés
      </Typography>
      <Stack spacing={0.5}>
        {sortedDays.map((day) => (
          <Box key={day.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '140px 1fr auto' }, gap: 1.5, alignItems: 'center', p: 1, borderRadius: 8, bgcolor: 'action.hover' }}>
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
  );
}

function MissionDetailFees({ mission }: { mission: Mission }) {
  const expenses = mission.days.flatMap((day) => day.expenses ?? []);
  const hasFees = expenses.some((e) => e.amountCents > 0);

  if (!hasFees) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
        Aucun frais
      </Typography>
    );
  }

  const feeItems = expenses.filter((e) => e.amountCents > 0);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Frais
      </Typography>
      <Stack spacing={0.5}>
        {feeItems.map((expense) => {
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
  );
}

function MissionDetailActions({
  mission,
  invoice,
  payments,
  onEditMission,
  onOpenInvoice,
  onDownloadPdf,
  onDownloadIcs,
}: {
  mission: Mission;
  invoice?: Invoice;
  payments?: InvoicePayment[];
  onEditMission: (missionId: string) => void;
  onOpenInvoice: (missionId: string) => void;
  onDownloadPdf: (invoiceId: string) => void;
  onDownloadIcs: (mission: Mission) => void;
}) {
  const businessStatus = deriveMissionBusinessStatus(mission, invoice);

  const actions: Array<{ label: string; variant: 'text' | 'outlined' | 'contained'; primary?: boolean; onClick: () => void }> = [];

  if (mission.status === 'DRAFT') {
    actions.push({ label: 'Modifier la mission', variant: 'outlined', onClick: () => onEditMission(mission.id) });
    actions.push({ label: 'Valider', variant: 'contained', primary: true, onClick: () => onEditMission(mission.id) });
  } else if (mission.status === 'COMPLETED' && !invoice) {
    actions.push({ label: 'Continuer vers la facturation', variant: 'contained', primary: true, onClick: () => onOpenInvoice(mission.id) });
    actions.push({ label: 'Modifier la mission', variant: 'outlined', onClick: () => onEditMission(mission.id) });
  } else if (invoice) {
    if (invoice.status === 'draft' || invoice.status === 'ready_to_send' || invoice.status === 'GENERATED') {
      actions.push({ label: 'Ouvrir la facturation', variant: 'outlined', primary: true, onClick: () => onOpenInvoice(mission.id) });
      actions.push({ label: 'Marquer comme envoyée', variant: 'outlined', onClick: () => onOpenInvoice(mission.id) });
    } else if (invoice.status === 'SENT' || invoice.status === 'sent') {
      const paidAmount = invoice.paidAmountCents ?? 0;
      const remaining = invoice.amountCents - paidAmount;
      if (remaining > 0) {
        actions.push({ label: 'Ajouter un paiement', variant: 'contained', primary: true, onClick: () => onOpenInvoice(mission.id) });
      }
      actions.push({ label: 'Marquer comme payée', variant: 'outlined', onClick: () => onOpenInvoice(mission.id) });
    } else if (invoice.status === 'PAID') {
      actions.push({ label: 'Archiver', variant: 'outlined', onClick: () => onOpenInvoice(mission.id) });
    }
  }

  if (actions.length === 0) return null;

  return (
    <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          onClick={action.onClick}
          sx={{ borderRadius: borderRadiusScale.full, fontWeight: 800, ...(action.primary ? { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } } : {}) }}
        >
          {action.label}
        </Button>
      ))}
    </Box>
  );
}

function MissionDetailHistory({ events }: { events: MissionEvent[] }) {
  const [open, setOpen] = useState(false);

  if (!events.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
        Aucun événement enregistré.
      </Typography>
    );
  }

  return (
    <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Button
        fullWidth
        variant="text"
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          justifyContent: 'space-between',
          fontSize: '0.9rem',
          fontWeight: 750,
          p: 0,
          minHeight: 'auto',
          color: 'text.secondary',
        }}
        endIcon={open ? '▴' : '▾'}
        aria-expanded={open}
      >
        Historique
      </Button>
      {open ? (
        <Box sx={{ mt: 1.5 }}>
          {events.slice().reverse().map((event) => (
            <Typography key={event.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {formatEventDate(event.eventDate)} · {event.label}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
