import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { borderRadiusScale, typographyScale } from '../../design-system/tokens';
import { StatusChip } from '../../components/StatusChip';
import { InvoiceDraftModal } from './InvoiceDraftModal';
import type { ExpenseReceipt, Invoice, InvoicePayment, Mission, MissionExpense, MissionStatus, PaymentMethod, Pharmacie } from '../../storage/schema';
import { calculateBalanceDue } from '../../services/invoiceWorkflow';
import { createId, todayIso } from '../../services/ids';
import { createMissionExpenseDraft, expenseTypeConfig, missionQuickExpenseTypes, type ExpenseTypeConfig } from '../../services/expenseTypes';
import { formatMoney } from '../../services/money';
import { findPharmacien, pharmacieDisplayName } from '../../storage/selectors';
import { useAppState } from '../../storage/localStore';
import { formatDate, formatShortDate, formatEventDate, hoursLabel, formatMissionDatesSummary } from './missionFormatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ActionStage =
  | 'completed'
  | 'invoice_draft'
  | 'invoice_ready'
  | 'invoice_sent'
  | 'paid'
  | 'none';

function getActionStage(mission: Mission, invoice?: Invoice): ActionStage {
  if (mission.status === 'ARCHIVED' || mission.status === 'CANCELLED') return 'none';
  if (!invoice || invoice.status === 'VOIDED' || invoice.status === 'replaced') {
    return mission.status === 'COMPLETED' ? 'completed' : 'none';
  }
  if (invoice.paymentStatus === 'paid') return 'paid';
  const s = invoice.status.toLowerCase();
  if (s === 'sent') return 'invoice_sent';
  if (s === 'ready_to_send' || s === 'generated') return 'invoice_ready';
  if (s === 'draft') return 'invoice_draft';
  return 'none';
}

const PAYMENT_METHOD_LABELS: Partial<Record<PaymentMethod, string>> = {
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MissionDetailPanelProps {
  mission: Mission;
  pharmacy?: Pharmacie;
  invoice?: Invoice;
  onClose: () => void;
  onEditMission: (missionId: string) => void;
  onDownloadPdf: (invoiceId: string) => void;
  onDownloadIcs: (mission: Mission) => void;
  onChangeMissionStatus: (missionId: string, status: MissionStatus) => void;
  onGenerateInvoice: (mission: Mission) => void;
  onSavePayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id' | 'createdAt'>) => void;
  onGeneratePdf: (invoiceId: string) => Promise<void>;
  onMarkInvoiceSent: (invoiceId: string) => void;
  onDeletePayment: (invoiceId: string, paymentId: string) => void;
  onSaveExpense: (dayId: string, expense: MissionExpense) => void;
  onDeleteExpense: (dayId: string, expenseId: string) => void;
  receipts: ExpenseReceipt[];
  onAddReceipt: (dayId: string, expenseId: string, file: File) => void;
  onDeleteReceipt: (receiptId: string) => void;
}

const iconBtnSx = {
  width: 32,
  height: 32,
  borderRadius: borderRadiusScale.full,
  bgcolor: 'action.hover',
  color: 'text.secondary',
  '&:hover': { bgcolor: 'action.selected' },
};

const sectionLabelSx = {
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
  display: 'block',
  mb: 1.5,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <Typography variant="overline" sx={sectionLabelSx}>
      {label}
    </Typography>
  );
}

// ─── Expense type menu ────────────────────────────────────────────────────────

const ALL_EXPENSE_MENU_TYPES: ExpenseTypeConfig[] = [
  expenseTypeConfig('MEAL'),
  expenseTypeConfig('MILEAGE'),
  ...missionQuickExpenseTypes(),
];

function ExpenseTypeMenu({
  anchorEl,
  onSelect,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  onSelect: (typeKey: string) => void;
  onClose: () => void;
}) {
  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      {ALL_EXPENSE_MENU_TYPES.map((t) => (
        <MenuItem key={t.key} onClick={() => { onSelect(t.key); }}>
          {t.label}
        </MenuItem>
      ))}
    </Menu>
  );
}

// ─── Expense dialog ───────────────────────────────────────────────────────────

function MissionExpenseDialog({
  open,
  expense,
  dayId: initialDayId,
  isNew,
  receipts,
  mission,
  onSave,
  onDelete,
  onClose,
  onAddReceipt,
  onDeleteReceipt,
}: {
  open: boolean;
  expense: MissionExpense;
  dayId: string;
  isNew: boolean;
  receipts: ExpenseReceipt[];
  mission: Mission;
  onSave: (dayId: string, expense: MissionExpense) => void;
  onDelete?: () => void;
  onClose: () => void;
  onAddReceipt: (dayId: string, expenseId: string, file: File) => void;
  onDeleteReceipt: (receiptId: string) => void;
}) {
  const isMileage = expense.typeKey === 'MILEAGE';
  const mileageRateCents = mission.mileageRateCents;
  const config = expenseTypeConfig(expense.typeKey);

  const [dayId, setDayId] = useState(initialDayId);
  const [amountStr, setAmountStr] = useState(() =>
    isMileage ? '' : expense.amountCents > 0 ? (expense.amountCents / 100).toFixed(2) : '',
  );
  const [distanceStr, setDistanceStr] = useState(() =>
    isMileage ? String(expense.distanceKm ?? '') : '',
  );
  const [unitRateStr, setUnitRateStr] = useState(() =>
    String((expense.unitRateCents ?? mileageRateCents) / 100),
  );
  const [note, setNote] = useState(expense.notes ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const distanceKm = parseFloat(distanceStr.replace(',', '.'));
  const unitRate = parseFloat(unitRateStr.replace(',', '.'));
  const mileageAmountCents =
    !isMileage || isNaN(distanceKm) || isNaN(unitRate) ? 0 : Math.round(distanceKm * unitRate * 100);
  const amountCents = isMileage
    ? mileageAmountCents
    : amountStr === ''
      ? 0
      : Math.round(parseFloat(amountStr.replace(',', '.')) * 100);

  const valid =
    dayId !== '' &&
    amountCents > 0 &&
    (isMileage
      ? !isNaN(distanceKm) && distanceKm > 0 && !isNaN(unitRate) && unitRate > 0
      : !isNaN(amountCents));

  const sortedDays = mission.days
    .slice()
    .sort((a, b) => `${a.dateService}${a.startTime}`.localeCompare(`${b.dateService}${b.startTime}`));

  const expenseReceipts = receipts.filter((r) => r.expenseId === expense.id);

  function handleSave() {
    if (!valid) return;
    const saved = createMissionExpenseDraft({
      id: expense.id,
      typeKey: expense.typeKey,
      amountCents,
      distanceKm: isMileage ? distanceKm : undefined,
      unitRateCents: isMileage ? Math.round(unitRate * 100) : undefined,
      missionId: mission.id,
      missionDayId: dayId,
      overrides: { notes: note.trim() || undefined, receiptIds: expense.receiptIds },
    });
    onSave(dayId, saved);
  }

  function handleTrajetAR() {
    const totalKm = mission.mileageKm > 0 ? mission.mileageKm * 2 : 0;
    setDistanceStr(totalKm > 0 ? String(totalKm) : '');
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && valid) {
          e.preventDefault();
          handleSave();
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>
        {isNew ? 'Ajouter un frais' : 'Modifier le frais'}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.25 }}>
          {config.label}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {sortedDays.length > 1 ? (
            <FormControl size="small" fullWidth>
              <InputLabel id="dialog-expense-day-label">Jour</InputLabel>
              <Select
                labelId="dialog-expense-day-label"
                label="Jour"
                value={dayId}
                onChange={(e) => setDayId(e.target.value)}
              >
                {sortedDays.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {formatShortDate(d.dateService)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {isMileage ? (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Distance (km)"
                  value={distanceStr}
                  onChange={(e) => setDistanceStr(e.target.value)}
                  size="small"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
                  sx={{ flex: 1 }}
                  autoFocus
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleTrajetAR}
                  disabled={mission.mileageKm <= 0}
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'center' }}
                >
                  Domicile ↔ Pharmacie AR
                </Button>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Taux ($/km)"
                  value={unitRateStr}
                  onChange={(e) => setUnitRateStr(e.target.value)}
                  size="small"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Montant calculé"
                  value={amountCents > 0 ? (amountCents / 100).toFixed(2) : '0.00'}
                  size="small"
                  slotProps={{ input: { readOnly: true } }}
                  sx={{ flex: 1 }}
                />
              </Stack>
            </>
          ) : (
            <TextField
              label="Montant ($)"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              autoFocus
              fullWidth
            />
          )}

          <TextField
            label="Note (optionnel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            size="small"
            fullWidth
          />

          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.75 }}
            >
              Reçus
            </Typography>
            {expenseReceipts.length > 0 ? (
              <Stack spacing={0.5} sx={{ mb: 1 }}>
                {expenseReceipts.map((r) => (
                  <Box
                    key={r.id}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {r.fileName}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label={`Supprimer le reçu ${r.fileName}`}
                      onClick={() => onDeleteReceipt(r.id)}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, flexShrink: 0 }}
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: typographyScale.base }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onAddReceipt(dayId, expense.id, file);
                e.target.value = '';
              }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              sx={{ borderRadius: 10, fontWeight: 700 }}
            >
              + Ajouter un reçu
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
        <Box>
          {!isNew && onDelete ? (
            <Button color="error" size="small" onClick={onDelete} sx={{ fontWeight: 700 }}>
              Supprimer
            </Button>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} size="small">Annuler</Button>
          <Button variant="contained" size="small" onClick={handleSave} disabled={!valid}>
            {isNew ? 'Ajouter' : 'Enregistrer'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

// ─── Payment form ─────────────────────────────────────────────────────────────

function PaymentForm({
  balanceDue,
  prefillFull = true,
  onSubmit,
  onCancel,
}: {
  balanceDue: number;
  prefillFull?: boolean;
  onSubmit: (payment: Omit<InvoicePayment, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [amountStr, setAmountStr] = useState(() => (prefillFull ? (balanceDue / 100).toFixed(2) : ''));
  const [date, setDate] = useState(todayIso);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');

  const amountCents = amountStr === '' ? 0 : Math.round(parseFloat(amountStr.replace(',', '.')) * 100);
  const valid = !isNaN(amountCents) && amountCents > 0 && amountCents <= balanceDue;

  function handleSubmit() {
    if (!valid) return;
    onSubmit({ amount: amountCents, receivedAt: date, method, note: note.trim() || undefined });
  }

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'primary.light', borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
        Enregistrer un paiement
      </Typography>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Montant ($)"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            sx={{ flex: 1 }}
            error={amountStr !== '' && (!valid || isNaN(amountCents))}
            helperText={
              amountStr !== '' && amountCents > balanceDue
                ? 'Le montant reçu ne peut pas dépasser le solde restant.'
                : undefined
            }
          />
          <TextField
            label="Date reçue"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            size="small"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1 }}
          />
        </Stack>
        <FormControl size="small">
          <InputLabel id="payment-method-label">Méthode</InputLabel>
          <Select<PaymentMethod>
            labelId="payment-method-label"
            label="Méthode"
            value={method}
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
          size="small"
          multiline
          rows={2}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} size="small">Annuler</Button>
          <Button variant="contained" size="small" onClick={handleSubmit} disabled={!valid}>
            Enregistrer
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MissionDetailPanel({
  mission,
  pharmacy,
  invoice,
  onClose,
  onEditMission,
  onDownloadPdf,
  onDownloadIcs,
  onChangeMissionStatus,
  onGenerateInvoice,
  onSavePayment,
  onGeneratePdf,
  onMarkInvoiceSent,
  onDeletePayment,
  onSaveExpense,
  onDeleteExpense,
  receipts,
  onAddReceipt,
  onDeleteReceipt,
}: MissionDetailPanelProps) {
  const state = useAppState();
  const [invoiceDraftModalOpen, setInvoiceDraftModalOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentPrefillFull, setPaymentPrefillFull] = useState(true);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [expenseDialogState, setExpenseDialogState] = useState<{ dayId: string; expense: MissionExpense; isNew: boolean } | null>(null);
  const [expenseMenuAnchor, setExpenseMenuAnchor] = useState<HTMLElement | null>(null);

  const actionStage = getActionStage(mission, invoice);
  const balanceDue = invoice ? calculateBalanceDue(invoice) : 0;
  const canDownloadPdf = Boolean(invoice);
  const canDownloadIcs = mission.status === 'CONFIRMED' || mission.status === 'COMPLETED';
  const canEditMission = mission.status !== 'CANCELLED' && mission.status !== 'ARCHIVED';
  const canCancel = mission.status !== 'CANCELLED' && mission.status !== 'ARCHIVED' && mission.status !== 'COMPLETED';
  const sortedDays = mission.days
    .slice()
    .sort((a, b) => `${a.dateService}${a.startTime}`.localeCompare(`${b.dateService}${b.startTime}`));
  const allExpenses = mission.days.flatMap((d) => d.expenses ?? []).filter((e) => e.amountCents > 0);
  const canOpenModal = Boolean(invoice) && (actionStage === 'invoice_draft' || actionStage === 'invoice_ready');
  const canShowPaymentSection = actionStage === 'invoice_sent' || actionStage === 'paid';
  const canAddPayment = actionStage === 'invoice_sent';
  const payments = invoice?.payments ?? [];
  const canEditExpenses = mission.status !== 'CANCELLED' && mission.status !== 'ARCHIVED';

  type PrimaryAction = { label: string; onClick: () => void; context: string; testId?: string };
  const primaryAction: PrimaryAction | null = (() => {
    switch (actionStage) {
      case 'completed':
        return {
          label: 'Créer la facture',
          onClick: () => onGenerateInvoice(mission),
          context: 'La mission est terminée, prête à facturer.',
          testId: 'cta-generate-invoice',
        };
      case 'invoice_draft':
        return invoice
          ? {
              label: 'Prévisualiser la facture',
              onClick: () => setInvoiceDraftModalOpen(true),
              context: `${invoice.numero} · ${formatMoney(invoice.amountCents)} — vérifier avant génération.`,
              testId: 'cta-preview-invoice',
            }
          : null;
      case 'invoice_ready':
        return invoice
          ? {
              label: 'Marquer comme envoyée',
              onClick: () => onMarkInvoiceSent(invoice.id),
              context: `${invoice.numero} · PDF prêt. Confirmez l'envoi.`,
              testId: 'cta-mark-sent',
            }
          : null;
      case 'invoice_sent':
        return invoice
          ? {
              label: 'Encaisser le solde',
              onClick: () => {
                setPaymentPrefillFull(true);
                setPaymentFormOpen(true);
              },
              context: `Solde à encaisser : ${formatMoney(balanceDue)}`,
              testId: 'cta-add-payment',
            }
          : null;
      case 'paid':
        return {
          label: 'Archiver la mission',
          onClick: () => onChangeMissionStatus(mission.id, 'ARCHIVED'),
          context: 'La mission est entièrement encaissée.',
          testId: 'cta-archive',
        };
      default:
        return null;
    }
  })();

  function handleSavePayment(payment: Omit<InvoicePayment, 'id' | 'createdAt'>) {
    if (!invoice) return;
    setPaymentFormOpen(false);
    onSavePayment(invoice.id, payment);
  }

  function handleExpenseSave(dayId: string, expense: MissionExpense) {
    setExpenseDialogState(null);
    onSaveExpense(dayId, expense);
  }

  function handleExpenseDelete(dayId: string, expenseId: string) {
    setExpenseDialogState(null);
    onDeleteExpense(dayId, expenseId);
  }

  function openNewExpenseDialog(typeKey: string) {
    const firstDayId = sortedDays[0]?.id ?? '';
    const expense = createMissionExpenseDraft({
      id: createId('exp'),
      typeKey,
      missionId: mission.id,
      missionDayId: firstDayId,
    });
    setExpenseDialogState({ dayId: firstDayId, expense, isNew: true });
  }

  const datesSummary = formatMissionDatesSummary(mission.days.map((d) => d.dateService));
  const totalHours = mission.days.reduce((sum, d) => sum + d.hours, 0);

  return (
    <>
      <Box
        data-testid="mission-detail-panel"
        sx={{ borderTop: '2px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── À faire maintenant ── */}
        <Box
          data-testid="action-bar"
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: primaryAction
              ? actionStage === 'paid' ? 'success.50' : 'primary.50'
              : 'action.hover',
          }}
        >
          {primaryAction ? (
            <Box sx={{ mb: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 900,
                  color: actionStage === 'paid' ? 'success.dark' : 'primary.dark',
                  letterSpacing: '0.06em',
                  display: 'block',
                  lineHeight: 1.4,
                }}
              >
                À faire maintenant
              </Typography>
              <Typography variant="body2" color="text.secondary">{primaryAction.context}</Typography>
            </Box>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            {primaryAction ? (
              <Button
                variant="contained"
                size="small"
                onClick={primaryAction.onClick}
                disabled={actionStage === 'invoice_sent' && paymentFormOpen}
                sx={{ borderRadius: 10, fontWeight: 700 }}
                data-testid={primaryAction.testId}
              >
                {actionStage === 'invoice_sent' && paymentFormOpen ? 'Formulaire ouvert ↓' : primaryAction.label}
              </Button>
            ) : null}
            {canOpenModal && actionStage === 'invoice_ready' ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setInvoiceDraftModalOpen(true)}
                sx={{ borderRadius: 10, fontWeight: 700 }}
              >
                Voir la facture
              </Button>
            ) : null}
            {canEditMission ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => onEditMission(mission.id)}
                sx={{ borderRadius: 10, fontWeight: 700 }}
              >
                Modifier la mission
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setConfirmCancelOpen(true)}
                sx={{ borderRadius: 10, fontWeight: 700 }}
              >
                Annuler la mission
              </Button>
            ) : null}
            {canDownloadPdf && invoice ? (
              <IconButton aria-label="Télécharger le PDF" size="small" onClick={() => onDownloadPdf(invoice.id)} sx={iconBtnSx}>
                <PictureAsPdfRoundedIcon sx={{ fontSize: typographyScale.base }} />
              </IconButton>
            ) : null}
            {canDownloadIcs ? (
              <IconButton aria-label="Télécharger le calendrier ICS" size="small" onClick={() => onDownloadIcs(mission)} sx={iconBtnSx}>
                <CalendarMonthRoundedIcon sx={{ fontSize: typographyScale.base }} />
              </IconButton>
            ) : null}
            <Box sx={{ ml: 'auto', flexShrink: 0 }}>
              <IconButton aria-label="Fermer le panneau" size="small" onClick={onClose} sx={iconBtnSx}>
                <ExpandLessRoundedIcon sx={{ fontSize: typographyScale.base }} />
              </IconButton>
            </Box>
          </Stack>
        </Box>

        {/* ── Compact summary line ── */}
        <Box sx={{ px: 2.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">{datesSummary}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{hoursLabel(totalHours)}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>{formatMoney(mission.totalCents)}</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', px: 2.5, pb: 2.5 }}>

          {/* ── Détail mission ── */}
          <Box sx={{ pt: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
            <SectionDivider label="Détail mission" />

            {/* Jours travaillés */}
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              {sortedDays.map((day) => (
                <Box
                  key={day.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '140px 1fr auto' },
                    gap: 1.5,
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 8,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 750 }}>{formatShortDate(day.dateService)}</Typography>
                  <Typography variant="body2">
                    {day.startTime}–{day.endTime}
                    {day.unpaidBreakMinutes > 0 ? ` · pause ${day.unpaidBreakMinutes} min` : ''}
                    {day.description ? ` · ${day.description}` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, textAlign: { xs: 'left', sm: 'right' } }}>
                    {hoursLabel(day.hours)}
                  </Typography>
                </Box>
              ))}
            </Stack>

            {/* Frais section label + list */}
            {allExpenses.length > 0 ? (
              <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  Frais
                </Typography>
                {mission.days.flatMap((day) =>
                  (day.expenses ?? [])
                    .filter((e) => e.amountCents > 0)
                    .map((expense) => {
                      const config = expenseTypeConfig(expense.typeKey);
                      const detail =
                        expense.typeKey === 'MILEAGE' && expense.distanceKm
                          ? `${config.label} · ${expense.distanceKm.toLocaleString('fr-CA')} km`
                          : config.label;
                      const isEditing = expenseDialogState?.expense.id === expense.id;
                      return (
                        <Box
                          key={expense.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 8,
                            bgcolor: isEditing ? 'primary.50' : 'action.hover',
                            gap: 1,
                          }}
                        >
                          <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 650 }}>{detail}</Typography>
                            {expense.notes ? (
                              <Typography variant="caption" color="text.secondary">{expense.notes}</Typography>
                            ) : null}
                          </Stack>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
                          >
                            {formatMoney(expense.amountCents)}
                          </Typography>
                          {(expense.receiptIds ?? []).length > 0 ? (
                            <Chip
                              label={`📎 ${(expense.receiptIds ?? []).length}`}
                              size="small"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, borderRadius: '4px', flexShrink: 0 }}
                            />
                          ) : null}
                          {canEditExpenses ? (
                            <IconButton
                              aria-label={`Modifier le frais ${detail}`}
                              size="small"
                              onClick={() => setExpenseDialogState({ dayId: day.id, expense, isNew: false })}
                              sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main' }, flexShrink: 0 }}
                            >
                              <EditRoundedIcon sx={{ fontSize: typographyScale.base }} />
                            </IconButton>
                          ) : null}
                        </Box>
                      );
                    }),
                )}
              </Stack>
            ) : null}

            {canEditExpenses ? (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => setExpenseMenuAnchor(e.currentTarget)}
                sx={{ alignSelf: 'flex-start', borderRadius: 10, fontWeight: 700 }}
              >
                + Ajouter un frais
              </Button>
            ) : null}
          </Box>

          {/* ── Paiement ── */}
          {canShowPaymentSection && invoice ? (
            <Box sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
              <SectionDivider label="Paiement" />
              <Stack spacing={1}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    rowGap: 0.5,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">Total facturation</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(invoice.amountCents)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Encaissé</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(invoice.paidAmountCents ?? 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 750 }}>Solde</Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 900,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: balanceDue > 0 ? 'warning.main' : 'success.main',
                    }}
                  >
                    {formatMoney(balanceDue)}
                  </Typography>
                  {invoice.dateEcheance ? (
                    <>
                      <Typography variant="body2" color="text.secondary">Échéance</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', color: 'text.secondary' }}>
                        {formatDate(invoice.dateEcheance)}
                      </Typography>
                    </>
                  ) : null}
                </Box>

                {payments.length > 0 ? (
                  <Stack spacing={0.5}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                    >
                      Historique des paiements
                    </Typography>
                    {payments.map((payment) => (
                      <Box
                        key={payment.id}
                        sx={{ display: 'flex', alignItems: 'center', p: 1, borderRadius: 8, bgcolor: 'action.hover', gap: 1 }}
                      >
                        <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(payment.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.receivedAt} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                            {payment.note ? ` · ${payment.note}` : ''}
                          </Typography>
                        </Stack>
                        <IconButton
                          aria-label={`Supprimer le paiement de ${formatMoney(payment.amount)}`}
                          size="small"
                          onClick={() => setDeletePaymentId(payment.id)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, flexShrink: 0 }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: typographyScale.base }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                ) : null}

                {canAddPayment ? (
                  <>
                    <Collapse in={paymentFormOpen} unmountOnExit>
                      <PaymentForm
                        balanceDue={balanceDue}
                        prefillFull={paymentPrefillFull}
                        onSubmit={handleSavePayment}
                        onCancel={() => setPaymentFormOpen(false)}
                      />
                    </Collapse>
                    {!paymentFormOpen ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setPaymentPrefillFull(false);
                          setPaymentFormOpen(true);
                        }}
                        sx={{ alignSelf: 'flex-start', borderRadius: 10, fontWeight: 700 }}
                      >
                        + Paiement partiel
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </Stack>
            </Box>
          ) : null}

          {/* ── Historique ── */}
          {mission.events.length > 0 ? (
            <Box>
              <Button
                fullWidth
                variant="text"
                onClick={() => setHistoryOpen((prev) => !prev)}
                sx={{ justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 750, p: 0, minHeight: 'auto', color: 'text.secondary' }}
                endIcon={historyOpen ? '▴' : '▾'}
                aria-expanded={historyOpen}
              >
                Historique
              </Button>
              {historyOpen ? (
                <Box sx={{ mt: 1.5 }}>
                  {mission.events.slice().reverse().map((event) => (
                    <Typography key={event.id} variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {formatEventDate(event.eventDate)} · {event.label}
                    </Typography>
                  ))}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      </Box>

      {/* ── Expense dialog + type menu ── */}
      {(() => {
        const ds = expenseDialogState;
        if (!ds) return null;
        return (
          <MissionExpenseDialog
            key={ds.expense.id}
            open
            expense={ds.expense}
            dayId={ds.dayId}
            isNew={ds.isNew}
            receipts={receipts}
            mission={mission}
            onSave={handleExpenseSave}
            onDelete={ds.isNew ? undefined : () => handleExpenseDelete(ds.dayId, ds.expense.id)}
            onClose={() => setExpenseDialogState(null)}
            onAddReceipt={onAddReceipt}
            onDeleteReceipt={onDeleteReceipt}
          />
        );
      })()}
      <ExpenseTypeMenu
        anchorEl={expenseMenuAnchor}
        onSelect={(typeKey) => {
          setExpenseMenuAnchor(null);
          openNewExpenseDialog(typeKey);
        }}
        onClose={() => setExpenseMenuAnchor(null)}
      />

      {/* ── Invoice draft modal ── */}
      {invoice && canOpenModal ? (
        <InvoiceDraftModal
          open={invoiceDraftModalOpen}
          onClose={() => setInvoiceDraftModalOpen(false)}
          mission={mission}
          pharmacy={pharmacy}
          pharmacien={findPharmacien(state, mission.pharmacienId)}
          invoice={invoice}
          state={state}
          onEditMission={onEditMission}
          onGeneratePdf={onGeneratePdf}
          onMarkSent={onMarkInvoiceSent}
          onDownloadPdfDirect={onDownloadPdf}
        />
      ) : null}

      {/* ── Confirm cancel dialog ── */}
      <Dialog open={confirmCancelOpen} onClose={() => setConfirmCancelOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Annuler la mission ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Cette action est difficile à inverser. La mission passera en statut Annulée.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmCancelOpen(false)} sx={{ fontWeight: 700 }}>Retour</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onChangeMissionStatus(mission.id, 'CANCELLED');
              setConfirmCancelOpen(false);
              onClose();
            }}
            sx={{ fontWeight: 700 }}
          >
            Confirmer l'annulation
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete payment confirm dialog ── */}
      <Dialog open={Boolean(deletePaymentId)} onClose={() => setDeletePaymentId(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Supprimer ce paiement ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Cette action est irréversible. Le solde sera recalculé.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeletePaymentId(null)} sx={{ fontWeight: 700 }}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deletePaymentId && invoice) {
                onDeletePayment(invoice.id, deletePaymentId);
              }
              setDeletePaymentId(null);
            }}
            sx={{ fontWeight: 700 }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

    </>
  );
}
