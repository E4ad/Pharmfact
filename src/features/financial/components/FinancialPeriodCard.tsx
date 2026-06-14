import { CardContent, MenuItem, Select, Stack, Typography, Button } from '@mui/material';
import { formatMoney } from '../../../services/money';
import { SurfaceCard } from '../../../components/SurfaceCard';

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

const periodLabels = {
  monthly: 'État financier — ',
  quarterly: 'État financier — ',
  annual: 'État financier — ',
} as const;

const periodExportLabels = {
  monthly: 'mensuelle',
  quarterly: 'trimestrielle',
  annual: 'annuelle',
} as const;

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
  const renderPeriodSelect = () => (
    <Select
      value={periodLabel}
      onChange={(e) => onPeriodChange(e.target.value)}
      size="small"
      sx={{ minWidth: 220 }}
    >
      {availablePeriods.map((period) => (
        <MenuItem key={period} value={period}>
          {periodType === 'monthly'
            ? new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T00:00:00`))
            : period}
        </MenuItem>
      ))}
    </Select>
  );

  return (
    <SurfaceCard>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">
            {periodLabels[periodType]}{periodLabel}
          </Typography>

          {renderPeriodSelect()}

           <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack spacing={1}>
              <Typography variant="body1">À encaisser : {formatMoney(amountToCollect)}</Typography>
              <Typography variant="body1">Dépenses : {formatMoney(expenses)}</Typography>
              <Typography variant="body1">Acomptes versés : {formatMoney(instalmentsPaid)}</Typography>
            </Stack>

            <Button onClick={onExport} variant="outlined" size="small">
              Exporter synthèse {periodExportLabels[periodType]}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </SurfaceCard>
  );
}
