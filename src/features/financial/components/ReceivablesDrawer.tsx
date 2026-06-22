import { Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { FinancialDrawer } from './FinancialDrawer';
import { MoneyValue } from '../../../components/MoneyValue';
import type { Invoice, InvoiceStatus, Pharmacie } from '../../../storage/schema';
import { pharmacieDisplayName } from '../../../storage/selectors';

interface ReceivablesDrawerProps {
  open: boolean;
  onClose: () => void;
  invoices: Invoice[];
  pharmacies: Pharmacie[];
  onStatusChange?: (invoiceId: string, status: InvoiceStatus) => void;
}

export function ReceivablesDrawer({ open, onClose, invoices, pharmacies, onStatusChange }: ReceivablesDrawerProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FinancialDrawer title="Factures à encaisser" open={open} onClose={onClose} data-testid="financial-receivables-drawer">
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
                <TableCell component="th" scope="col" align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => {
                const pharmacie = pharmacies.find((item) => item.id === invoice.pharmacieId);
                const overdue = invoice.status === 'SENT' && invoice.dateEcheance < today;
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.dateFacture}</TableCell>
                    <TableCell>{invoice.numero}</TableCell>
                    <TableCell>{pharmacieDisplayName(pharmacie)}</TableCell>
                    <TableCell align="right">
                      <MoneyValue cents={invoice.amountCents} />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2">{invoice.dateEcheance}</Typography>
                        {overdue ? <Typography variant="caption" color="error">En retard</Typography> : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{invoice.status === 'GENERATED' ? 'Générée' : 'Envoyée'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        {invoice.status === 'GENERATED' ? (
                          <Button size="small" variant="outlined" onClick={() => onStatusChange?.(invoice.id, 'SENT')}>
                            Envoyer
                          </Button>
                        ) : null}
                        <Button size="small" variant="contained" onClick={() => onStatusChange?.(invoice.id, 'PAID')}>
                          Payée
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
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
