import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Button, Stack, Typography, type ButtonProps } from '@mui/material';
import { SurfaceCard } from './SurfaceCard';

type MetricTone = 'default' | 'primary' | 'success' | 'warning' | 'error';

type MetricCardProps = {
  label: string;
  value: string;
  helperText: string;
  tone?: MetricTone;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function MetricCard({
  label,
  value,
  helperText,
  tone = 'default',
  actionLabel,
  onAction,
  compact = false,
}: MetricCardProps) {
  const color =
    tone === 'warning'
      ? 'warning.main'
      : tone === 'error'
        ? 'error.main'
        : tone === 'success'
          ? 'success.main'
          : tone === 'primary'
            ? 'primary.main'
            : 'text.primary';

  return (
    <SurfaceCard contentSx={{ p: compact ? 2 : 2.5 }} radius="dashboardCard">
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          {label}
        </Typography>
        <Typography
          variant={compact ? 'h5' : 'h4'}
          sx={{ color, fontWeight: 850, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
        >
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
          {helperText}
        </Typography>
        {actionLabel && onAction ? (
          <Button
            size="small"
            variant="text"
            onClick={onAction}
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{ alignSelf: 'flex-start', px: 0 }}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </SurfaceCard>
  );
}

