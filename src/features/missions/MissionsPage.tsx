import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  IconButton,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { brandColors, componentBorderRadius, borderRadiusScale, typographyScale } from '../../design-system/tokens';
import { FadeIn } from '../../components/FadeIn';
import { LoadingButton } from '../../components/LoadingButton';
import { useNotifications } from '../../components/NotificationSystem';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { buildMissionIcs, downloadIcs } from '../../services/calendarIcs';
import { createId } from '../../services/ids';
import { createInvoiceFromMission, invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { missionStatusLabels } from '../../services/missionStatus';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus, Mission, MissionStatus, Pharmacie } from '../../storage/schema';
import { getPlatformAsync } from '../../services/platformService';
import { logMappedError, mapError } from '../../services/errorMapper';
import { findInvoice, findPharmacien, findPharmacie, missionInvoice, pharmacieDisplayName } from '../../storage/selectors';
import { undoManager } from '../../services/undoManager';

const missionStatusOptions: MissionStatus[] = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
const missionFilterOptions: Array<{ value: MissionStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'CONFIRMED', label: 'À venir' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'ARCHIVED', label: 'Archivée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

// Mapping des statuts pour les couleurs
const getMissionStatusColor = (status: MissionStatus): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'COMPLETED') return 'success';
  if (status === 'ARCHIVED' || status === 'CANCELLED') return 'default';
  return 'primary';
};

const getInvoiceStatusColor = (status?: InvoiceStatus): 'default' | 'success' | 'warning' | 'error' => {
  if (!status) return 'default';
  if (status === 'PAID') return 'success';
  if (status === 'ARCHIVED' || status === 'VOIDED') return 'default';
  return 'warning';
};

function missionStatusDisplayLabel(mission: Mission, invoice?: Invoice): string {
  if (mission.status === 'COMPLETED' && invoice?.status === 'PAID') {
    return 'Terminée · Payée';
  }
  if (mission.status === 'COMPLETED' && invoice && invoice.status !== 'PAID') {
    return `Terminée · ${invoiceStatusLabels[invoice.status]}`;
  }
  return missionStatusLabels[mission.status];
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T00:00:00`));
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

function missionSummaryRows(mission: Mission, includeMissionCode = false): Array<{ label: string; value: string; strong?: boolean; numeric?: boolean }> {
  return [
    ...(includeMissionCode ? [{ label: 'Mission', value: mission.missionCode }] : []),
    { label: 'Début', value: firstShiftLabel(mission, { includeHours: isSingleDayMission(mission) }) },
    { label: 'Financier', value: formatMoney(mission.totalCents), strong: true, numeric: true },
  ];
}

function hoursLabel(hours: number): string {
  return `${hours.toFixed(2).replace('.', ',')} h`;
}

function addressLabel(pharmacie?: Pharmacie): string {
  if (!pharmacie) return 'Adresse non renseignée';
  const city = pharmacie.ville ? `${pharmacie.ville}${pharmacie.codePostal ? `, QC ${pharmacie.codePostal}` : ''}` : '';
  return [pharmacie.adresse, city].filter(Boolean).join(' · ') || 'Adresse non renseignée';
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

// Style pour les statuts
const statusPillSx = {
  height: '30px',
  px: 1.5,
  borderRadius: componentBorderRadius.full,
  fontSize: '0.8rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

export function MissionsPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('selected'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'ALL'>('ALL');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  const missions = useMemo(
    () => [...state.missions]
      .filter((mission) => statusFilter === 'ALL' || mission.status === statusFilter)
      .sort((a, b) => `${b.dateDebut}${b.createdAt}`.localeCompare(`${a.dateDebut}${a.createdAt}`)),
    [state.missions, statusFilter],
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
  const selectedInvoice = selected ? findInvoice(state, selected.invoiceId) ?? missionInvoice(state, selected) : undefined;

  useEffect(() => {
    document.title = 'Pilotage des missions · Pharmfact';
  }, []);

  useEffect(() => {
    const selected = searchParams.get('selected');
    if (selected) setSelectedId(selected);
  }, [searchParams]);

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setSearchParams({});
        setHistoryOpen(false);
      }
    }

    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, []);

  function openMission(missionId: string) {
    setSelectedId(missionId);
    setSearchParams({ selected: missionId });
    setHistoryOpen(false);
  }

  function closeMission() {
    setSelectedId(null);
    setSearchParams({});
    setHistoryOpen(false);
  }

  function transitionMission(mission: Mission, status: MissionStatus) {
    if (mission.status === status) return;
    const previousMission = mission;

    updateAppState((current) => ({
      ...current,
      missions: current.missions.map((item) =>
        item.id === mission.id
          ? {
              ...item,
              status,
              updatedAt: new Date().toISOString(),
              events: [
                ...item.events,
                {
                  id: createId('evt'),
                  eventType: 'STATUS_CHANGED',
                  label: `Mission marquée ${missionStatusLabels[status].toLowerCase()}`,
                  eventDate: new Date().toISOString(),
                },
              ],
            }
          : item,
      ),
    }));

    const undoId = undoManager.add({
      description: `Restaurer la mission ${previousMission.missionCode}`,
      undo: () => {
        updateAppState((current) => ({
          ...current,
          missions: current.missions.map((item) => (item.id === previousMission.id ? previousMission : item)),
        }));
      },
    });

    notify({
      severity: 'success',
      message: `Mission marquée ${missionStatusLabels[status].toLowerCase()}.`,
      onUndo: () => undoManager.undo(undoId),
    });
  }

  function generateInvoice(mission: Mission) {
    const currentMission = state.missions.find((item) => item.id === mission.id);
    if (!currentMission || currentMission.invoiceId) return;
    const invoice = createInvoiceFromMission(currentMission, state);

    updateAppState((current) => {
      return {
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
      };
    });

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
      message: `Facture ${invoiceStatusLabels[status].toLowerCase()}.`,
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
    setDownloadingInvoiceId(invoiceId);
    try {
      // Utiliser getPlatformAsync pour garantir que tauriPlatform est chargé en mode Tauri
      const platform = await getPlatformAsync();
      console.log('[PDF] Début téléchargement facture depuis mission:', invoice.numero);
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
      setDownloadingInvoiceId(null);
    }
  }

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <PageHeader
        eyebrow="Missions"
        title="Pilotage des missions"
        description="Suivez les mandats, générez les factures et gardez les statuts opérationnels au même endroit."
        actions={
          <Button
            variant="contained"
            onClick={() => navigate('/mission/new')}
            sx={(theme) => ({
              bgcolor: 'common.white',
              color: 'primary.dark',
              '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.9) },
            })}
          >
            Créer une mission
          </Button>
        }
        data-testid="missions-page-header"
      />

      <PageSection
        title="File de missions"
        description={`${missions.length} mission${missions.length > 1 ? 's' : ''} affichée${missions.length > 1 ? 's' : ''}. Filtrez par état pour prioriser le suivi.`}
      >
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {missionFilterOptions.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? 'contained' : 'outlined'}
              onClick={() => setStatusFilter(option.value)}
              sx={{
                borderRadius: componentBorderRadius.full,
                minHeight: '36px',
                padding: '8px 14px',
                fontWeight: 700,
              }}
            >
              {option.label}
            </Button>
          ))}
        </Stack>
      </PageSection>

      <FadeIn>
        <SurfaceCard flush>
          {missions.length ? (
            <Stack spacing={0} role="list">
              {missions.map((mission) => (
                <MissionListItem
                  key={mission.id}
                  mission={mission}
                  invoice={missionInvoice(state, mission)}
                  pharmacie={findPharmacie(state, mission.pharmacieId)}
                  isFirstMissionAtPharmacy={firstMissionIdsByPharmacy.has(mission.id)}
                  selected={selectedId === mission.id}
                  onClick={() => openMission(mission.id)}
                  onCalendar={downloadCalendar}
                  onOpenPdf={downloadPdf}
                  downloadingInvoiceId={downloadingInvoiceId}
                />
              ))}
            </Stack>
          ) : (
            <Stack spacing={3} sx={{ alignItems: 'center', py: 8 }}>
              <Typography color="text.secondary">Aucune mission à piloter.</Typography>
              <Button variant="contained" onClick={() => navigate('/mission/new')}>
                Créer une mission
              </Button>
            </Stack>
          )}
        </SurfaceCard>
      </FadeIn>

      {/* Modal de détail mission */}
      {selected ? (
        <MissionModal
          mission={selected}
          invoice={selectedInvoice}
          pharmacie={findPharmacie(state, selected.pharmacieId)}
          isFirstMissionAtPharmacy={firstMissionIdsByPharmacy.has(selected.id)}
          historyOpen={historyOpen}
          onClose={closeMission}
          onToggleHistory={() => setHistoryOpen((open) => !open)}
          onCalendar={downloadCalendar}
          onTransitionMission={transitionMission}
          onEditMission={(missionId) => navigate(`/missions/${missionId}/edit`)}
          onGenerateInvoice={generateInvoice}
          onInvoiceStatus={updateInvoiceStatus}
          onOpenPdf={downloadPdf}
          downloadingInvoiceId={downloadingInvoiceId}
        />
      ) : null}

    </Stack>
  );
}

function MissionListItem({ mission, invoice, pharmacie, isFirstMissionAtPharmacy, selected, onClick, onCalendar, onOpenPdf, downloadingInvoiceId }: {
  mission: Mission;
  invoice?: Invoice;
  pharmacie?: Pharmacie;
  isFirstMissionAtPharmacy: boolean;
  selected: boolean;
  onClick: () => void;
  onCalendar: (mission: Mission) => void;
  onOpenPdf: (invoiceId: string) => void;
  downloadingInvoiceId: string | null;
}) {
  const canDownloadPdf = Boolean(invoice);
  const pdfBusy = invoice ? downloadingInvoiceId === invoice.id : false;
  const stats = missionSummaryRows(mission);
  const stopAction = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <Box
      data-testid="mission-row"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1.4fr) minmax(240px, 1fr) auto' },
        gap: { xs: 2, md: 3 },
        p: { xs: 2, md: 2.5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: selected ? 'action.selected' : 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 180ms ease',
        borderRadius: borderRadiusScale.none,
        '&:hover, &:focus-visible': {
          backgroundColor: (theme) => theme.palette.action.hover,
          outline: `3px solid ${brandColors.primary[600]}`,
          outlineOffset: 2,
        },
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {pharmacie ? pharmacieDisplayName(pharmacie) : 'Remplacement officine'}
          </Typography>
          <Chip
            label={missionStatusDisplayLabel(mission, invoice)}
            color={getMissionStatusColor(mission.status)}
            size="small"
            sx={statusPillSx}
          />
          {isFirstMissionAtPharmacy ? (
            <Tooltip title="Première mission dans cette pharmacie">
              <Box
                component="span"
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: componentBorderRadius.full,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText',
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {stats.map((item) => (
          <MissionSummaryRow key={item.label} label={item.label} value={item.value} strong={item.strong} numeric={item.numeric} />
        ))}
      </Box>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
        <Tooltip title={canDownloadPdf ? 'Télécharger le PDF' : 'Générer une facture pour activer le PDF'}>
          <span>
            <IconButton
              aria-label="Télécharger le PDF"
              color="primary"
              disabled={!invoice || pdfBusy}
              onClick={(event) => {
                stopAction(event);
                if (invoice) onOpenPdf(invoice.id);
              }}
              sx={{ border: `${borderWidth.thin}px solid`, borderColor: 'divider', bgcolor: 'background.paper' }}
            >
              {pdfBusy ? <CircularProgress color="inherit" size={20} /> : <PictureAsPdfRoundedIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Télécharger le calendrier">
          <IconButton
            aria-label="Télécharger le calendrier"
            color="primary"
            onClick={(event) => {
              stopAction(event);
              onCalendar(mission);
            }}
            sx={{ border: `${borderWidth.thin}px solid`, borderColor: 'divider', bgcolor: 'background.paper' }}
          >
            <CalendarMonthRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

function MissionModal({ mission, invoice, pharmacie, isFirstMissionAtPharmacy, historyOpen, downloadingInvoiceId, onClose, onToggleHistory, onCalendar, onTransitionMission, onEditMission, onGenerateInvoice, onInvoiceStatus, onOpenPdf }: {
  mission: Mission;
  invoice?: Invoice;
  pharmacie?: Pharmacie;
  isFirstMissionAtPharmacy: boolean;
  historyOpen: boolean;
  downloadingInvoiceId: string | null;
  onClose: () => void;
  onToggleHistory: () => void;
  onCalendar: (mission: Mission) => void;
  onTransitionMission: (mission: Mission, status: MissionStatus) => void;
  onEditMission: (missionId: string) => void;
  onGenerateInvoice: (mission: Mission) => void;
  onInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  onOpenPdf: (invoiceId: string) => void;
}) {
  return (
    <Dialog
      open={!!mission}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="mission-detail-title"
      aria-describedby="mission-detail-description"
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            width: { xs: '100%', md: 'min(680px, 100%)' },
            zIndex: 1400,
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 0, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          aria-label="Fermer"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 36,
            height: 36,
            borderRadius: componentBorderRadius.full,
            backgroundColor: 'action.hover',
            color: 'text.primary',
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
        <MissionSummarySection
          mission={mission}
          invoice={invoice}
          pharmacie={pharmacie}
          isFirstMissionAtPharmacy={isFirstMissionAtPharmacy}
        />
      </DialogTitle>
      <DialogContent id="mission-detail-description" sx={{ p: 3, pt: 0, overflowY: 'auto' }}>
        <MissionLocationSection mission={mission} pharmacie={pharmacie} />
        <MissionPharmacySection pharmacie={pharmacie} />
        <MissionScheduleSection mission={mission} />
        <MissionFinancialSection mission={mission} invoice={invoice} />
        <MissionActionsSection
          mission={mission}
          invoice={invoice}
          downloadingInvoiceId={downloadingInvoiceId}
          onCalendar={onCalendar}
          onEditMission={onEditMission}
          onGenerateInvoice={onGenerateInvoice}
          onInvoiceStatus={onInvoiceStatus}
          onOpenPdf={onOpenPdf}
          onTransitionMission={onTransitionMission}
        />
        <MissionHistorySection mission={mission} open={historyOpen} onToggle={onToggleHistory} />
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, compact = false }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <Box sx={{ mt: compact ? 2 : 3, pt: compact ? 2 : 3, borderTop: '1px solid', borderColor: 'divider' }}>
      {title ? (
        <Typography variant="subtitle2" component="h3" sx={{ fontSize: '1rem', fontWeight: 750, mb: 2 }}>
          {title}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

function MissionSummarySection({ mission, invoice, pharmacie, isFirstMissionAtPharmacy }: { mission: Mission; invoice?: Invoice; pharmacie?: Pharmacie; isFirstMissionAtPharmacy: boolean }) {
  const summaryItems = missionSummaryRows(mission, true);

  return (
    <Box sx={{ pr: 5, mb: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography id="mission-detail-title" variant="h5" sx={{ fontWeight: 850, lineHeight: 1.15 }}>
            {pharmacie ? pharmacieDisplayName(pharmacie) : 'Mission pharmacie'}
          </Typography>
          <Chip
            label={missionStatusDisplayLabel(mission, invoice)}
            color={getMissionStatusColor(mission.status)}
            size="small"
            sx={statusPillSx}
          />
          {isFirstMissionAtPharmacy ? (
            <Tooltip title="Première mission dans cette pharmacie">
              <Box
                component="span"
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: componentBorderRadius.full,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText',
                }}
              >
                <StarRoundedIcon sx={{ fontSize: typographyScale.base }} />
              </Box>
            </Tooltip>
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {mission.missionCode}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.1 }}>
          {summaryItems.map((item) => (
            <MissionSummaryRow key={item.label} label={item.label} value={item.value} strong={item.strong} numeric={item.numeric} />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

function MissionSummaryRow({ label, value, strong = false, numeric = false }: { label: string; value: string; strong?: boolean; numeric?: boolean }) {
  return (
    <Box sx={{ minWidth: 0, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'baseline' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2, flexShrink: 0 }}>
        {label} :
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: strong ? 800 : 650,
          fontVariantNumeric: numeric ? 'tabular-nums' : undefined,
          overflowWrap: 'anywhere',
          lineHeight: 1.3,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function MissionLocationSection({ mission, pharmacie }: { mission: Mission; pharmacie?: Pharmacie }) {
  const mileageLabel = mission.mileageKm > 0
    ? mission.mileageTotalCents > 0
      ? `${mission.mileageKm.toFixed(1).replace('.', ',')} km · facturé ${formatMoney(mission.mileageTotalCents)}`
      : `${mission.mileageKm.toFixed(1).replace('.', ',')} km · non facturé`
    : 'Distance non renseignée';

  return (
    <Section title="Lieu" compact>
      <Stack spacing={1}>
        <MissionSummaryRow label="Adresse" value={addressLabel(pharmacie)} />
        <MissionSummaryRow label="Distance" value={mileageLabel} />
      </Stack>
    </Section>
  );
}

function MissionPharmacySection({ pharmacie }: { pharmacie?: Pharmacie }) {
  const details = [
    { label: 'Dénomination', value: pharmacie ? pharmacieDisplayName(pharmacie) : 'Pharmacie non définie' },
    { label: 'Nom officiel', value: pharmacie?.nom ?? 'Pharmacie non définie' },
    { label: 'Téléphone', value: pharmacie?.telephone || 'Non renseigné' },
    { label: 'Courriel', value: pharmacie?.email || 'Non renseigné' },
    { label: 'Notes', value: pharmacie?.notes || 'Aucune note' },
  ];

  return (
    <Section title="Pharmacie" compact>
      <Stack spacing={1}>
        {details.map((item) => (
          <MissionSummaryRow key={item.label} label={item.label} value={item.value} />
        ))}
      </Stack>
    </Section>
  );
}

function MissionScheduleSection({ mission }: { mission: Mission }) {
  const days = [...mission.days].sort((a, b) => `${a.dateService}${a.startTime}`.localeCompare(`${b.dateService}${b.startTime}`));

  return (
    <Section title="Horaires">
      <Stack spacing={1}>
        {days.length ? days.map((day) => (
          <Box
            key={day.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '120px 1fr auto' },
              gap: 1.5,
              alignItems: 'center',
              p: 1.5,
              borderRadius: componentBorderRadius.card,
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 750 }}>
              {formatShortDate(day.dateService)}
            </Typography>
            <Typography variant="body2">
              {day.startTime}–{day.endTime}
              {day.unpaidBreakMinutes > 0 ? ` · pause ${day.unpaidBreakMinutes} min` : ''}
              {day.description ? ` · ${day.description}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, textAlign: { xs: 'left', sm: 'right' } }}>
              {hoursLabel(day.hours)}
            </Typography>
          </Box>
        )) : (
          <Typography variant="body2" color="text.secondary">
            Aucun horaire détaillé.
          </Typography>
        )}
      </Stack>
    </Section>
  );
}

function MissionFinancialSection({ mission, invoice }: { mission: Mission; invoice?: Invoice }) {
  const rows = [
    { label: 'Taux horaire', value: formatMoney(mission.hourlyRateCents) },
    { label: 'Honoraires', value: formatMoney(mission.subtotalCents) },
    { label: 'Frais repas', value: formatMoney(mission.mealTotalCents) },
    { label: 'Frais kilométrage', value: formatMoney(mission.mileageTotalCents) },
  ];

  return (
    <Section title="Financier">
      <SurfaceCard contentSx={{ p: 2 }}>
        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Stack key={row.label} direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{row.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 750 }}>{row.value}</Typography>
            </Stack>
          ))}
          <Divider />
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>Total mission</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{formatMoney(mission.totalCents)}</Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Facture</Typography>
            <Chip
              label={invoice ? invoiceStatusLabels[invoice.status] : 'Non générée'}
              color={getInvoiceStatusColor(invoice?.status)}
              size="small"
              sx={statusPillSx}
            />
          </Stack>
        </Stack>
      </SurfaceCard>
    </Section>
  );
}

function MissionActionsSection({ invoice, mission, downloadingInvoiceId, onCalendar, onEditMission, onGenerateInvoice, onInvoiceStatus, onOpenPdf, onTransitionMission }: {
  invoice?: Invoice;
  mission: Mission;
  downloadingInvoiceId: string | null;
  onCalendar: (mission: Mission) => void;
  onEditMission: (missionId: string) => void;
  onGenerateInvoice: (mission: Mission) => void;
  onInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  onOpenPdf: (invoiceId: string) => void;
  onTransitionMission: (mission: Mission, status: MissionStatus) => void;
}) {
  return (
    <Section title="Actions">
      <Stack spacing={1.5}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
          <Button variant="contained" onClick={() => onEditMission(mission.id)}>
            Modifier la mission
          </Button>
          <Button variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={() => onCalendar(mission)}>
            Télécharger calendrier
          </Button>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
          {!invoice ? (
            <Button variant="outlined" onClick={() => onGenerateInvoice(mission)}>
              Générer facture
            </Button>
          ) : null}
          {invoice ? (
            <LoadingButton
              variant="outlined"
              startIcon={<PictureAsPdfRoundedIcon fontSize="small" />}
              loading={downloadingInvoiceId === invoice.id}
              loadingLabel="Génération PDF..."
              onClick={() => onOpenPdf(invoice.id)}
            >
              Télécharger PDF
            </LoadingButton>
          ) : null}
          {invoice?.status === 'GENERATED' ? (
            <Button variant="contained" onClick={() => onInvoiceStatus(invoice.id, 'SENT')}>
              Envoyer au paiement
            </Button>
          ) : null}
          {invoice?.status === 'SENT' ? (
            <Button variant="contained" onClick={() => onInvoiceStatus(invoice.id, 'PAID')}>
              Marquer payée
            </Button>
          ) : null}
          {invoice?.status === 'PAID' ? (
            <Button variant="outlined" onClick={() => onInvoiceStatus(invoice.id, 'ARCHIVED')}>
              Archiver
            </Button>
          ) : null}
          {invoice?.status === 'ARCHIVED' ? (
            <Button variant="outlined" onClick={() => onInvoiceStatus(invoice.id, 'GENERATED')}>
              Restaurer
            </Button>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {missionStatusOptions.map((status) => (
            <Button
              key={status}
              size="small"
              variant={mission.status === status ? 'contained' : 'outlined'}
              onClick={() => onTransitionMission(mission, status)}
              sx={{ borderRadius: componentBorderRadius.full, fontWeight: 750 }}
            >
              {missionStatusLabels[status]}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Section>
  );
}

function MissionHistorySection({ mission, open, onToggle }: { mission: Mission; open: boolean; onToggle: () => void }) {
  return (
    <Section title="">
      <Button
        fullWidth
        variant="text"
        onClick={onToggle}
        sx={{
          justifyContent: 'space-between',
          fontSize: '1rem',
          fontWeight: 750,
          p: 0,
          minHeight: 'auto',
        }}
        endIcon={open ? '▴' : '▾'}
      >
        Historique
      </Button>
      {open ? (
        <Box sx={{ mt: 2 }}>
          {mission.events.slice().reverse().map((event) => (
            <Typography key={event.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              {formatEventDate(event.eventDate)} · {event.label}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Section>
  );
}
