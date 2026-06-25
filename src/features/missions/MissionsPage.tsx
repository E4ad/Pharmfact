import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { brandColors, borderWidth, borderRadiusScale, typographyScale } from '../../design-system/tokens';
import { FadeIn } from '../../components/FadeIn';
import { StatusChip } from '../../components/StatusChip';
import { useNotifications } from '../../components/NotificationSystem';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { MetricCard } from '../../components/MetricCard';
import { MissionDrawer } from './MissionDrawer';
import { buildMissionIcs, downloadIcs } from '../../services/calendarIcs';
import { createId } from '../../services/ids';
import { createInvoiceFromMission, createInvoiceFromMissions, createInvoicePayment, addPaymentToInvoice } from '../../services/invoiceWorkflow';
import type { BusinessMissionStatus } from '../../services/businessRules';
import { businessMissionStatusTone, deriveMissionBusinessStatus, missionsReadyToInvoice } from '../../services/businessRules';
import { buildMissionWindowMetrics } from '../../services/dashboardMetrics';
import { formatMoney } from '../../services/money';
import { daysBetween } from '../../services/missionCalculator';
import { missionStatusLabels } from '../../services/missionStatus';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { AppState, Invoice, InvoicePayment, Mission, MissionStatus, Pharmacie } from '../../storage/schema';
import { downloadInvoicePdf } from '../../services/downloadInvoicePdf';
import { logMappedError, mapError } from '../../services/errorMapper';
import { findInvoice, findPharmacien, findPharmacie, missionInvoice, pharmacieDisplayName } from '../../storage/selectors';
import { undoManager } from '../../services/undoManager';
import { todayIso } from '../../services/ids';

type MissionFocus = 'all' | 'upcoming7d' | 'estimated7d' | 'toInvoice' | 'toFinalize';

type MissionFilterStatus = MissionStatus | 'ACTIVE' | 'ARCHIVED_ONLY' | 'ALL' | 'ready_to_invoice' | 'invoice_draft' | 'invoice_sent' | 'paid';
const missionFilterOptions: Array<{ value: MissionFilterStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Actives' },
  { value: 'ALL', label: 'Toutes' },
  { value: 'ARCHIVED_ONLY', label: 'Archivées' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'CONFIRMED', label: 'Planifiée' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'ready_to_invoice', label: 'Prêt à facturer' },
  { value: 'invoice_draft', label: 'Facture à finaliser' },
  { value: 'invoice_sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
];

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00`));
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
  if (filter === 'ACTIVE') return mission.status !== 'ARCHIVED' && mission.status !== 'CANCELLED';
  if (filter === 'ARCHIVED_ONLY') return mission.status === 'ARCHIVED' || mission.status === 'CANCELLED';
  if (filter === 'ready_to_invoice') return mission.status === 'COMPLETED' && !mission.invoiceId;
  if (filter === 'invoice_draft') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'draft' || invoice.status === 'ready_to_send'));
  }
  if (filter === 'invoice_sent') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'SENT' || invoice.status === 'sent' || invoice.status === 'GENERATED'));
  }
  if (filter === 'paid') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return invoice?.paymentStatus === 'paid';
  }
  return mission.status === filter;
}

export function MissionsPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('selected'));
  const [statusFilter, setStatusFilter] = useState<MissionFilterStatus>('ACTIVE');
  const [focusFilter, setFocusFilter] = useState<MissionFocus>(() => parseMissionFocus(searchParams.get('filter') ?? searchParams.get('focus')));
  const today = todayIso();
  const missionMetrics = useMemo(() => buildMissionWindowMetrics(state, today), [state, today]);

  const draftCount = useMemo(() => state.missions.filter((m) => m.status === 'DRAFT').length, [state.missions]);
  const inProgressCount = useMemo(() => state.missions.filter((m) => m.status === 'IN_PROGRESS').length, [state.missions]);
  const toCollectCount = useMemo(
    () => state.invoices.filter((inv) => (inv.status === 'sent' || inv.status === 'SENT') && inv.paymentStatus !== 'paid').length,
    [state.invoices],
  );
  const overdueCount = useMemo(
    () => state.invoices.filter((inv) => (inv.status === 'sent' || inv.status === 'SENT') && inv.dateEcheance < today).length,
    [state.invoices, today],
  );
  const invoicesToFinalizeCount = useMemo(
    () => state.invoices.filter((inv) => inv.status === 'draft' || inv.status === 'ready_to_send').length,
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
  }

  function closeMission() {
    setSelectedId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('selected');
      return next;
    });
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

  function updateMissionStatus(missionId: string, status: MissionStatus) {
    const previous = state.missions.find((m) => m.id === missionId);
    if (!previous || previous.status === status) return;
    updateAppState((current) => ({
      ...current,
      missions: current.missions.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status,
              events: [
                ...m.events,
                { id: createId('evt'), eventType: 'STATUS_CHANGED' as const, label: `Statut changé : ${missionStatusLabels[status]}`, eventDate: new Date().toISOString() },
              ],
            }
          : m,
      ),
    }));
    const undoId = undoManager.add({
      description: `Restaurer le statut de ${previous.missionCode}`,
      undo: () => updateAppState((current) => ({ ...current, missions: current.missions.map((m) => (m.id === missionId ? previous : m)) })),
    });
    notify({ severity: 'success', message: `${previous.missionCode} → ${missionStatusLabels[status]}.`, onUndo: () => undoManager.undo(undoId) });
  }

  function savePayment(invoiceId: string, input: Omit<InvoicePayment, 'id' | 'createdAt'>) {
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const payment = createInvoicePayment(invoice, input);
    const updatedInvoice = addPaymentToInvoice(invoice, payment, invoice.amountCents);
    updateAppState((current) => ({ ...current, invoices: current.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)) }));
    notify({ severity: 'success', message: `Paiement de ${formatMoney(input.amount)} enregistré.` });
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
        description="Cliquez sur un KPI pour filtrer la liste."
        spacing={2}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' },
            gap: 1.5,
          }}
        >
          {[
            { label: 'À valider', value: String(draftCount), helper: 'Brouillons', tone: 'default' as const, action: () => { setMissionStatusFilter('DRAFT'); setMissionFocus('all'); } },
            { label: 'À venir — 7j', value: String(missionMetrics.upcomingCount), helper: focusFilter === 'upcoming7d' ? 'Filtre actif' : 'Confirmées', tone: 'primary' as const, action: () => { setMissionFocus('upcoming7d'); setMissionStatusFilter('ACTIVE'); } },
            { label: 'En cours', value: String(inProgressCount), helper: 'En cours', tone: 'warning' as const, action: () => { setMissionStatusFilter('IN_PROGRESS'); setMissionFocus('all'); } },
            { label: 'À facturer', value: String(missionMetrics.toInvoiceCount), helper: formatMoney(missionMetrics.toInvoiceCents), tone: 'warning' as const, action: () => { setMissionFocus('toInvoice'); setMissionStatusFilter('ACTIVE'); } },
            { label: 'Factures à finaliser', value: String(invoicesToFinalizeCount), helper: 'Brouillons', tone: 'default' as const, action: () => { setMissionFocus('toFinalize'); setMissionStatusFilter('ACTIVE'); } },
            { label: 'À encaisser', value: String(toCollectCount), helper: 'Envoyées', tone: 'primary' as const, action: () => { setMissionStatusFilter('invoice_sent'); setMissionFocus('all'); } },
            { label: 'En retard', value: String(overdueCount), helper: 'Échues', tone: 'error' as const, action: () => { setMissionStatusFilter('invoice_sent'); setMissionFocus('all'); } },
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
                    onDownloadPdf={downloadPdf}
                    onDownloadIcs={downloadCalendar}
                  />
                ))}
              </Stack>
            ) : (
              <EmptyState onPrimary={() => navigate('/missions/new')} onSecondary={() => { setMissionStatusFilter('ALL'); setMissionFocus('all'); }} hasFilter={statusFilter !== 'ALL' || focusFilter !== 'all'} />
            )}
          </SurfaceCard>
        </FadeIn>
      </PageSection>

      <MissionDrawer
        open={!!selected}
        mission={selected ?? null}
        pharmacy={selected ? findPharmacie(state, selected.pharmacieId) : undefined}
        invoice={selectedInvoice}
        onClose={closeMission}
        onEditMission={(missionId) => navigate(`/missions/${missionId}/edit`)}
        onOpenInvoice={(missionId) => navigate(`/missions/${missionId}/invoice`)}
        onDownloadPdf={downloadPdf}
        onDownloadIcs={downloadCalendar}
        onChangeMissionStatus={updateMissionStatus}
        onGenerateInvoice={generateInvoice}
        onSavePayment={savePayment}
      />
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
  onDownloadPdf,
  onDownloadIcs,
}: {
  mission: Mission;
  invoice?: Invoice;
  pharmacie?: Pharmacie;
  isFirstMissionAtPharmacy: boolean;
  selected: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  onDownloadPdf: (invoiceId: string) => void;
  onDownloadIcs: (mission: Mission) => void;
}) {
  const theme = useTheme();
  const businessStatus = deriveMissionBusinessStatus(mission, invoice);
  const tone = businessMissionStatusTone(businessStatus);
  const totalHours = mission.days.reduce((sum, day) => sum + day.hours, 0);
  const dateSummary = formatMissionDatesSummary(mission.days.map((d) => d.dateService));
  const canDownloadPdf = Boolean(invoice);
  const canDownloadIcs = mission.status === 'CONFIRMED' || mission.status === 'COMPLETED';

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
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1.4fr) minmax(200px, 1fr) auto auto' },
        gap: { xs: 2, md: 2.5 },
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
        <Stack spacing={0.5} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
          >
            {formatMoney(mission.totalCents)}
          </Typography>
          {invoice?.paymentStatus ? (
            <StatusChip kind="payment" status={invoice.paymentStatus} />
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        {canDownloadPdf && invoice ? (
          <IconButton
            aria-label="Télécharger le PDF"
            size="small"
            onClick={(e: MouseEvent) => { e.stopPropagation(); onDownloadPdf(invoice.id); }}
            sx={{ width: 30, height: 30, borderRadius: borderRadiusScale.full, bgcolor: 'action.hover', color: 'text.secondary', '&:hover': { bgcolor: 'action.selected' } }}
          >
            <PictureAsPdfRoundedIcon sx={{ fontSize: typographyScale.sm }} />
          </IconButton>
        ) : null}
        {canDownloadIcs ? (
          <IconButton
            aria-label="Télécharger le calendrier ICS"
            size="small"
            onClick={(e: MouseEvent) => { e.stopPropagation(); onDownloadIcs(mission); }}
            sx={{ width: 30, height: 30, borderRadius: borderRadiusScale.full, bgcolor: 'action.hover', color: 'text.secondary', '&:hover': { bgcolor: 'action.selected' } }}
          >
            <CalendarMonthRoundedIcon sx={{ fontSize: typographyScale.sm }} />
          </IconButton>
        ) : null}
      </Box>
    </Box>
  );
}
