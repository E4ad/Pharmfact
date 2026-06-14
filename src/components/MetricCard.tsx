import { Stack, Typography } from '@mui/material';
import { MoneyValue } from './MoneyValue';
import { SurfaceCard } from './SurfaceCard';

type Props = {
  label: string;
  valueCents?: number;
  value?: string;
  helper?: string;
};

export function MetricCard({ label, valueCents, value, helper }: Props) {
  return (
    <SurfaceCard>
      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography>
        {typeof valueCents === 'number' ? (
          <MoneyValue cents={valueCents} variant="h4" sx={{ fontWeight: 850 }} />
        ) : (
          <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 850 }}>{value}</Typography>
        )}
        {helper ? <Typography color="text.secondary" variant="body2">{helper}</Typography> : null}
      </Stack>
    </SurfaceCard>
  );
}
