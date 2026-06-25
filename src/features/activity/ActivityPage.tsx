import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import {
  alpha,
  Box,
  ButtonBase,
  Chip,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { type Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SurfaceCard } from '../../components/SurfaceCard';
import { spacingScale, borderWidth, borderRadiusScale } from '../../design-system/tokens';
import { useAppState } from '../../storage/localStore';
import { activePharmacien } from '../../storage/selectors';
import { buildInvoicePipelineMetrics, buildMissionWindowMetrics } from '../../services/dashboardMetrics';
import { formatMoney } from '../../services/money';
import { todayIso } from '../../services/ids';

type QuickAction = {
  title: string;
  description?: string;
  href: string;
  icon: ReactNode;
  badge?: string;
  testId: string;
  primary?: boolean;
};

function getTileHoverBg(theme: Theme): string {
  return theme.palette.mode === 'dark'
    ? alpha(theme.palette.common.white, 0.05)
    : alpha(theme.palette.primary.main, 0.045);
}

function getTileActiveBg(theme: Theme): string {
  return theme.palette.mode === 'dark'
    ? alpha(theme.palette.common.white, 0.07)
    : alpha(theme.palette.primary.main, 0.06);
}

function getTileStyles(theme: Theme) {
  return {
    cursor: 'pointer',
    transition: 'background-color 140ms ease',
    '&:hover': { bgcolor: getTileHoverBg(theme) },
    '&:focus-visible': {
      outline: `2px solid ${alpha(theme.palette.primary.main, 0.55)}`,
      outlineOffset: 2,
    },
    '&:active': { bgcolor: getTileActiveBg(theme) },
  } as const;
}

/**
 * Shared KPI tile component for Priorités section
 */
function KpiTile({
  label,
  value,
  accent,
  interactive = false,
  onClick,
  testId,
}: {
  label: string;
  value: string;
  accent?: string;
  interactive?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const theme = useTheme();

  return (
    <SurfaceCard
      data-testid={testId}
      component={interactive ? ButtonBase : 'div'}
      onClick={onClick}
      radius="dashboardCard"
      contentSx={{ p: 0 }}
      sx={{
        ...getTileStyles(theme),
        cursor: interactive ? 'pointer' : 'default',
        height: 72,
        border: `${borderWidth.thin}px solid ${alpha(theme.palette.divider, 0.6)}`,
        '&:hover': {
          ...getTileStyles(theme)['&:hover'],
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          px: spacingScale.lg,
          py: spacingScale.md,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontSize: '0.6875rem',
            lineHeight: 1,
            mb: 0.25,
            color: 'text.secondary',
            textAlign: 'left',
          }}
        >
          {label}
        </Typography>
        <Typography
          component="div"
          sx={{
            fontWeight: 750,
            fontSize: '1rem',
            lineHeight: 1,
            color: accent ?? 'text.primary',
            textAlign: 'left',
          }}
        >
          {value}
        </Typography>
      </Box>
    </SurfaceCard>
  );
}

/**
 * Quick action tile with horizontal layout - taller height
 */
function QuickActionTile({
  title,
  icon,
  badge,
  onClick,
  testId,
  primary = false,
}: {
  title: string;
  icon: ReactNode;
  badge?: string;
  onClick: () => void;
  testId: string;
  primary?: boolean;
}) {
  const theme = useTheme();

  const baseSx = {
    ...getTileStyles(theme),
    height: 96,
    cursor: 'pointer',
    border: `${borderWidth.thin}px solid ${alpha(theme.palette.divider, 0.6)}`,
  };

  if (primary) {
    Object.assign(baseSx, {
      bgcolor: alpha(theme.palette.primary.main, 0.035),
      borderColor: alpha(theme.palette.primary.main, 0.35),
    });
  }

  return (
    <SurfaceCard
      data-testid={testId}
      component={ButtonBase}
      onClick={onClick}
      radius="dashboardCard"
      contentSx={{ p: 0 }}
      sx={baseSx}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          px: spacingScale.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacingScale.sm,
        }}
      >
        <Box
          sx={(theme) => ({
            width: 28,
            height: 28,
            borderRadius: borderRadiusScale.md,
            display: 'grid',
            placeItems: 'center',
            color: primary ? theme.palette.primary.main : theme.palette.text.secondary,
            bgcolor: primary
              ? alpha(theme.palette.primary.main, 0.12)
              : alpha(theme.palette.text.secondary, 0.08),
            flexShrink: 0,
          })}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.875rem',
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
        </Box>
        {badge ? (
          <Chip
            size="small"
            label={badge}
            sx={{
              height: 18,
              fontSize: '0.625rem',
              fontWeight: 700,
              flexShrink: 0,
              ...(primary
                ? {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main,
                  }
                : {}),
            }}
          />
        ) : null}
      </Box>
    </SurfaceCard>
  );
}

function ActivityHeader() {
  const navigate = useNavigate();
  const state = useAppState();
  const pharmacien = activePharmacien(state);

  return (
    <Box
      component="header"
      sx={[
        (theme) => ({
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 12,
          minHeight: 88,
          px: { xs: spacingScale.md, md: spacingScale.lg },
          py: { xs: spacingScale.xs, md: spacingScale.sm },
          color: 'common.white',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, #1e293b 0%, #334155 100%)`
              : `linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)`,
        }),
      ]}
    >
      <Stack
        direction="row"
        sx={{
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={(theme) => ({
              color: alpha(theme.palette.common.white, 0.78),
              fontWeight: 800,
              letterSpacing: '0.12em',
            })}
          >
            PharmFact
          </Typography>
          <Typography
            variant="h1"
            sx={{
              color: 'inherit',
              fontWeight: 850,
              letterSpacing: '-0.04em',
              fontSize: { xs: '1.6rem', md: '2rem' },
            }}
          >
            {pharmacien ? `Bonjour, ${pharmacien.nom.split(' ')[0]}` : 'Bonjour'}
          </Typography>
        </Box>
        <IconButton
          aria-label="Options"
          data-testid="activity-options-icon"
          onClick={() => navigate('/options')}
          sx={{
            alignSelf: 'flex-start',
            width: 32,
            height: 32,
            color: 'common.white',
            bgcolor: alpha('#fff', 0.12),
            border: `${borderWidth.thin}px solid ${alpha('#fff', 0.2)}`,
            '&:hover': {
              bgcolor: alpha('#fff', 0.18),
            },
          }}
        >
          <SettingsRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <Typography
      variant="h3"
      component="h2"
      sx={{
        fontWeight: 700,
        fontSize: '1.125rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
        mb: spacingScale.xs,
      }}
    >
      {title}
    </Typography>
  );
}

/**
 * Priority tile item - uses same KpiTile with accent colors for active values
 */
function PriorityTileItem({
  label,
  value,
  tone,
  isActive,
  onClick,
  testId,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'primary' | 'warning' | 'error';
  isActive: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const theme = useTheme();
  const accentColor =
    tone === 'warning' && isActive
      ? theme.palette.warning.main
      : tone === 'error' && isActive
        ? theme.palette.error.main
        : tone === 'primary' && isActive
          ? theme.palette.primary.main
          : 'text.secondary';

  return (
    <KpiTile
      label={label}
      value={value}
      accent={accentColor}
      interactive
      onClick={onClick}
      testId={testId}
    />
  );
}

/**
 * Format upcoming activity as a sentence
 */
function formatUpcomingActivity(
  missionMetrics: ReturnType<typeof buildMissionWindowMetrics>,
  nextMission: ReturnType<typeof buildMissionWindowMetrics>['upcomingMissions'][0] | undefined,
): string {
  const count = missionMetrics.upcomingCount;
  const hours = missionMetrics.estimatedHours.toFixed(1).replace('.', ',');
  const amount = formatMoney(missionMetrics.estimatedCents);

  // Calculate week number (ISO week)
  const today = new Date(missionMetrics.windowStartIso);
  const weekNumber = getISOWeekNumber(today);

  if (count === 0) {
    return `Semaine ${weekNumber} : Aucune mission à venir.`;
  }

  let sentence = `Semaine ${weekNumber} : ${count} mission${count > 1 ? 's' : ''} à venir, pour un total de ${hours} h (${amount})`;

  if (nextMission) {
    const date = formatDate(nextMission.dateDebut);
    // Get start/end times from the first day of the mission
    const firstDay = nextMission.days[0];
    const startTime = firstDay?.startTime || '08:00';
    const endTime = firstDay?.endTime || '17:00';
    sentence += `. Début de la prochaine mission le ${date} de ${startTime} à ${endTime}`;
  }

  return sentence;
}

function getISOWeekNumber(date: Date): number {
  const thursday = new Date(date.getTime() + (3 - ((date.getDay() + 6) % 7)) * 86400000);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const weekDiff = (thursday.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round(weekDiff / 7);
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  return new Intl.DateTimeFormat('fr-CA', options).format(date);
}

function buildQuickActions(
  state: ReturnType<typeof useAppState>,
  invoiceMetrics: ReturnType<typeof buildInvoicePipelineMetrics>,
): QuickAction[] {
  return [
    {
      title: 'Créer une mission',
      href: '/mission/new',
      icon: <AssignmentRoundedIcon />,
      testId: 'activity-action-create-mission',
      primary: true,
    },
    {
      title: 'Suivi des missions',
      href: '/missions',
      icon: <FactCheckRoundedIcon />,
      testId: 'activity-action-missions',
    },
    {
      title: 'Factures & encaissement',
      href: '/invoices?filter=receivable',
      icon: <ReceiptLongRoundedIcon />,
      badge: invoiceMetrics.receivableCount ? `${invoiceMetrics.receivableCount} à encaisser` : undefined,
      testId: 'activity-action-invoices',
    },
    {
      title: 'Pilotage fiscal',
      href: '/financial',
      icon: <QueryStatsRoundedIcon />,
      testId: 'activity-action-financial',
    },
    {
      title: 'Pharmacies',
      href: '/pharmacies',
      icon: <LocalHospitalRoundedIcon />,
      badge: state.pharmacies.length ? `${state.pharmacies.length}` : undefined,
      testId: 'activity-action-pharmacies',
    },
    {
      title: 'Pharmaciens',
      href: '/options?panel=references',
      icon: <PersonRoundedIcon />,
      badge: state.pharmaciens.length ? `${state.pharmaciens.length}` : undefined,
      testId: 'activity-action-pharmaciens',
    },
  ];
}

export function ActivityPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const today = todayIso();
  const missionMetrics = buildMissionWindowMetrics(state, today);
  const invoiceMetrics = buildInvoicePipelineMetrics(state, today);

  const hasPrioItems =
    missionMetrics.toInvoiceCount > 0 ||
    invoiceMetrics.toSendCount > 0 ||
    invoiceMetrics.receivableCount > 0 ||
    invoiceMetrics.overdueCount > 0;

  const upcomingMissions = [...missionMetrics.upcomingMissions]
    .sort((a, b) =>
      `${a.dateDebut}${a.createdAt}`.localeCompare(`${b.dateDebut}${b.createdAt}`),
    );
  const nextMission = upcomingMissions[0];

  const quickActions = buildQuickActions(state, invoiceMetrics);
  const upcomingActivityText = formatUpcomingActivity(missionMetrics, nextMission);

  return (
    <Stack
      spacing={0}
      sx={{
        width: 'min(1160px, 100%)',
        mx: 'auto',
        px: { xs: spacingScale.md, md: spacingScale.xl },
        py: { xs: spacingScale.sm, md: spacingScale.md },
      }}
    >
      <ActivityHeader />

      <Box sx={{ mt: spacingScale.lg }}>
        <SectionHeading title="Activité à venir" />
        <Typography
          sx={{
            fontSize: '1rem',
            lineHeight: 1.4,
            color: 'text.primary',
          }}
        >
          {upcomingActivityText}
        </Typography>
      </Box>

      <Box sx={{ mt: spacingScale.xl }}>
        <SectionHeading title="Actions rapides" />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: spacingScale.sm,
          }}
        >
          {quickActions.map((action) => (
            <QuickActionTile
              key={action.testId}
              title={action.title}
              icon={action.icon}
              badge={action.badge}
              onClick={() => navigate(action.href)}
              testId={action.testId}
              primary={action.primary}
            />
          ))}
        </Box>
      </Box>

      {hasPrioItems ? (
        <Box sx={{ mt: spacingScale.xl }}>
          <SectionHeading title="Priorités" />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: spacingScale.sm,
            }}
          >
            <PriorityTileItem
              label="À facturer"
              value={String(missionMetrics.toInvoiceCount)}
              tone="warning"
              isActive={missionMetrics.toInvoiceCount > 0}
              onClick={() => navigate('/missions?filter=to_invoice')}
              testId="activity-prio-to-invoice"
            />
            <PriorityTileItem
              label="À envoyer"
              value={String(invoiceMetrics.toSendCount)}
              tone="primary"
              isActive={invoiceMetrics.toSendCount > 0}
              onClick={() => navigate('/invoices?filter=to_send')}
              testId="activity-prio-to-send"
            />
            <PriorityTileItem
              label="À encaisser"
              value={formatMoney(invoiceMetrics.receivableCents)}
              tone="primary"
              isActive={invoiceMetrics.receivableCount > 0}
              onClick={() => navigate('/invoices?filter=receivable')}
              testId="activity-prio-receivable"
            />
            <PriorityTileItem
              label="Retards"
              value={String(invoiceMetrics.overdueCount)}
              tone="error"
              isActive={invoiceMetrics.overdueCount > 0}
              onClick={() => navigate('/invoices?filter=overdue')}
              testId="activity-prio-overdue"
            />
          </Box>
        </Box>
      ) : null}
    </Stack>
  );
}
