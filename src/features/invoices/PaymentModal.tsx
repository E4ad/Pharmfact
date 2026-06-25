import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Invoice, InvoicePayment, PaymentMethod } from '../../storage/schema';
import { formatMoney } from '../../services/money';

type PaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payment: Omit<InvoicePayment, 'id' | 'createdAt'>) => void;
  invoice: Invoice;
  existingPayment?: InvoicePayment;
  maxAmount?: number;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  transfer: 'Virement',
  cheque: 'Chèque',
  direct_deposit: 'Dépôt direct',
  interac: 'Interac',
  cash: 'Comptant',
  other: 'Autre',
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
  INTERAC: 'Interac',
  COMPTANT: 'Comptant',
  AUTRE: 'Autre',
};

export function PaymentModal({ open, onClose, onSave, invoice, existingPayment, maxAmount }: PaymentModalProps) {
  const balanceDue = invoice.balanceDue ?? 0;
  const [amount, setAmount] = useState(existingPayment?.amount?.toString() ?? balanceDue.toString());
  const [receivedAt, setReceivedAt] = useState(
    existingPayment?.receivedAt ?? new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState<PaymentMethod>(
    (existingPayment?.method ?? 'transfer') as PaymentMethod,
  );
  const [note, setNote] = useState(existingPayment?.note ?? '');

  const amountNum = Number(amount) || 0;
  const availableBalance = maxAmount !== undefined ? maxAmount : balanceDue;
  const isAmountValid = amountNum > 0 && amountNum <= availableBalance;

  function handleSave() {
    if (!isAmountValid) return;
    
    onSave({
      amount: amountNum,
      receivedAt,
      method: method as PaymentMethod,
      note: note.trim() || undefined,
    });
    onClose();
  }

  function handleAmountChange(value: string) {
    const num = Number(value);
    if (value === '' || !Number.isNaN(num)) {
      setAmount(value);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {existingPayment ? "Modifier le paiement" : "Ajouter un paiement"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Solde disponible : {formatMoney(availableBalance)}
          </Typography>
          
          <TextField
            label="Montant reçu"
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            required
            error={amountNum > availableBalance}
            helperText={amountNum > availableBalance ? "Le montant reçu ne peut pas dépasser le solde restant." : undefined}
          />
          
          <TextField
            label="Date d'encaissement"
            type="date"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          
          <FormControl fullWidth>
            <InputLabel id="payment-method-label">Mode de paiement</InputLabel>
            <Select
              labelId="payment-method-label"
              value={method}
              label="Mode de paiement"
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <MenuItem value="transfer">Virement</MenuItem>
              <MenuItem value="cheque">Chèque</MenuItem>
              <MenuItem value="direct_deposit">Dépôt direct</MenuItem>
              <MenuItem value="interac">Interac</MenuItem>
              <MenuItem value="cash">Comptant</MenuItem>
              <MenuItem value="other">Autre</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Note (optionnel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            rows={2}
            placeholder="Référence du chèque, remarque..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isAmountValid}>
          {existingPayment ? "Modifier" : "Ajouter"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function PaymentHistoryModal({
  open,
  onClose,
  invoice,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onEdit: (payment: InvoicePayment) => void;
  onDelete: (payment: InvoicePayment) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Historique des paiements</DialogTitle>
      <DialogContent>
        {!invoice.payments?.length ? (
          <Typography color="text.secondary">Aucun paiement enregistré.</Typography>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {invoice.payments.map((payment) => (
              <Stack
                key={payment.id}
                direction="row"
                spacing={1.5}
                sx={(theme) => ({
                  p: 1.5,
                  borderRadius: theme.runtimeTokens.controlRadius,
                  bgcolor: theme.palette.action.hover,
                })}
              >
                <Stack sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 750 }}>
                    {formatMoney(payment.amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {paymentMethodLabels[payment.method]} • {payment.receivedAt}
                  </Typography>
                  {payment.note && (
                    <Typography variant="caption" color="text.secondary">
                      {payment.note}
                    </Typography>
                  )}
                </Stack>
                <Button size="small" onClick={() => onEdit(payment)}>
                  Modifier
                </Button>
                <Button size="small" color="error" onClick={() => onDelete(payment)}>
                  Supprimer
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}