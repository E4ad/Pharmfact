import { CardContent, Stack, Typography, Box, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MoneyValue } from '../../../components/MoneyValue';
import { SurfaceCard } from '../../../components/SurfaceCard';

type IconTone = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';

interface FinancialMetricCardProps {
  iconTone: IconTone;
  icon: React.ReactNode;
  label: string;
  valueCents: number;
  helperText: string;
  compact?: boolean;
}

const toneStyles: Record<IconTone, SxProps<Theme>> = {
  green: (theme) => ({
    bgcolor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
  }),
  blue: (theme) => ({
    bgcolor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
  }),
  amber: (theme) => ({
    bgcolor: alpha(theme.palette.warning.main, 0.12),
    color: theme.palette.warning.main,
  }),
  purple: (theme) => ({
    bgcolor: alpha(theme.palette.info.main, 0.1),
    color: theme.palette.info.main,
  }),
  red: (theme) => ({
    bgcolor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.main,
  }),
  gray: (theme) => ({
    bgcolor: alpha(theme.palette.text.secondary, 0.08),
    color: theme.palette.text.secondary,
  }),
};

export function FinancialMetricCard({
  iconTone,
  icon,
  label,
  valueCents,
  helperText,
  compact = false,
}: FinancialMetricCardProps) {
  return (
    <SurfaceCard contentSx={{ p: compact ? 2 : 3 }}>
      <Stack spacing={1}>
           <Box
            sx={{ 
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
              ...toneStyles[iconTone],
            }}
          >
            {icon}
          </Box>
          
          <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          
          <MoneyValue cents={valueCents} variant={compact ? 'h5' : 'h4'} />
          
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>
        </Stack>
    </SurfaceCard>
  );
}
