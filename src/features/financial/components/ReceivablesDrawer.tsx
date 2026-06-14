import { Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { FinancialDrawer } from './FinancialDrawer';
import { MoneyValue } from '../../../components/MoneyValue';
import type { Invoice } from '../../../storage/schema';

interface ReceivablesDrawerProps {
  open: boolean;
  onClose: () => void;
  invoices: Invoice[];
}

export function ReceivablesDrawer({ open, onClose, invoices }: ReceivablesDrawerProps) {
  return (
    <FinancialDrawer title="Factures à encaisser" open={open} onClose={onClose}>
      <Stack spacing={2} sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {invoices.length === 0 ? (
          <Typography>Aucune facture en attente de paiement.</Typography>
        ) : (
          <Table size="small" aria-label="Factures à encaisser">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">Date</TableCell>
                <TableCell component="th" scope="col">Numéro</TableCell>
                <TableCell component="th" scope="col">Pharmacie</TableCell>
                <TableCell component="th" scope="col" align="right">Montant</TableCell>
                <TableCell component="th" scope="col">Échéance</TableCell>
                <TableCell component="th" scope="col">Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                   <TableCell>{invoice.dateFacture}</TableCell>
                   <TableCell>{invoice.numero}</TableCell>
                   <TableCell>{invoice.pharmacieId}</TableCell>
                   <TableCell align="right">
                     <MoneyValue cents={invoice.amountCents} />
                   </TableCell>
                   <TableCell>{invoice.dateEcheance}</TableCell>
                   <TableCell>{invoice.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Button variant="outlined" onClick={onClose} sx={{ mt: 2 }}>
          Fermer
        </Button>
      </Stack>
    </FinancialDrawer>
  );
}
