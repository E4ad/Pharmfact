import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { Box, IconButton, Stack, Step, StepLabel, Stepper, Typography, useTheme } from '@mui/material';
import { brandColors } from '../../design-system/tokens';
import {
  businessMissionStatusTone,
  deriveMissionBusinessStatus,
} from '../../services/businessRules';
import { nextMissionStatuses } from '../../services/missionStatus';
import { formatMoney } from '../../services/money';
import type { Invoice, Mission, MissionStatus, Pharmacie } from '../../storage/schema';
import { pharmacieDisplayName } from '../../storage/selectors';
import { formatMissionDatesSummary, formatShortDate, hoursLabel } from './missionFormatters';

const OPEN_GRADIENT = 'linear-gradient(145deg, #075985 0%, #0f3f5c 58%, #0f172a 100%)';

const MISSION_STEPS = ['Brouillon', 'À venir', 'En cours', 'Terminée', 'Archivée'];
const INVOICE_STEPS = ['Sans fact.', 'Brouillon', 'Prête à envoyer', 'Envoyée', 'Payée'];

function missionStepIndex(status: MissionStatus): number {
  switch (status) {
    case 'DRAFT':       return 0;
    case 'CONFIRMED':   return 1;
    case 'IN_PROGRESS': return 2;
    case 'COMPLETED':   return 3;
    case 'ARCHIVED':    return 4;
    default:            return 0;
  }
}

function invoiceStepperIndex(invoice: Invoice | undefined): number {
  if (!invoice) return 0;
  if (invoice.paymentStatus === 'paid') return 4;
  const s = invoice.status?.toLowerCase();
  if (s === 'paid') return 4;
  if (s === 'draft') return 1;
  if (s === 'ready_to_send' || s === 'generated') return 2;
  if (s === 'sent') return 3;
  return 0;
}

export function prevMissionStatus(status: MissionStatus): MissionStatus | undefined {
  switch (status) {
    case 'CONFIRMED':   return 'DRAFT';
    case 'IN_PROGRESS': return 'CONFIRMED';
    case 'COMPLETED':   return 'IN_PROGRESS';
    default:            return undefined;
  }
}

function invoiceNextIndex(invoice: Invoice | undefined): number | null {
  if (!invoice) return 1;
  if (invoice.paymentStatus === 'paid') return null;
  const s = invoice.status?.toLowerCase();
  if (s === 'paid') return null;
  if (s === 'draft') return 2;
  if (s === 'ready_to_send' || s === 'generated') return 3;
  if (s === 'sent') return 5;
  return null;
}

function canRevertInvoice(invoice: Invoice | undefined): boolean {
  if (!invoice) return false;
  const s = invoice.status?.toLowerCase();
  if (s === 'voided' || s === 'archived' || s === 'replaced') return false;
  if (invoice.paymentStatus === 'paid') return false;
  return s === 'draft' || s === 'ready_to_send' || s === 'generated' || s === 'sent';
}

function addressLabel(pharmacie?: Pharmacie): string {
  if (!pharmacie) return '';
  const city = pharmacie.ville
    ? `${pharmacie.ville}${pharmacie.codePostal ? `, QC ${pharmacie.codePostal}` : ''}`
    : '';
  return [pharmacie.adresse, city].filter(Boolean).join(' · ');
}

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
  const numDays = mission.days.length;
  const dateSummary = numDays > 5
    ? `${formatShortDate(mission.dateDebut)} (${numDays} jours sélectionnés)`
    : formatMissionDatesSummary(mission.days.map((d) => d.dateService));

  const accentColor =
    tone === 'primary' ? theme.palette.primary.main
    : tone === 'warning' ? theme.palette.warning.main
    : tone === 'success' ? theme.palette.success.main
    : tone === 'error'   ? theme.palette.error.main
    : theme.palette.divider;

  const hasPrevMission = prevMissionStatus(mission.status) !== undefined;
  const [primaryMissionNext] = nextMissionStatuses(mission.status).filter(s => s !== 'CANCELLED');
  const isArchiveNext = primaryMissionNext === 'ARCHIVED';
  const canAdvanceMission = Boolean(primaryMissionNext) && (!isArchiveNext || invoice?.paymentStatus === 'paid');
  const invCanRevert = canRevertInvoice(invoice);
  // Bloquer la création de facture si la mission n'est pas COMPLETED
  const invNextIdx = (!invoice && mission.status !== 'COMPLETED') ? null : invoiceNextIndex(invoice);
  const address = addressLabel(pharmacy);
  const missionStep = missionStepIndex(mission.status);
  const invoiceStep = invoiceStepperIndex(invoice);
  const isCancelled = mission.status === 'CANCELLED';

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();
  const mutedColor = isOpen ? 'rgba(255,255,255,0.65)' : 'text.secondary';

  const fwdBtnSx = {
    width: 24,
    height: 24,
    flexShrink: 0,
    color: isOpen ? 'rgba(255,255,255,0.7)' : 'text.secondary',
    '& svg': { fontSize: '0.7rem' },
    '&:disabled': { opacity: 0.35 },
  };

  const revertBtnSx = {
    width: 24,
    height: 24,
    flexShrink: 0,
    color: isOpen ? 'rgba(255,255,255,0.6)' : 'text.disabled',
    '& svg': { fontSize: '0.7rem' },
    '&:disabled': { opacity: 0.35 },
  };

  const stepperSx = {
    flex: 1,
    minWidth: 0,
    py: 0,
    '& .MuiStepIcon-root': {
      fontSize: '0.9rem',
      color: isOpen ? 'rgba(255,255,255,0.22)' : 'action.disabled',
      '&.Mui-active': { color: isOpen ? 'rgba(255,255,255,0.95)' : 'primary.main' },
      '&.Mui-completed': { color: isOpen ? 'rgba(255,255,255,0.55)' : 'success.main' },
    },
    '& .MuiStepIcon-text': {
      fontSize: '0.55rem',
      fill: isOpen ? '#0f172a' : undefined,
    },
    '& .MuiStepLabel-label': {
      fontSize: '0.62rem',
      fontWeight: 600,
      color: isOpen ? 'rgba(255,255,255,0.4)' : 'text.disabled',
      mt: 0.25,
      '&.Mui-active': { color: isOpen ? 'rgba(255,255,255,0.95)' : 'text.primary', fontWeight: 700 },
      '&.Mui-completed': { color: isOpen ? 'rgba(255,255,255,0.6)' : 'text.secondary', fontWeight: 600 },
    },
    '& .MuiStepConnector-line': {
      borderColor: isOpen ? 'rgba(255,255,255,0.18)' : 'divider',
    },
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
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 800, lineHeight: 1.2, color: isOpen ? 'common.white' : 'text.primary' }}
        >
          {pharmacy ? pharmacieDisplayName(pharmacy) : 'Remplacement officine'}
        </Typography>
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

      {/* Stepper row — full width */}
      {!isCancelled && (
        <Box
          sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 0.75 }}
          onClick={stopProp}
        >
          {/* Mission stepper */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              aria-label="Reculer : Mission :"
              disabled={!hasPrevMission}
              onClick={() => onRevertMissionStep(mission.id)}
              sx={revertBtnSx}
            >
              <ArrowBackIosNewRoundedIcon />
            </IconButton>
            <Stepper activeStep={missionStep} sx={stepperSx}>
              {MISSION_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <IconButton
              size="small"
              aria-label="Avancer : Mission"
              disabled={!primaryMissionNext}
              onClick={() => primaryMissionNext && onAdvanceMissionStep(mission.id, primaryMissionNext)}
              sx={fwdBtnSx}
            >
              <ArrowForwardIosRoundedIcon />
            </IconButton>
          </Box>

          {/* Invoice stepper */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              aria-label="Reculer : Facture :"
              disabled={!invCanRevert}
              onClick={() => onRevertInvoiceStep(mission.id)}
              sx={revertBtnSx}
            >
              <ArrowBackIosNewRoundedIcon />
            </IconButton>
            <Stepper activeStep={invoiceStep} sx={stepperSx}>
              {INVOICE_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <IconButton
              size="small"
              aria-label="Avancer : Facture"
              disabled={invNextIdx === null}
              onClick={() => invNextIdx !== null && onAdvanceInvoiceStep(mission.id, invNextIdx)}
              sx={fwdBtnSx}
            >
              <ArrowForwardIosRoundedIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}
