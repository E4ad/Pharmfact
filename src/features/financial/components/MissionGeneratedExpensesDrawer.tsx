import { Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { FinancialModal } from './FinancialDrawer';
import { MoneyValue } from '../../../components/MoneyValue';
import type { MissionDeductibleExpenseRow } from '../../../services/financialMetrics';

interface MissionGeneratedExpensesDrawerProps {
  open: boolean;
  onClose: () => void;
  rows: MissionDeductibleExpenseRow[];
}

export function MissionGeneratedExpensesDrawer({ open, onClose, rows }: MissionGeneratedExpensesDrawerProps) {
  return (
    <FinancialModal title="Dépenses issues des missions" open={open} onClose={onClose} data-testid="financial-mission-expenses-drawer">
      <Stack spacing={2} sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {rows.length === 0 ? (
          <Typography>Aucun frais de mission déductible à afficher.</Typography>
        ) : (
          <Table size="small" aria-label="Dépenses issues des missions">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">Date</TableCell>
                <TableCell component="th" scope="col">Mission</TableCell>
                <TableCell component="th" scope="col">Type</TableCell>
                <TableCell component="th" scope="col" align="right">Montant facturé</TableCell>
                <TableCell component="th" scope="col" align="right">Montant déductible estimé</TableCell>
                <TableCell component="th" scope="col">Justificatif</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.missionCode}</TableCell>
                  <TableCell>{row.typeLabel}</TableCell>
                  <TableCell align="right">
                    <MoneyValue cents={row.amountCents} />
                  </TableCell>
                  <TableCell align="right">
                    <MoneyValue cents={row.deductibleAmountCents ?? 0} />
                  </TableCell>
                  <TableCell>
                    {row.hasReceipt ? '✓ reçu' : row.receiptRecommended || row.receiptRequired ? '⚠ manquant' : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Button variant="outlined" onClick={onClose} sx={{ mt: 2 }}>
          Fermer
        </Button>
      </Stack>
    </FinancialModal>
  );
}
