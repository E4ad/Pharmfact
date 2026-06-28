import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { Box, Chip, IconButton, Stack, Typography, useTheme } from '@mui/material';
import { brandColors, borderRadiusScale } from '../../design-system/tokens';
import { StatusChip } from '../../components/StatusChip';
import {
  businessMissionStatusTone,
  deriveMissionBusinessStatus,
} from '../../services/businessRules';
import { nextMissionStatuses } from '../../services/missionStatus';
import { formatMoney } from '../../services/money';
import type { Invoice, Mission, MissionStatus, Pharmacie } from '../../storage/schema';
import { pharmacieDisplayName } from '../../storage/selectors';
import { formatMissionDatesSummary, hoursLabel } from './missionFormatters';

const OPEN_GRADIENT = 'linear-gradient(145deg, #075985 0%, #0f3f5c 58%, #0f172a 100%)';

export function prevMissionStatus(status: MissionStatus): MissionStatus | undefined {
  switch (status) {
    case 'CONFIRMED':   return 'DRAFT';
    case 'IN_PROGRESS': return 'CONFIRMED';
    case 'COMPLETED':   return 'IN_PROGRESS';
    default:            return undefined;
  }
}

// ─── Invoice frise helpers ────────────────────────────────────────────────────

function invoiceStepLabel(invoice: Invoice | undefined): string {
  if (!invoice) return 'Sans fact.';
  const s = invoice.status?.toLowerCase();
  if (s === 'draft') return 'Brouillon';
  if (s === 'ready_to_send' || s === 'generated') return 'Prête à envoyer';
  if (s === 'sent') return 'Envoyée';
  if (s === 'paid' || invoice.paymentStatus === 'paid') return 'Payée';
  if (s === 'voided' || s === 'archived' || s === 'replaced') return 'Archivée';
  return 'Brouillon';
}

function invoiceNextIndex(invoice: Invoice | undefined): number | null {
  if (!invoice) return 1;
  const s = invoice.status?.toLowerCase();
  if (s === 'draft') return 2;
  if (s === 'ready_to_send' || s === 'generated') return 3;
  if (s === 'sent' && invoice.paymentStatus !== 'paid') return 5;
  return null;
}

function invoiceNextLabel(invoice: Invoice | undefined): string | null {
  if (!invoice) return 'Créer facture';
  const s = invoice.status?.toLowerCase();
  if (s === 'draft') return 'Prévisualiser';
  if (s === 'ready_to_send' || s === 'generated') return 'Envoyée';
  if (s === 'sent' && invoice.paymentStatus !== 'paid') return 'Encaisser';
  return null;
}

function canRevertInvoice(invoice: Invoice | undefined): boolean {
  if (!invoice) return false;
  const s = invoice.status?.toLowerCase();
  if (s === 'voided' || s === 'archived' || s === 'replaced') return false;
  if (invoice.paymentStatus === 'paid') return false;
  return s === 'draft' || s === 'ready_to_send' || s === 'generated' || s === 'sent';
}

const NEXT_STATUS_LABELS: Partial<Record<MissionStatus, string>> = {
  CONFIRMED:   'Confirmer',
  IN_PROGRESS: 'Démarrer',
  COMPLETED:   'Terminer',
  ARCHIVED:    'Archiver',
};

// ─── Address helper ───────────────────────────────────────────────────────────

function addressLabel(pharmacie?: Pharmacie): string {
  if (!pharmacie) return '';
  const city = pharmacie.ville
    ? `${pharmacie.ville}${pharmacie.codePostal ? `, QC ${pharmacie.codePostal}` : ''}`
    : '';
  return [pharmacie.adresse, city].filter(Boolean).join(' · ');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MissionListCardProps {
  mission: Mission;
  invoice?: Invoice;
  pharmacy?: Pharmacie;
  isOpen: boolean;
  onToggle: () => void;
  onDownloadPdf: (invoiceId: string) => void;
  onDownloadIcs: (mission: Mission) => void;
  onAdvanceMissionStep: (missionId: string, targetStatus: MissionStatus) => void;
  onAdvanceInvoiceStep: (missionId: string, nextIndex: number) => void;
  onRevertMissionStep: (missionId: string) => void;
  onRevertInvoiceStep: (missionId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MissionListCard({
  mission,
  invoice,
  pharmacy,
  isOpen,
  onToggle,
  onAdvanceMissionStep,
  onAdvanceInvoiceStep,
  onRevertMissionStep,
  onRevertInvoiceStep,
}: MissionListCardProps) {
  const theme = useTheme();
  const businessStatus = deriveMissionBusinessStatus(mission, invoice);
  const tone = businessMissionStatusTone(businessStatus);
  const totalHours = mission.days.reduce((sum, d) => sum + d.hours, 0);
  const dateSummary = formatMissionDatesSummary(mission.days.map((d) => d.dateService));

  const accentColor =
    tone === 'primary' ? theme.palette.primary.main
    : tone === 'warning' ? theme.palette.warning.main
    : tone === 'success' ? theme.palette.success.main
    : tone === 'error'   ? theme.palette.error.main
    : theme.palette.divider;

  const [primaryMissionNext] = nextMissionStatuses(mission.status);
  const hasPrevMission = prevMissionStatus(mission.status) !== undefined;
  const invNextIdx = invoiceNextIndex(invoice);
  const invNextLabel = invoiceNextLabel(invoice);
  const invCanRevert = canRevertInvoice(invoice);
  const address = addressLabel(pharmacy);

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  // Style helpers
  const mutedColor = isOpen ? 'rgba(255,255,255,0.65)' : 'text.secondary';

  const actionChipSx = {
    fontSize: '0.7rem',
    height: 20,
    fontWeight: 700,
    ...(isOpen && {
      color: 'common.white',
      borderColor: 'rgba(255,255,255,0.35)',
      bgcolor: 'rgba(255,255,255,0.1)',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
    }),
  };

  const revertBtnSx = {
    width: 24,
    height: 24,
    color: isOpen ? 'rgba(255,255,255,0.6)' : 'text.disabled',
    '& svg': { fontSize: '0.7rem' },
    '&:disabled': { opacity: 0.35 },
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      sx={(t) => ({
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1.4fr) minmax(240px, 1fr) auto' },
        gridTemplateRows: 'auto auto',
        gap: { xs: 1.5, md: 2 },
        p: { xs: 2, md: 2.5 },
        cursor: 'pointer',
        textAlign: 'left',
        borderLeft: isOpen ? '3px solid rgba(255,255,255,0.55)' : `3px solid ${accentColor}`,
        borderBottom: '1px solid',
        borderColor: isOpen ? 'rgba(255,255,255,0.12)' : 'divider',
        backgroundImage: isOpen ? OPEN_GRADIENT : 'none',
        backgroundColor: isOpen ? 'primary.dark' : 'transparent',
        color: isOpen ? 'common.white' : 'inherit',
        transition: 'background-color 180ms ease, color 180ms ease, border-color 180ms ease',
        ...(!isOpen && {
          '&:hover, &:focus-visible': {
            backgroundColor: t.palette.action.hover,
            outline: `3px solid ${brandColors.primary[600]}`,
            outlineOffset: 2,
          },
        }),
        ...(isOpen && {
          '&:focus-visible': {
            outline: '3px solid rgba(255,255,255,0.4)',
            outlineOffset: 2,
          },
        }),
      })}
    >
      {/* Col 1 — Identity */}
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, lineHeight: 1.2, color: isOpen ? 'common.white' : 'text.primary' }}
          >
            {pharmacy ? pharmacieDisplayName(pharmacy) : 'Remplacement officine'}
          </Typography>
          <StatusChip kind="mission" status={mission.status} />
        </Stack>
        {address ? (
          <Typography variant="body2" sx={{ color: mutedColor }}>
            {address}
          </Typography>
        ) : null}
        {mission.missionCode ? (
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: mutedColor }}
          >
            {mission.missionCode}
          </Typography>
        ) : null}
      </Stack>

      {/* Col 2 — Dates + hours */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: isOpen ? 'rgba(255,255,255,0.92)' : 'text.primary', overflowWrap: 'anywhere' }}
        >
          {dateSummary}
        </Typography>
        <Typography variant="body2" sx={{ color: mutedColor }}>
          {hoursLabel(totalHours)} payées
        </Typography>
      </Box>

      {/* Col 3 — Amount + chevron */}
      <Stack spacing={0.5} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: isOpen ? 'common.white' : 'text.primary',
            minWidth: 90,
            textAlign: { xs: 'left', md: 'right' },
          }}
        >
          {formatMoney(mission.totalCents)}
        </Typography>
        <Box sx={{ color: isOpen ? 'rgba(255,255,255,0.6)' : 'text.disabled' }}>
          {isOpen
            ? <KeyboardArrowUpRoundedIcon fontSize="small" />
            : <KeyboardArrowDownRoundedIcon fontSize="small" />
          }
        </Box>
      </Stack>

      {/* Frise row — full width */}
      <Box
        sx={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 1 }}
        onClick={stopProp}
      >
        {/* Mission frise */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <IconButton
            size="small"
            aria-label="Reculer : Mission :"
            disabled={!hasPrevMission}
            onClick={() => onRevertMissionStep(mission.id)}
            sx={revertBtnSx}
          >
            <ArrowBackIosNewRoundedIcon />
          </IconButton>
          <Typography variant="caption" sx={{ fontWeight: 700, color: mutedColor, fontSize: '0.7rem' }}>
            {businessStatus === 'draft' ? 'Brouillon'
              : businessStatus === 'planned' ? 'Planifiée'
              : businessStatus === 'in_progress' ? 'En cours'
              : businessStatus === 'completed' ? 'Terminée'
              : businessStatus === 'archived' ? 'Archivée'
              : 'Mission'}
          </Typography>
          {primaryMissionNext && NEXT_STATUS_LABELS[primaryMissionNext] ? (
            <Chip
              label={`→ ${NEXT_STATUS_LABELS[primaryMissionNext]}`}
              size="small"
              variant="outlined"
              onClick={() => onAdvanceMissionStep(mission.id, primaryMissionNext)}
              sx={{ ...actionChipSx, borderRadius: borderRadiusScale.full }}
            />
          ) : (
            <Box sx={{ width: 24 }} />
          )}
        </Stack>

        {/* Invoice frise */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <IconButton
            size="small"
            aria-label="Reculer : Facture :"
            disabled={!invCanRevert}
            onClick={() => onRevertInvoiceStep(mission.id)}
            sx={revertBtnSx}
          >
            <ArrowBackIosNewRoundedIcon />
          </IconButton>
          <Typography variant="caption" sx={{ fontWeight: 700, color: mutedColor, fontSize: '0.7rem' }}>
            {invoiceStepLabel(invoice)}
          </Typography>
          {invNextIdx !== null && invNextLabel ? (
            <Chip
              label={`→ ${invNextLabel}`}
              size="small"
              variant="outlined"
              onClick={() => onAdvanceInvoiceStep(mission.id, invNextIdx)}
              sx={{ ...actionChipSx, borderRadius: borderRadiusScale.full }}
            />
          ) : (
            <Box sx={{ width: 24 }} />
          )}
          {invNextIdx !== null ? (
            <IconButton
              size="small"
              aria-label={`Avancer : Facture : ${invNextLabel}`}
              onClick={() => onAdvanceInvoiceStep(mission.id, invNextIdx)}
              sx={{ ...revertBtnSx, color: isOpen ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
            >
              <ArrowForwardIosRoundedIcon />
            </IconButton>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
