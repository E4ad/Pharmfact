import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { MoneyValue } from '../../../components/MoneyValue';
import { MonthStatusBadge } from './MonthStatusBadge';
import type { AnnualExpenseRow } from '../../../services/financialMetrics';

/**
 * Props pour le composant AnnualExpensesTable
 */
export interface AnnualExpensesTableProps {
  rows: AnnualExpenseRow[];
  onViewDetail?: () => void;
  showActions?: boolean;
}

/**
 * Tableau des dépenses annuelles avec statut temporel
 * Affiche les dépenses mois par mois avec les montants manuels et missions
 * 
 * @example
 * ```tsx
 * const rows = buildAnnualExpenseRows({ annual, missionExpenseRows, today });
 * <AnnualExpensesTable rows={rows} onViewDetail={() => setDrawerOpen(true)} />
 * ```
 */
export function AnnualExpensesTable({
  rows,
  onViewDetail,
  showActions = true,
}: AnnualExpensesTableProps) {
  // Vérifier que nous avons exactement 12 mois
  if (rows.length !== 12) {
    console.warn(`AnnualExpensesTable: attendu 12 mois, reçu ${rows.length}`);
  }

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Mois</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="right">Dépenses manuelles</TableCell>
            <TableCell align="right">Dépenses missions</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Justificatifs manquants</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.month} hover>
              <TableCell>{row.monthLabel}</TableCell>
              <TableCell>
                <MonthStatusBadge status={row.status} />
              </TableCell>
              <TableCell align="right">
                {row.manualDeductibleExpensesCents > 0 ? (
                  <MoneyValue cents={row.manualDeductibleExpensesCents} />
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell align="right">
                {row.missionGeneratedDeductibleExpensesCents > 0 ? (
                  <MoneyValue cents={row.missionGeneratedDeductibleExpensesCents} />
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell align="right">
                {row.totalDeductibleExpensesCents > 0 ? (
                  <MoneyValue cents={row.totalDeductibleExpensesCents} />
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell align="right">
                {row.missingRequiredReceiptsCount > 0 ? (
                  row.missingRequiredReceiptsCount
                ) : (
                  '—'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {showActions && onViewDetail && (
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onViewDetail}
            data-testid="annual-expenses-view-detail"
          >
            Voir détail annuel
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default AnnualExpensesTable;
