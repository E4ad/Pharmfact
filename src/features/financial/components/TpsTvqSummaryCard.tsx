import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { MoneyValue } from '../../../components/MoneyValue';
import { formatMoney } from '../../../services/money';
import type { AnnualFinancialSnapshot, MonthlyFinancialSnapshot } from '../../../services/financialMetrics';
import type { FiscalSettings } from '../../../storage/schema';

/**
 * Props pour la carte récapitulative TPS/TVQ
 */
export interface TpsTvqSummaryCardProps {
  annual: AnnualFinancialSnapshot;
  selectedMonthly: MonthlyFinancialSnapshot | undefined;
  onViewDetail: () => void;
}

/**
 * Carte récapitulative pour TPS/TVQ
 * Affiche les montants collectés, remis et le solde estimé
 */
export function TpsTvqSummaryCard({ annual, selectedMonthly, onViewDetail }: TpsTvqSummaryCardProps) {
  const gstQstCollected = selectedMonthly?.gstQstCollectedCents ?? annual.gstQstCollectedCents ?? 0;
  const gstQstRemitted = selectedMonthly?.gstQstRemittedCents ?? annual.gstQstRemittedCents ?? 0;
  const gstQstRemaining = annual.gstQstRemainingCents ?? 0;

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">TPS/TVQ</Typography>
          
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography>TPS/TVQ collectée :</Typography>
              <MoneyValue cents={gstQstCollected} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>TPS/TVQ remise :</Typography>
              <MoneyValue cents={gstQstRemitted} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Solde estimé :</Typography>
              <MoneyValue cents={gstQstRemaining} />
            </Stack>
          </Stack>

          <Button
            variant="outlined"
            size="small"
            onClick={onViewDetail}
            sx={{ alignSelf: 'flex-start' }}
          >
            Voir détail
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default TpsTvqSummaryCard;
