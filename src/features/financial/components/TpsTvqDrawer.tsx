import { Stack, Typography, Button } from '@mui/material';
import { FinancialDrawer } from './FinancialDrawer';
import { MoneyValue } from '../../../components/MoneyValue';

interface TpsTvqDrawerProps {
  open: boolean;
  onClose: () => void;
  isSmallSupplier: boolean;
  gstQstCollectedCents: number;
  gstQstRemittedCents: number;
}

export function TpsTvqDrawer({
  open,
  onClose,
  isSmallSupplier,
  gstQstCollectedCents,
  gstQstRemittedCents,
}: TpsTvqDrawerProps) {
  return (
    <FinancialDrawer title="TPS/TVQ" open={open} onClose={onClose}>
      <Stack spacing={2}>
        {isSmallSupplier ? (
          <Typography>TPS/TVQ non applicable — statut de petit fournisseur.</Typography>
        ) : (
          <Stack spacing={2}>
            <Typography>TPS/TVQ collectée : <MoneyValue cents={gstQstCollectedCents} /></Typography>
            <Typography>TPS/TVQ remise : <MoneyValue cents={gstQstRemittedCents} /></Typography>
            <Typography>Solde estimé : <MoneyValue cents={gstQstCollectedCents - gstQstRemittedCents} /></Typography>
          </Stack>
        )}

        <Button variant="outlined" onClick={onClose} sx={{ mt: 2 }}>
          Fermer
        </Button>
      </Stack>
    </FinancialDrawer>
  );
}
