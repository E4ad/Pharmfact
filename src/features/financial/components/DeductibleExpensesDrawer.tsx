import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { OptionsDrawer } from '../../../components/OptionsDrawer';
import { MoneyValue } from '../../../components/MoneyValue';
import { formatDate } from '../../../services/dateUtils';
import type { DeductibleExpense } from '../../../storage/schema';

/**
 * Props pour le drawer de liste des dépenses déductibles
 */
export interface DeductibleExpensesDrawerProps {
  open: boolean;
  onClose: () => void;
  expenses: DeductibleExpense[];
  onAdd?: () => void;
}

/**
 * Mapping des catégories pour affichage
 */
const categoryLabels: Record<string, string> = {
  TRAVEL: 'Voyage',
  MEAL: 'Repas',
  PARKING: 'Stationnement',
  SOFTWARE: 'Logiciel',
  PHONE_INTERNET: 'Téléphone/Internet',
  PROFESSIONAL_FEES: 'Frais professionnels',
  INSURANCE: 'Assurance',
  ACCOUNTING: 'Comptabilité',
  TRAINING: 'Formation',
  OFFICE: 'Bureau',
  OTHER: 'Autre',
};

/**
 * Drawer pour afficher la liste des dépenses déductibles manuelles
 * Affiche un tableau avec toutes les dépenses et leurs détails
 */
export function DeductibleExpensesDrawer({
  open,
  onClose,
  expenses,
  onAdd,
}: DeductibleExpensesDrawerProps) {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const totalWithoutReceipt = expenses.filter(e => !e.hasReceipt).length;

  return (
    <OptionsDrawer
      open={open}
      onClose={onClose}
      title="Dépenses déductibles"
      actions={
        <>
          <Button variant="outlined" onClick={onClose} data-testid="deductible-expenses-drawer-close">
            Fermer
          </Button>
          {onAdd && (
            <Button variant="contained" onClick={onAdd} data-testid="deductible-expenses-drawer-add">
              Ajouter
            </Button>
          )}
        </>
      }
      data-testid="deductible-expenses-drawer"
    >
      <Stack spacing={3}>
        {/* Résumé */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Résumé
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Nombre de dépenses :</Typography>
              <Typography>{expenses.length}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Total :</Typography>
              <MoneyValue cents={totalAmount} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Sans justificatif :</Typography>
              <Typography color={totalWithoutReceipt > 0 ? 'warning.main' : 'inherit'}>
                {totalWithoutReceipt}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Tableau des dépenses */}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Libellé</TableCell>
              <TableCell>Catégorie</TableCell>
              <TableCell align="right">Montant</TableCell>
              <TableCell>Justificatif</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} hover>
                <TableCell>{formatDate(expense.date)}</TableCell>
                <TableCell>{expense.label}</TableCell>
                <TableCell>{categoryLabels[expense.category] || expense.category}</TableCell>
                <TableCell align="right">
                  <MoneyValue cents={expense.amountCents} />
                </TableCell>
                <TableCell>
                  {expense.hasReceipt ? '✓' : '—'}
                </TableCell>
                <TableCell>{expense.notes || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {expenses.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Aucune dépense déductible enregistrée.
          </Typography>
        )}
      </Stack>
    </OptionsDrawer>
  );
}

export default DeductibleExpensesDrawer;
