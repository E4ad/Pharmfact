import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
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
  DialogActions,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackHomeButton } from '../../components/BackHomeButton';
import { buildMissionIcs, downloadIcs } from '../../services/calendarIcs';
import { createId } from '../../services/ids';
import { createInvoiceFromMission, invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { missionStatusLabels } from '../../services/missionStatus';
import { exportAppState, updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus, Mission, MissionStatus, Pharmacien, Pharmacie } from '../../storage/schema';
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
                  selected={selectedId === mission.id}
                  onClick={() => openMission(mission.id)}
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
          pharmacien={findPharmacien(state, selected.pharmacienId)}
          pharmacie={findPharmacie(state, selected.pharmacieId)}
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

function MissionListItem({ mission, invoice, pharmacie, selected, onClick }: {
  mission: Mission;
  invoice?: Invoice;
  pharmacie?: Pharmacie;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      data-testid="mission-row"
      onClick={onClick}
      fullWidth
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(180px, 1.5fr) minmax(180px, 1fr) auto auto' },
        alignItems: 'center',
        gap: 2,
        padding: 2,
        border: '0',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: selected ? 'action.selected' : 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 180ms ease',
        borderRadius: 0,
        '&:hover, &:focus-visible': {
          backgroundColor: (theme) => theme.palette.action.hover,
          paddingLeft: 3,
          paddingRight: 3,
        },
      }}
    >
      <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'left' }}>
        {pharmacie?.nom ?? 'Remplacement officine'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {periodLabel(mission)}
      </Typography>
      <Chip
        label={missionStatusLabels[mission.status]}
        color={getMissionStatusColor(mission.status)}
        size="small"
        sx={statusPillSx}
      />
      <Chip
        label={invoice ? invoiceStatusLabels[invoice.status] : 'Non générée'}
        color={getInvoiceStatusColor(invoice?.status)}
        size="small"
        sx={statusPillSx}
      />
    </Button>
  );
}

function MissionModal({ mission, invoice, pharmacien, pharmacie, historyOpen, downloadingInvoiceId, onClose, onToggleHistory, onCalendar, onTransitionMission, onEditMission, onGenerateInvoice, onInvoiceStatus, onOpenPdf }: {
  mission: Mission;
  invoice?: Invoice;
  pharmacien?: Pharmacien;
  pharmacie?: Pharmacie;
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
            width: { xs: '100%', md: 'min(560px, 100%)' },
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
        <MissionDrawerHeader mission={mission} pharmacien={pharmacien} pharmacie={pharmacie} />
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 0, overflowY: 'auto' }}>
      <Section title="Actions mission">
        <Button fullWidth variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={() => onCalendar(mission)}>
          Télécharger invitation calendrier
        </Button>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button fullWidth variant="contained" onClick={() => onEditMission(mission.id)}>
            Modifier
          </Button>
        </Stack>
      </Section>

      <MissionStatusControls mission={mission} onTransition={onTransitionMission} />
      <MissionBillingSection
        invoice={invoice}
        mission={mission}
        downloadingInvoiceId={downloadingInvoiceId}
        onGenerateInvoice={onGenerateInvoice}
        onInvoiceStatus={onInvoiceStatus}
        onOpenPdf={onOpenPdf}
      />
      <MissionHistorySection mission={mission} open={historyOpen} onToggle={onToggleHistory} />
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" component="h3" sx={{ fontSize: '1rem', fontWeight: 750, mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function MissionDrawerHeader({ mission, pharmacien, pharmacie }: { mission: Mission; pharmacien?: Pharmacien; pharmacie?: Pharmacie }) {
  return (
    <Box sx={{ pr: 5, mb: 3 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Type de mission
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 560, letterSpacing: '-0.05em', mt: 0.5, mb: 3 }}>
        Remplacement officine
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, margin: 0 }}>
        {[
          { label: 'Mission', value: mission.missionCode },
          { label: 'Pharmacie', value: pharmacie?.nom ?? 'Pharmacie non définie' },
          { label: 'Pharmacien', value: pharmacien?.nom ?? 'Pharmacien non défini' },
          { label: 'Période', value: periodLabel(mission) },
          { label: 'Résumé', value: `${mission.totalHours.toFixed(2)} h · ${formatMoney(mission.totalCents)}` },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'grid', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 560 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MissionStatusControls({ mission, onTransition }: { mission: Mission; onTransition: (mission: Mission, status: MissionStatus) => void }) {
  return (
    <Section title="Statut mission">
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {missionStatusOptions.map((status) => (
          <Button
            key={status}
            variant={mission.status === status ? 'contained' : 'outlined'}
            onClick={() => onTransition(mission, status)}
            sx={{
              borderRadius: '14px',
              minHeight: '44px',
              padding: '10px 14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 160ms ease',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
            }}
          >
            {missionStatusLabels[status]}
          </Button>
        ))}
      </Stack>
    </Section>
  );
}

function MissionBillingSection({ invoice, mission, downloadingInvoiceId, onGenerateInvoice, onInvoiceStatus, onOpenPdf }: {
  invoice?: Invoice;
  mission: Mission;
  downloadingInvoiceId: string | null;
  onGenerateInvoice: (mission: Mission) => void;
  onInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  onOpenPdf: (invoiceId: string) => void;
}) {
  return (
    <Section title="Facturation">
      <Card variant="outlined" sx={{ p: 2, backgroundColor: 'background.paper' }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Statut facture
          </Typography>
          <Chip
            label={invoice ? invoiceStatusLabels[invoice.status] : 'Non générée'}
            color={getInvoiceStatusColor(invoice?.status)}
            size="small"
            sx={statusPillSx}
          />
        </Stack>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {!invoice ? (
            <Button fullWidth variant="contained" onClick={() => onGenerateInvoice(mission)}>
              Générer facture
            </Button>
          ) : null}
          {invoice ? (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadRoundedIcon fontSize="small" />}
              disabled={downloadingInvoiceId === invoice.id}
              onClick={() => onOpenPdf(invoice.id)}
            >
              {downloadingInvoiceId === invoice.id ? 'Génération PDF...' : 'Télécharger PDF'}
            </Button>
          ) : null}
          {invoice?.status === 'GENERATED' ? (
            <Button fullWidth variant="contained" onClick={() => onInvoiceStatus(invoice.id, 'SENT')}>
              Envoyer au paiement
            </Button>
          ) : null}
          {invoice?.status === 'SENT' ? (
            <Button fullWidth variant="contained" onClick={() => onInvoiceStatus(invoice.id, 'PAID')}>
              Marquer payée
            </Button>
          ) : null}
          {invoice?.status === 'PAID' ? (
            <Button fullWidth variant="outlined" onClick={() => onInvoiceStatus(invoice.id, 'ARCHIVED')}>
              Archiver
            </Button>
          ) : null}
          {invoice?.status === 'ARCHIVED' ? (
            <Button fullWidth variant="outlined" onClick={() => onInvoiceStatus(invoice.id, 'GENERATED')}>
              Restaurer
            </Button>
          ) : null}
        </Stack>
      </Card>
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
