import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackHomeButton } from '../../components/BackHomeButton';
import { buildMissionIcs, downloadIcs } from '../../services/calendarIcs';
import { createId } from '../../services/ids';
import { createInvoiceFromMission, invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { missionStatusLabels } from '../../services/missionStatus';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus, Mission, MissionStatus, Pharmacie } from '../../storage/schema';
import { getPlatformAsync } from '../../services/platformService';
import { findInvoice, findPharmacien, findPharmacie, missionInvoice } from '../../storage/selectors';

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

function periodLabel(mission: Mission): string {
  return mission.dateDebut === mission.dateFin ? mission.dateDebut : `${mission.dateDebut} - ${mission.dateFin}`;
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T00:00:00`));
}

function minimalPeriodLabel(mission: Mission): string {
  if (mission.dateDebut === mission.dateFin) return formatShortDate(mission.dateDebut);
  return `${formatShortDate(mission.dateDebut)} → ${formatShortDate(mission.dateFin)}`;
}

function firstShiftLabel(mission: Mission): string {
  const firstDay = [...mission.days].sort((a, b) => `${a.dateService}${a.startTime}`.localeCompare(`${b.dateService}${b.startTime}`))[0];
  if (!firstDay) return `${formatShortDate(mission.dateDebut)} · heure à préciser`;
  return `${formatShortDate(firstDay.dateService)} · ${firstDay.startTime}–${firstDay.endTime}`;
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
  borderRadius: '999px',
  fontSize: '0.8rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

export function MissionsPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('selected'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'ALL'>('ALL');
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
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
    setToast({ severity: 'success', message: `Mission marquée ${missionStatusLabels[status].toLowerCase()}` });
  }

  function generateInvoice(mission: Mission) {
    updateAppState((current) => {
      const currentMission = current.missions.find((item) => item.id === mission.id);
      if (!currentMission || currentMission.invoiceId) return current;
      const invoice = createInvoiceFromMission(currentMission, current);
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
    setToast({ severity: 'success', message: 'Facture générée' });
  }

  function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => (invoice.id === invoiceId ? transitionInvoice(invoice, status) : invoice)),
    }));
    setToast({ severity: 'success', message: `Facture ${invoiceStatusLabels[status].toLowerCase()}` });
  }

  function downloadCalendar(mission: Mission) {
    const pharmacien = findPharmacien(state, mission.pharmacienId);
    const pharmacie = findPharmacie(state, mission.pharmacieId);
    downloadIcs(`${mission.missionCode}.ics`, buildMissionIcs(mission, pharmacien, pharmacie));
    setToast({ severity: 'success', message: 'Invitation calendrier téléchargée' });
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
        setToast({ severity: 'success', message: 'PDF téléchargé' });
      }
    } catch (error) {
      console.error('[PDF Download] Erreur complète:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PDF Download] Message d\'erreur:', errorMessage);
      setToast({ severity: 'error', message: 'Impossible de générer le PDF. Vérifiez les données de la facture et réessayez.' });
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  return (
    <Stack spacing={4} sx={{ width: 'min(1120px, 100%)', mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={2}>
        <BackHomeButton to="/activity" label="Accueil" data-testid="missions-back-button" />
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
            Missions
          </Typography>
          <Typography variant="h2">Pilotage des missions</Typography>
        </Stack>
      </Stack>

      {/* Filtres */}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {missionFilterOptions.map((option) => (
          <Button
            key={option.value}
            variant={statusFilter === option.value ? 'contained' : 'outlined'}
            onClick={() => setStatusFilter(option.value)}
            sx={{
              borderRadius: '999px',
              minHeight: '36px',
              padding: '8px 14px',
              fontWeight: 700,
            }}
          >
            {option.label}
          </Button>
        ))}
      </Stack>

      {/* Liste des missions */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 0 }}>
          {missions.length ? (
            <Stack spacing={0}>
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
        </CardContent>
      </Card>

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

      {/* Notifications */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
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
        borderRadius: 0,
        outline: 'none',
        '&:hover, &:focus-visible': {
          backgroundColor: (theme) => theme.palette.action.hover,
          boxShadow: 'inset 3px 0 0 currentColor',
        },
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {pharmacie?.nom ?? 'Remplacement officine'}
          </Typography>
          <Chip
            label={missionStatusLabels[mission.status]}
            color={getMissionStatusColor(mission.status)}
            size="small"
            sx={statusPillSx}
          />
          {isFirstMissionAtPharmacy ? (
            <Tooltip title="Première mission dans cette pharmacie">
              <Box
                component="span"
                aria-label="Première mission dans cette pharmacie"
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText',
                }}
              >
                <StarRoundedIcon sx={{ fontSize: 18 }} />
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
        <MissionMiniStat label="Mission" value={minimalPeriodLabel(mission)} />
        <MissionMiniStat label="Début" value={firstShiftLabel(mission)} />
        <MissionMiniStat label="Heures" value={hoursLabel(mission.totalHours)} />
        <MissionMiniStat label="Financier" value={formatMoney(mission.totalCents)} strong />
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
              sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
            >
              <PictureAsPdfRoundedIcon />
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
            sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
          >
            <CalendarMonthRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

function MissionMiniStat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 800 : 650, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
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
            borderRadius: '999px',
            backgroundColor: 'action.hover',
            color: 'text.primary',
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
        <MissionSummarySection
          mission={mission}
          pharmacie={pharmacie}
          isFirstMissionAtPharmacy={isFirstMissionAtPharmacy}
        />
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 0, overflowY: 'auto' }}>
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

function MissionSummarySection({ mission, pharmacie, isFirstMissionAtPharmacy }: { mission: Mission; pharmacie?: Pharmacie; isFirstMissionAtPharmacy: boolean }) {
  const summaryItems = [
    { label: 'Mission', value: mission.missionCode },
    { label: 'Date', value: minimalPeriodLabel(mission) },
    { label: 'Premier shift', value: firstShiftLabel(mission) },
    { label: 'Heures', value: hoursLabel(mission.totalHours) },
    { label: 'Total', value: formatMoney(mission.totalCents), strong: true },
  ];

  return (
    <Box sx={{ pr: 5, mb: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h5" sx={{ fontWeight: 850, lineHeight: 1.15 }}>
            {pharmacie?.nom ?? 'Mission pharmacie'}
          </Typography>
          <Chip
            label={missionStatusLabels[mission.status]}
            color={getMissionStatusColor(mission.status)}
            size="small"
            sx={statusPillSx}
          />
          {isFirstMissionAtPharmacy ? (
            <Tooltip title="Première mission dans cette pharmacie">
              <Box
                component="span"
                aria-label="Première mission dans cette pharmacie"
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText',
                }}
              >
                <StarRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
            </Tooltip>
          ) : null}
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
          {summaryItems.map((item) => (
            <InfoItem key={item.label} label={item.label} value={item.value} strong={item.strong} />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

function InfoItem({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 850 : 650, overflowWrap: 'anywhere', lineHeight: 1.3 }}>
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' }, gap: 2 }}>
        <InfoItem label="Adresse" value={addressLabel(pharmacie)} />
        <InfoItem label="Distance" value={mileageLabel} />
      </Box>
    </Section>
  );
}

function MissionPharmacySection({ pharmacie }: { pharmacie?: Pharmacie }) {
  const details = [
    { label: 'Nom', value: pharmacie?.nom ?? 'Pharmacie non définie' },
    { label: 'Téléphone', value: pharmacie?.telephone || 'Non renseigné' },
    { label: 'Courriel', value: pharmacie?.email || 'Non renseigné' },
    { label: 'Notes', value: pharmacie?.notes || 'Aucune note' },
  ];

  return (
    <Section title="Pharmacie" compact>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {details.map((item) => (
          <InfoItem key={item.label} label={item.label} value={item.value} />
        ))}
      </Box>
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
              borderRadius: 2,
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
      <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
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
      </Card>
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
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfRoundedIcon fontSize="small" />}
              disabled={downloadingInvoiceId === invoice.id}
              onClick={() => onOpenPdf(invoice.id)}
            >
              {downloadingInvoiceId === invoice.id ? 'Génération PDF...' : 'Télécharger PDF'}
            </Button>
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
              sx={{ borderRadius: '999px', fontWeight: 750 }}
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
