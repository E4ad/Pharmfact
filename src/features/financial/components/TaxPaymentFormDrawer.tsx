import { useState, FormEvent } from 'react';
import { Button, Stack, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { FinancialDrawer } from './FinancialDrawer';
import { createId, todayIso } from '../../../services/ids';
import { eurosToCents } from '../../../services/money';
import { updateAppState } from '../../../storage/localStore';
import type { TaxPayment } from '../../../storage/schema';

interface TaxPaymentFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  periodLabel: string;
}

export function TaxPaymentFormDrawer({ open, onClose, onAdded, periodLabel }: TaxPaymentFormDrawerProps) {
  const [form, setForm] = useState({
    date: todayIso(),
    authority: 'REVENU_QUEBEC' as const,
    type: 'INCOME_TAX_INSTALMENT' as const,
    amount: '',
    reference: '',
    notes: '',
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const amountCents = eurosToCents(form.amount);
    if (amountCents <= 0) return;

    const payment: TaxPayment = {
      id: createId('tax'),
      date: form.date,
      authority: form.authority,
      type: form.type,
      period: periodLabel,
      amountCents,
      reference: form.reference?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };

    updateAppState((state) => ({
      ...state,
      taxPayments: [...state.taxPayments, payment],
    }));

    setForm((current) => ({ ...current, amount: '', reference: '', notes: '' }));
    onAdded();
    onClose();
  }

  return (
    <FinancialDrawer title="Ajouter un acompte" open={open} onClose={onClose} data-testid="financial-tax-payment-drawer">
      <form onSubmit={submit}>
        <Stack spacing={3}>
          <TextField
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}

            required
          />

          <FormControl>
            <InputLabel>Autorité</InputLabel>
            <Select
              label="Autorité"
              value={form.authority}
               onChange={(e) => setForm({ ...form, authority: e.target.value })}
              required
            >
              <MenuItem value="CRA">ARC</MenuItem>
              <MenuItem value="REVENU_QUEBEC">Revenu Québec</MenuItem>
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={form.type}
               onChange={(e) => setForm({ ...form, type: e.target.value })}
              required
            >
              <MenuItem value="INCOME_TAX_INSTALMENT">Acompte impôt</MenuItem>
              <MenuItem value="GST_QST_REMITTANCE">Remise TPS/TVQ</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Montant"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />

          <TextField
            label="Référence"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />

          <TextField
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            multiline
            rows={3}
          />

           <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="outlined" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="contained">
              Ajouter
            </Button>
          </Stack>
        </Stack>
      </form>
    </FinancialDrawer>
  );
}
