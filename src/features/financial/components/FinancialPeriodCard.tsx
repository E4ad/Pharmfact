import { Card, CardContent, MenuItem, Select, Stack, Typography, Button } from '@mui/material';
import { formatMoney } from '../../../services/money';

interface FinancialPeriodCardProps {
  periodType: 'monthly' | 'quarterly' | 'annual';
  periodLabel: string;
  amountToCollect: number;
  expenses: number;
  instalmentsPaid: number;
  onPeriodChange: (newPeriod: string) => void;
  availablePeriods: string[];
  onExport: () => void;
}

export function FinancialPeriodCard({
  periodType,
  periodLabel,
  amountToCollect,
  expenses,
  instalmentsPaid,
  onPeriodChange,
  availablePeriods,
  onExport,
}: FinancialPeriodCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">
            {periodType === 'monthly' ? 'État financier — ' : periodType === 'quarterly' ? 'État financier — ' : 'État financier — '}
            {periodLabel}
          </Typography>

          {periodType === 'monthly' && (
            <Select
              value={periodLabel}
              onChange={(e) => onPeriodChange(e.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
            >
              {availablePeriods.map((period) => (
                <MenuItem key={period} value={period}>
                  {new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T00:00:00`))}
                </MenuItem>
              ))}
            </Select>
          )}

          {periodType === 'quarterly' && (
            <Select
              value={periodLabel}
              onChange={(e) => onPeriodChange(e.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
            >
              {availablePeriods.map((period) => (
                <MenuItem key={period} value={period}>
                  {period}
                </MenuItem>
              ))}
            </Select>
          )}

          {periodType === 'annual' && (
            <Select
              value={periodLabel}
              onChange={(e) => onPeriodChange(e.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
            >
              {availablePeriods.map((period) => (
                <MenuItem key={period} value={period}>
                  {period}
                </MenuItem>
              ))}
            </Select>
          )}

           <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack spacing={1}>
              <Typography variant="body1">À encaisser : {formatMoney(amountToCollect)}</Typography>
              <Typography variant="body1">Dépenses : {formatMoney(expenses)}</Typography>
              <Typography variant="body1">Acomptes versés : {formatMoney(instalmentsPaid)}</Typography>
            </Stack>

            <Button onClick={onExport} variant="outlined" size="small">
              Exporter synthèse {periodType === 'monthly' ? 'mensuelle' : periodType === 'quarterly' ? 'trimestrielle' : 'annuelle'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
