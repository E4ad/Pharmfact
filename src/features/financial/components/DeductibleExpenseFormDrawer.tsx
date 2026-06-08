import { useState, FormEvent } from 'react';
import { Button, Stack, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { FinancialDrawer } from './FinancialDrawer';
import { createId, todayIso } from '../../../services/ids';
import { eurosToCents } from '../../../services/money';
import { updateAppState } from '../../../storage/localStore';
import type { DeductibleExpense } from '../../../storage/schema';

const expenseCategories = [
  { value: 'TRAVEL', label: 'Déplacement' },
  { value: 'MEAL', label: 'Repas' },
  { value: 'PARKING', label: 'Stationnement' },
  { value: 'SOFTWARE', label: 'Logiciel' },
  { value: 'PHONE_INTERNET', label: 'Téléphone / Internet' },
  { value: 'PROFESSIONAL_FEES', label: 'Honoraires professionnels' },
  { value: 'INSURANCE', label: 'Assurance' },
  { value: 'ACCOUNTING', label: 'Comptabilité' },
  { value: 'TRAINING', label: 'Formation' },
  { value: 'OFFICE', label: 'Bureau' },
  { value: 'OTHER', label: 'Autre' },
];

interface DeductibleExpenseFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (expense: Omit<DeductibleExpense, 'id'>) => void;
  defaultValues?: Partial<DeductibleExpense>;
}

export function DeductibleExpenseFormDrawer({ open, onClose, onSubmit, defaultValues }: DeductibleExpenseFormDrawerProps) {
  const [form, setForm] = useState<Omit<DeductibleExpense, 'id'> & { amount: string }>({
    date: todayIso(),
    label: '',
    category: 'TRAVEL',
    amountCents: 0,
    taxDeductible: true,
    hasReceipt: false,
    notes: '',
    amount: '0',
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const amountCents = eurosToCents(form.amount);
    if (!form.label.trim() || amountCents <= 0) return;

    const expense: DeductibleExpense = {
      id: createId('expense'),
      date: form.date,
      label: form.label,
      category: form.category,
      amountCents,
      taxDeductible: true,
      hasReceipt: form.hasReceipt,
    };

    updateAppState((state) => ({
      ...state,
      deductibleExpenses: [...state.deductibleExpenses, expense],
    }));

    setForm((current) => ({ ...current, label: '', amount: '' }));
    onSubmit(
      {
        date: form.date,
        label: form.label,
        category: form.category,
        amountCents: eurosToCents(Number(form.amount)),
        taxDeductible: true,
        hasReceipt: form.hasReceipt,
        notes: form.notes,
      }
    );
    onClose();
  }

  return (
    <FinancialDrawer title="Ajouter une dépense" open={open} onClose={onClose}>
      <form onSubmit={submit}>
        <Stack spacing={3}>
          <TextField
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}

            required
          />

          <TextField
            label="Libellé"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
          />

          <FormControl>
            <InputLabel>Catégorie</InputLabel>
            <Select
              label="Catégorie"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as DeductibleExpense['category'] })}
              required
            >
              {expenseCategories.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Montant"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />

          <FormControl>
            <InputLabel>Justificatif</InputLabel>
            <Select
              label="Justificatif"
               value={form.hasReceipt ? 'yes' : 'no'}
               onChange={(e) => setForm({ ...form, hasReceipt: e.target.value === 'yes' })}
              required
            >
              <MenuItem value="yes">Oui</MenuItem>
              <MenuItem value="no">Non</MenuItem>
            </Select>
          </FormControl>

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
