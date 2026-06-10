import { Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { MoneyValue } from '../../../components/MoneyValue';
import type { AnnualFinancialSnapshot } from '../../../services/financialMetrics';
import type { FiscalSettings } from '../../../storage/schema';

/**
 * Props pour la carte de seuil de petit fournisseur
 */
export interface SmallSupplierThresholdCardProps {
  annual: AnnualFinancialSnapshot;
  financialSettings: FiscalSettings;
}

/**
 * Carte pour afficher le statut de seuil de petit fournisseur
 * Montre la progression vers le seuil et le statut actuel
 */
export function SmallSupplierThresholdCard({ annual, financialSettings }: SmallSupplierThresholdCardProps) {
  const thresholdCents = financialSettings.smallSupplierThresholdCents ?? 3000000; // 30 000$ par défaut
  const rollingFourQuartersCents = annual.rollingFourQuartersTaxableSuppliesCents ?? 0;
  
  const threshold = thresholdCents / 100;
  const currentSupplies = rollingFourQuartersCents / 100;
  const progress = Math.min((currentSupplies / threshold) * 100, 100);

  // Déterminer le statut
  let status: 'UNDER_THRESHOLD' | 'NEAR_LIMIT' | 'OVER_LIMIT' | 'THRESHOLD_REACHED';
  let statusLabel: string;
  let statusColor: string;

  if (currentSupplies >= threshold) {
    status = 'OVER_LIMIT';
    statusLabel = 'Seuil dépassé';
    statusColor = '#dc2626';
  } else if (currentSupplies >= threshold * 0.8) {
    status = 'NEAR_LIMIT';
    statusLabel = 'Proche du seuil';
    statusColor = '#d97706';
  } else if (currentSupplies >= threshold * 0.5) {
    status = 'THRESHOLD_REACHED';
    statusLabel = 'Seuil atteint';
    statusColor = '#d97706';
  } else {
    status = 'UNDER_THRESHOLD';
    statusLabel = 'Sous le seuil';
    statusColor = '#059669';
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Seuil petit fournisseur</Typography>
          
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Seuil :</Typography>
              <MoneyValue cents={thresholdCents} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>4 derniers trimestres :</Typography>
              <MoneyValue cents={rollingFourQuartersCents} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Statut :</Typography>
              <Typography color={statusColor}>{statusLabel}</Typography>
            </Stack>
          </Stack>

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Progression vers le seuil
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: statusColor,
                },
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'right' }}>
              {Math.round(progress)}%
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default SmallSupplierThresholdCard;
