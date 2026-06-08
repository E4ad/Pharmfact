import { Card, CardContent, Stack, Typography } from '@mui/material';
import { MoneyValue } from './MoneyValue';

type Props = {
  label: string;
  valueCents?: number;
  value?: string;
  helper?: string;
};

export function MetricCard({ label, valueCents, value, helper }: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography color="text.secondary" sx={{ fontWeight: 650 }}>{label}</Typography>
          {typeof valueCents === 'number' ? (
            <MoneyValue cents={valueCents} variant="h4" />
          ) : (
            <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
          )}
          {helper ? <Typography color="text.secondary" variant="body2">{helper}</Typography> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
