import { useEffect, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type SetStateAction, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { BackHomeButton } from '../../components/BackHomeButton';
import { PageHeader } from '../../components/PageHeader';
import { createId } from '../../services/ids';
import { createInvoiceFromMission, invoiceStatusLabels } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { 
  calculateDayHours,
  dayName,
  centsToMoney,
  moneyToCents,
  parseMoney,
  addressOf,
  type MissionFormValues,
  type MissionDayFormValue,
  type ExpenseType,
} from '../../services/missionCalculator';
import { useMissionForm } from '../../hooks/useMissionForm';
import { useMissionFinancialPreview } from '../../hooks/useMissionFinancialPreview';
import { expenseTypeConfig, missionQuickExpenseTypes } from '../../services/expenseTypes';
import { getAvailableEditActions, getInvoiceEditImpact, type MissionEditAction } from '../../services/missionEditRules';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { ExpenseReceipt, Invoice, Mission, MissionExpense, MissionStatus } from '../../storage/schema';
import { findInvoice, findPharmacien, findPharmacie, missionInvoice, pharmacieDisplayName } from '../../storage/selectors';
import './MissionFormPage.css';
import { getPlatform } from '../../services/platformService';
import { PharmacieFormModal } from '../pharmacies/PharmacieFormModal';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

type MissionExpenseFormValue = MissionExpense;
type WorkflowAction = 'save_draft' | 'confirm' | 'confirm_generate' | MissionEditAction;

const missionTypes = [{ value: 'REMPLACEMENT_OFFICINE', label: 'Remplacement officine' }, { value: 'GARDE', label: 'Garde' }, { value: 'CLINIQUE', label: 'Clinique' }];

function FormField({ label, type, value, onChange, sx }: { 
  label: string; 
  type: string; 
  value: string; 
  onChange: (value: string) => void;
  sx?: object;
}) {
  return (
    <TextField
      label={label}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      variant="outlined"
      size="small"
      fullWidth
      sx={{
        borderRadius: 2,
        ...sx
      }}
    />
  );
}

function FormSelectField({ label, value, options, onChange, sx }: { 
  label: string; 
  value: string; 
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  sx?: object;
}) {
  return (
    <FormControl fullWidth size="small" sx={{ ...sx }}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        label={label}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function ReadOnlyField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <Box sx={{ 
      gridColumn: wide ? 'span 2' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5
    }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 750 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}

/** Avertissement de modification de mission */
function MissionWarning({ invoice }: { invoice?: Invoice }) {
  const impact = getInvoiceEditImpact(invoice);
  const severity: 'error' | 'info' | 'success' | 'warning' =
    impact.level === 'danger' ? 'error' : 
    impact.level === 'warning' ? 'warning' : 
    'info';
  return (
    <Alert 
      severity={severity}
      sx={{ borderRadius: 2 }}
    >
      {impact.message}
    </Alert>
  );
}

function MissionSummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2, flexShrink: 0 }}>
        {label} :
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 850 : 650, overflowWrap: 'anywhere', lineHeight: 1.3 }}>
        {value}
      </Typography>
    </Box>
  );
}

export function MissionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const state = useAppState();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  
  const {
    values,
    setValues,
    pendingReceipts,
    existing,
    pharmacien,
    pharmacie,
    setField,
    regenerateDays,
    updateDay,
    addExpense,
    addTypedExpense,
    removeExpense,
    updateExpense,
    addReceipt,
    deleteReceipt,
    recalcDistance,
    changePharmacie,
    buildMissionFromForm,
  } = useMissionForm(mode, missionId);

  const invoice = existing ? findInvoice(state, existing.invoiceId) ?? missionInvoice(state, existing) : undefined;
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [pharmacieModalOpen, setPharmacieModalOpen] = useState(false);
  const preview = useMissionFinancialPreview(values);
  const returnPath = mode === 'edit' && existing ? `/missions?selected=${existing.id}` : '/missions';

  useEffect(() => {
    setValues((current) => regenerateDays(current));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(action: WorkflowAction) {
    const mission = buildMissionFromForm(values, existing);
    const status: MissionStatus = action === 'save_draft'
      ? 'DRAFT'
      : action === 'confirm' || action === 'confirm_generate'
        ? 'CONFIRMED'
        : mission.status;
    const finalMission = { ...mission, status };

    updateAppState((current) => {
      const currentInvoice = existing ? current.invoices.find((item) => item.id === existing.invoiceId || item.missionId === existing.id) : undefined;
      let invoices = current.invoices;
      let missionToStore = finalMission;

      if (mode === 'create' && action === 'confirm_generate') {
        const invoice = createInvoiceFromMission(finalMission, current);
        invoices = [...invoices, invoice];
        missionToStore = { ...finalMission, invoiceId: invoice.id };
      } else if (mode === 'edit' && currentInvoice && action === 'save_regenerate') {
        invoices = invoices.map((item) =>
          item.id === currentInvoice.id
            ? {
                ...item,
                hours: finalMission.totalHours,
                amountCents: finalMission.totalCents,
                pharmacieId: finalMission.pharmacieId,
                pharmacienId: finalMission.pharmacienId,
              }
            : item,
        );
        missionToStore = { ...finalMission, events: [...finalMission.events, { id: createId('evt'), eventType: 'INVOICE_UPDATED', label: `Facture ${currentInvoice.numero} rééditée`, eventDate: new Date().toISOString() }] };
      }

      const receiptsToStore = pendingReceipts.map((receipt) => ({
        ...receipt,
        missionId: missionToStore.id,
        storageUrl: receipt.storageUrl.replace('receipts/draft/', `receipts/${missionToStore.id}/`),
      }));

      return {
        ...current,
        missions: mode === 'edit'
          ? current.missions.map((item) => (item.id === existing?.id ? missionToStore : item))
          : [...current.missions, missionToStore],
        invoices,
        expenseReceipts: [
          ...current.expenseReceipts.filter((receipt) => !receiptsToStore.some((item) => item.id === receipt.id)),
          ...receiptsToStore,
        ],
      };
    });

    if (fromOnboarding) {
      navigate('/welcome');
    } else {
      navigate(`/missions?selected=${finalMission.id}`);
    }
  }

  if (mode === 'edit' && !existing) return <div className="mission-form-page"><BackHomeButton to={returnPath} label="Missions" data-testid="mission-form-back-button" /><p>Mission introuvable.</p></div>;

  return <main className="mission-form-page">
    <PageHeader
      eyebrow="Missions"
      title={mode === 'edit' ? 'Modifier mission' : 'Nouvelle mission'}
      description="Créez une mission de remplacement. La facture sera générée automatiquement à partir des horaires, frais et informations saisies."
      backTo={mode === 'edit' ? returnPath : '/activity'}
      backLabel={mode === 'edit' ? 'Missions' : 'Accueil'}
      data-testid="mission-form-back-button"
    />
    {mode === 'edit' ? <MissionWarning invoice={invoice} /> : null}
    <div className="mission-form-grid">
      <div className="mission-pharmacien-strip">
        <span>Mission pour <strong>{pharmacien?.nom ?? 'Pharmacien'}</strong></span>
        <button className="mission-link-button" type="button" onClick={() => navigate('/')}>Changer</button>
      </div>
      <MissionLocationCard
        values={values}
        pharmacies={state.pharmacies}
        pharmacyName={pharmacie ? pharmacieDisplayName(pharmacie) : undefined}
        address={addressOf(pharmacie)}
        onOpenPharmacyModal={() => setPharmacieModalOpen(true)}
        onChangePharmacie={changePharmacie}
        onRecalcDistance={recalcDistance}
        onDistanceChange={(nextValue) => setField('distanceReferenceKm', parseMoney(nextValue))}
      />
      <MissionCoreCard
        values={values}
        onSetActType={(value) => setField('actType', value)}
        onSetValues={setValues}
        regenerateDays={regenerateDays}
      />
      <MissionScheduleCard
        values={values}
        onSetValues={setValues}
        regenerateDays={regenerateDays}
        pharmacyName={pharmacie ? pharmacieDisplayName(pharmacie) : undefined}
        pharmacistName={pharmacien?.nom}
      />
      <MissionDaysSection values={values} receipts={[...state.expenseReceipts, ...pendingReceipts]} openDayId={openDayId} setOpenDayId={setOpenDayId} updateDay={updateDay} addExpense={addExpense} addTypedExpense={addTypedExpense} updateExpense={updateExpense} removeExpense={removeExpense} addReceipt={addReceipt} deleteReceipt={deleteReceipt} />
      <MissionNotesCard showNotes={showNotes} notes={values.notes} onShowNotes={() => setShowNotes(true)} onChangeNotes={(value) => setField('notes', value)} />
      <MissionFinancialPreview preview={preview} rate={values.tauxHoraire} />
      <MissionFormActions mode={mode} invoice={invoice} onSubmit={submit} onCancel={() => navigate(returnPath)} />
    </div>
    
    <PharmacieFormModal
      open={pharmacieModalOpen}
      onClose={() => setPharmacieModalOpen(false)}
      pharmacieId={undefined}
    />
  </main>;
}

function MissionLocationCard({
  values,
  pharmacies,
  pharmacyName,
  address,
  onOpenPharmacyModal,
  onChangePharmacie,
  onRecalcDistance,
  onDistanceChange,
}: {
  values: MissionFormValues;
  pharmacies: Array<{ id: string; nom: string; displayLabel?: string }>;
  pharmacyName?: string;
  address: string;
  onOpenPharmacyModal: () => void;
  onChangePharmacie: (pharmacieId: string) => void;
  onRecalcDistance: () => void;
  onDistanceChange: (value: string) => void;
}) {
  return (
    <section className="mission-form-card">
      <h2>1. Lieu de mission</h2>
      <div className="mission-form-fields">
        <FormControl fullWidth size="small" sx={{ borderRadius: 2 }}>
          <InputLabel>Pharmacie</InputLabel>
          <Select
            value={values.pharmacieId}
            onChange={(event) => {
              const selectedValue = event.target.value;
              if (selectedValue === 'NEW_PHARMACIE') {
                onOpenPharmacyModal();
              } else {
                onChangePharmacie(selectedValue);
              }
            }}
            label="Pharmacie"
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            {pharmacies.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {pharmacieDisplayName(item)}
              </MenuItem>
            ))}
            <Divider sx={{ my: 0.5 }} />
            <MenuItem value="NEW_PHARMACIE" sx={{ color: 'primary.main' }}>
              <AddRoundedIcon sx={{ mr: 1, fontSize: 20 }} />
              Ajouter une nouvelle pharmacie
            </MenuItem>
          </Select>
        </FormControl>
        <ReadOnlyField label="Adresse" value={address || 'Non renseignée'} wide />
        <div className="mission-form-field is-half">
          <span>Trajet domicile → pharmacie</span>
          <div className="mission-distance-display">
            <strong>{values.distanceReferenceKm > 0 ? `${values.distanceReferenceKm.toFixed(1)} km aller-retour` : 'Distance non calculée'}</strong>
            <button className="mission-small-button" type="button" onClick={onRecalcDistance}>
              {values.distanceReferenceKm > 0 ? 'Recalculer' : 'Calculer'}
            </button>
            <input aria-label="Modifier la distance" type="number" value={values.distanceReferenceKm || ''} placeholder="km" onChange={(event) => onDistanceChange(event.target.value)} />
          </div>
          <span>Cette distance sert de référence. Le frais km est ajouté uniquement avec + Km auto.</span>
        </div>
      </div>
    </section>
  );
}

function MissionCoreCard({
  values,
  onSetActType,
  onSetValues,
  regenerateDays,
}: {
  values: MissionFormValues;
  onSetActType: (value: string) => void;
  onSetValues: Dispatch<SetStateAction<MissionFormValues>>;
  regenerateDays: (values?: MissionFormValues) => MissionFormValues;
}) {
  return (
    <section className="mission-form-card">
      <h2>2. Mission</h2>
      <div className="mission-form-fields">
        <FormSelectField label="Type" value={values.actType} onChange={onSetActType} options={missionTypes} />
        <FormField
          label="Date"
          type="date"
          value={values.dateDebut}
          onChange={(value) => onSetValues((current) => regenerateDays({ ...current, dateDebut: value, dateFin: current.isMultiDay ? current.dateFin : value }))}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 48 }}>
          <Checkbox
            checked={values.isMultiDay}
            onChange={(event) => onSetValues((current) => regenerateDays({
              ...current,
              isMultiDay: event.target.checked,
              dateFin: event.target.checked ? current.dateFin : current.dateDebut,
            }))}
          />
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Mission sur plusieurs jours
          </Typography>
        </Box>
        {values.isMultiDay ? (
          <FormField
            label="Date fin"
            type="date"
            value={values.dateFin}
            onChange={(value) => onSetValues((current) => regenerateDays({ ...current, dateFin: value }))}
          />
        ) : null}
        {values.isMultiDay ? (
          <Button variant="outlined" size="small" onClick={() => onSetValues(regenerateDays())} sx={{ borderRadius: 999, alignSelf: 'flex-start' }}>
            Mettre à jour les jours
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function MissionScheduleCard({
  values,
  onSetValues,
  regenerateDays,
  pharmacyName,
  pharmacistName,
}: {
  values: MissionFormValues;
  onSetValues: Dispatch<SetStateAction<MissionFormValues>>;
  regenerateDays: (values?: MissionFormValues) => MissionFormValues;
  pharmacyName?: string;
  pharmacistName?: string;
}) {
  return (
    <section className="mission-form-card">
      <h2>3. Horaire</h2>
      <div className="mission-schedule-summary">
        {values.defaultStartTime} → {values.defaultEndTime} · pause {values.defaultUnpaidBreakMinutes} min · {calculateDayHours(values.defaultStartTime, values.defaultEndTime, values.defaultUnpaidBreakMinutes).toFixed(2)} h payées
      </div>
      <div className="mission-form-fields">
        <FormField
          label="Début"
          type="time"
          value={values.defaultStartTime}
          onChange={(value) => onSetValues((current) => regenerateDays({ ...current, defaultStartTime: value }))}
        />
        <FormField
          label="Fin"
          type="time"
          value={values.defaultEndTime}
          onChange={(value) => onSetValues((current) => regenerateDays({ ...current, defaultEndTime: value }))}
        />
        <FormField
          label="Pause (minutes)"
          type="number"
          value={String(values.defaultUnpaidBreakMinutes)}
          onChange={(value) => onSetValues((current) => regenerateDays({
            ...current,
            defaultUnpaidBreakMinutes: Number(value) || 0,
          }))}
        />
        <Typography variant="body2" color="text.secondary" sx={{ gridColumn: 'span 1', pt: 1 }}>
          Préremplie depuis {pharmacyName ?? 'la pharmacie'}
        </Typography>
        <FormField
          label="Taux horaire"
          type="number"
          value={String(values.tauxHoraire)}
          onChange={(value) => onSetValues((current) => regenerateDays({ ...current, tauxHoraire: parseMoney(value) }))}
        />
        <Typography variant="body2" color="text.secondary" sx={{ gridColumn: 'span 1', pt: 1 }}>
          Prérempli depuis {pharmacistName ?? 'le profil pharmacien'}
        </Typography>
      </div>
    </section>
  );
}

function MissionNotesCard({
  showNotes,
  notes,
  onShowNotes,
  onChangeNotes,
}: {
  showNotes: boolean;
  notes: string;
  onShowNotes: () => void;
  onChangeNotes: (value: string) => void;
}) {
  return (
    <section className="mission-form-card mission-notes-card">
      <h2>5. Notes</h2>
      {showNotes || notes ? (
        <div className="mission-form-fields">
          <TextField
            multiline
            rows={2}
            value={notes}
            onChange={(event) => onChangeNotes(event.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            sx={{ borderRadius: 2, gridColumn: '1 / -1' }}
            placeholder="Ajoutez des notes..."
          />
        </div>
      ) : (
        <Button variant="outlined" size="small" onClick={onShowNotes} startIcon={<EditRoundedIcon />} sx={{ borderRadius: 999 }}>
          Ajouter une note
        </Button>
      )}
    </section>
  );
}

function MissionDaysSection({ values, receipts, openDayId, setOpenDayId, updateDay, addExpense, addTypedExpense, updateExpense, removeExpense, addReceipt, deleteReceipt }: { values: MissionFormValues; receipts: ExpenseReceipt[]; openDayId: string | null; setOpenDayId: (id: string | null) => void; updateDay: (id: string, patch: Partial<MissionDayFormValue>) => void; addExpense: (dayId: string, type: ExpenseType) => void; addTypedExpense: (dayId: string, typeKey: string) => void; updateExpense: (dayId: string, expense: MissionExpenseFormValue) => void; removeExpense: (dayId: string, feeId: string) => void; addReceipt: (dayId: string, expenseId: string, file: File) => string | null; deleteReceipt: (receiptId: string) => void }) {
  return (
    <section className="mission-form-card">
      <h2>4. Jours travaillés</h2>
      <div className="mission-day-list">
        {values.days.map((day) => (
          <MissionDayAccordion
            key={day.id}
            day={day}
            receipts={receipts}
            open={openDayId === day.id}
            onToggle={() => setOpenDayId(openDayId === day.id ? null : day.id)}
            updateDay={updateDay}
            addExpense={addExpense}
            addTypedExpense={addTypedExpense}
            updateExpense={updateExpense}
            removeExpense={removeExpense}
            addReceipt={addReceipt}
            deleteReceipt={deleteReceipt}
          />
        ))}
      </div>
    </section>
  );
}

function MissionDayAccordion({ day, receipts, open, onToggle, updateDay, addExpense, addTypedExpense, updateExpense, removeExpense, addReceipt, deleteReceipt }: { day: MissionDayFormValue; receipts: ExpenseReceipt[]; open: boolean; onToggle: () => void; updateDay: (id: string, patch: Partial<MissionDayFormValue>) => void; addExpense: (dayId: string, type: ExpenseType) => void; addTypedExpense: (dayId: string, typeKey: string) => void; updateExpense: (dayId: string, expense: MissionExpenseFormValue) => void; removeExpense: (dayId: string, feeId: string) => void; addReceipt: (dayId: string, expenseId: string, file: File) => string | null; deleteReceipt: (receiptId: string) => void }) {
  const feeTotalCents = day.expenses.reduce((sum, fee) => sum + fee.amountCents, 0);
  const feeTypes = [...new Set(day.expenses.map((fee) => expenseTypeConfig(fee.typeKey).label.toLocaleLowerCase('fr-CA')))].join(', ');
  return (
    <div className="mission-day-accordion">
      <button className="mission-day-button" type="button" onClick={onToggle}>
        <MissionDayHeader day={day} feeTotalCents={feeTotalCents} feeTypes={feeTypes} />
      </button>
      {open ? (
        <div className="mission-day-panel">
          <div className="mission-form-fields">
            <FormField label="Début" type="time" value={day.startTime} onChange={(value) => updateDay(day.id, { startTime: value })} />
            <FormField label="Fin" type="time" value={day.endTime} onChange={(value) => updateDay(day.id, { endTime: value })} />
            <FormField label="Pause (min)" type="number" value={String(day.unpaidBreakMinutes)} onChange={(value) => updateDay(day.id, { unpaidBreakMinutes: Number(value) || 0 })} />
            <ReadOnlyField label="Heures payées" value={day.paidHours.toFixed(2) + ' h'} />
          </div>
          <MissionExpensesEditor
            expenses={day.expenses}
            receipts={receipts}
            onAddMeal={() => addExpense(day.id, 'REPAS')}
            onAddKm={() => addExpense(day.id, 'KM')}
            onAddTyped={(typeKey) => addTypedExpense(day.id, typeKey)}
            onUpdateExpense={(expense) => updateExpense(day.id, expense)}
            onDeleteExpense={(expenseId) => removeExpense(day.id, expenseId)}
            onAddReceipt={(expenseId, file) => addReceipt(day.id, expenseId, file)}
            onDeleteReceipt={deleteReceipt}
          />
        </div>
      ) : null}
    </div>
  );
}

function MissionDayHeader({ day, feeTotalCents, feeTypes }: { day: MissionDayFormValue; feeTotalCents: number; feeTypes: string }) {
  return (
    <>
      <div>
        <strong>{dayName(day.dateService)}</strong>
        <small>{day.startTime} → {day.endTime} · {day.paidHours.toFixed(2)} h</small>
      </div>
      <span>Frais : {formatMoney(feeTotalCents)}{feeTypes ? ` (${feeTypes})` : ''}</span>
    </>
  );
}

function MissionExpensesEditor({ expenses, receipts, onAddMeal, onAddKm, onAddTyped, onUpdateExpense, onDeleteExpense, onAddReceipt, onDeleteReceipt }: { expenses: MissionExpenseFormValue[]; receipts: ExpenseReceipt[]; onAddMeal: () => void; onAddKm: () => void; onAddTyped: (typeKey: string) => void; onUpdateExpense: (expense: MissionExpenseFormValue) => void; onDeleteExpense: (expenseId: string) => void; onAddReceipt: (expenseId: string, file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [showOtherTypes, setShowOtherTypes] = useState(false);
  return (
    <div className="mission-expenses-editor">
      <MissionExpensesHeader
        onAddMeal={onAddMeal}
        onAddKm={onAddKm}
        onToggleOtherTypes={() => setShowOtherTypes((value) => !value)}
      />
      {showOtherTypes ? <MissionExpenseTypeList onAddTyped={onAddTyped} onClose={() => setShowOtherTypes(false)} /> : null}
      {expenses.length ? (
        <MissionExpenseList
          expenses={expenses}
          receipts={receipts}
          onUpdate={onUpdateExpense}
          onDelete={onDeleteExpense}
          onAddReceipt={onAddReceipt}
          onDeleteReceipt={onDeleteReceipt}
        />
      ) : (
        <p className="mission-empty-expenses">Aucun frais ajouté.</p>
      )}
    </div>
  );
}

function MissionExpensesHeader({
  onAddMeal,
  onAddKm,
  onToggleOtherTypes,
}: {
  onAddMeal: () => void;
  onAddKm: () => void;
  onToggleOtherTypes: () => void;
}) {
  return (
    <div className="mission-expenses-heading">
      <strong>Frais</strong>
      <div className="mission-expense-actions">
        <button className="mission-small-button" type="button" onClick={onAddMeal}>+ Repas</button>
        <button className="mission-small-button" type="button" onClick={onAddKm}>+ Km auto</button>
        <button className="mission-small-button" type="button" onClick={onToggleOtherTypes}>+ Autre</button>
      </div>
    </div>
  );
}

function MissionExpenseTypeList({ onAddTyped, onClose }: { onAddTyped: (typeKey: string) => void; onClose: () => void }) {
  return (
    <div className="mission-expense-type-list">
      {missionQuickExpenseTypes().map((type) => (
        <button
          key={type.key}
          className="mission-small-button"
          type="button"
          onClick={() => {
            onAddTyped(type.key);
            onClose();
          }}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

function MissionExpenseList({
  expenses,
  receipts,
  onUpdate,
  onDelete,
  onAddReceipt,
  onDeleteReceipt,
}: {
  expenses: MissionExpenseFormValue[];
  receipts: ExpenseReceipt[];
  onUpdate: (expense: MissionExpenseFormValue) => void;
  onDelete: (expenseId: string) => void;
  onAddReceipt: (expenseId: string, file: File) => string | null;
  onDeleteReceipt: (receiptId: string) => void;
}) {
  return (
    <div className="mission-expense-list">
      {expenses.map((expense) => (
        <MissionExpenseRow
          key={expense.id}
          expense={expense}
          receipts={receipts.filter((receipt) => expense.receiptIds?.includes(receipt.id))}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddReceipt={(file) => onAddReceipt(expense.id, file)}
          onDeleteReceipt={onDeleteReceipt}
        />
      ))}
    </div>
  );
}

function MissionExpenseRow({ expense, receipts, onUpdate, onDelete, onAddReceipt, onDeleteReceipt }: { expense: MissionExpenseFormValue; receipts: ExpenseReceipt[]; onUpdate: (expense: MissionExpenseFormValue) => void; onDelete: (expenseId: string) => void; onAddReceipt: (file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const config = expenseTypeConfig(expense.typeKey);
  useEffect(() => { function onKey(event: KeyboardEvent) { if (event.key === 'Escape') setEditing(false); } if (editing) window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [editing]);
  
  const handleExpenseDelete = useCallback(async () => {
    const confirmed = await getPlatform().system.showConfirm('Supprimer ce frais ?');
    if (confirmed) {
      onDelete(expense.id);
    }
  }, [expense.id, onDelete]);
  if (editing) {
    return (
      <MissionExpenseEditor
        expense={expense}
        receipts={receipts}
        onSave={(next) => {
          onUpdate(next);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        onDelete={() => {
          handleExpenseDelete().catch(() => {});
        }}
        onAddReceipt={onAddReceipt}
        onDeleteReceipt={onDeleteReceipt}
      />
    );
  }

  return (
    <MissionExpenseItem
      expense={expense}
      receiptsCount={receipts.length}
      onEdit={() => setEditing(true)}
    />
  );
}

function MissionExpenseItem({
  expense,
  receiptsCount,
  onEdit,
}: {
  expense: MissionExpenseFormValue;
  receiptsCount: number;
  onEdit: () => void;
}) {
  const amountLabel = expense.typeKey === 'MILEAGE' && expense.distanceKm
    ? `${String(expense.distanceKm)} km · ${formatMoney(expense.amountCents)}`
    : formatMoney(expense.amountCents);

  return (
    <div className="mission-expense-row">
      <button className="mission-expense-main" type="button" onClick={onEdit}>
        <span className="mission-expense-icon">{expenseTypeConfig(expense.typeKey).icon}</span>
        <span>{expense.label}</span>
        {receiptsCount ? <span title="Justificatif attaché">📎</span> : null}
      </button>
      <button className="mission-expense-amount" type="button" onClick={onEdit}>
        {amountLabel}
      </button>
      <button className="mission-link-button" type="button" aria-label={'Modifier ' + expense.label} onClick={onEdit}>
        ✎
      </button>
    </div>
  );
}

function MissionExpenseEditor({ expense, receipts, onSave, onCancel, onDelete, onAddReceipt, onDeleteReceipt }: { expense: MissionExpenseFormValue; receipts: ExpenseReceipt[]; onSave: (expense: MissionExpenseFormValue) => void; onCancel: () => void; onDelete: () => void; onAddReceipt: (file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [draft, setDraft] = useState(expense);
  const [editRate, setEditRate] = useState(false);
  function update(patch: Partial<MissionExpenseFormValue>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (next.typeKey !== 'MILEAGE') {
        return { ...next, amount: centsToMoney(next.amountCents) };
      }
      const distanceKm = next.distanceKm ?? 0;
      const unitRateCents = next.unitRateCents ?? 0;
      const amountCents = Math.round(distanceKm * unitRateCents);
      return { ...next, amountCents, amount: centsToMoney(amountCents), quantity: distanceKm, unitRate: centsToMoney(unitRateCents) };
    });
  }

  function updateAmount(value: string) {
    const amountCents = moneyToCents(parseMoney(value));
    update({ amountCents, amount: centsToMoney(amountCents) });
  }

  function saveOnEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSave(draft);
    if (event.key === 'Escape') onCancel();
  }

  const config = expenseTypeConfig(draft.typeKey);
  return (
    <div className={draft.typeKey === 'MILEAGE' ? 'mission-expense-edit-card' : 'mission-expense-edit-row'}>
      <span>{config.icon} {config.label}</span>
      {draft.typeKey === 'MILEAGE' ? (
        <MissionMileageEditorFields
          draft={draft}
          editRate={editRate}
          onChangeDistance={(value) => update({ distanceKm: parseMoney(value) })}
          onChangeRate={(value) => update({ unitRateCents: moneyToCents(parseMoney(value)) })}
          onEnableRateEdit={() => setEditRate(true)}
        />
      ) : (
        <MissionAmountEditorField
          amountCents={draft.amountCents}
          onChange={updateAmount}
          onEnterKeyDown={saveOnEnter}
        />
      )}
      <ExpenseReceiptUploader receipts={receipts} onAddReceipt={onAddReceipt} onDeleteReceipt={onDeleteReceipt} />
      <MissionExpenseEditorActions onSave={() => onSave(draft)} onCancel={onCancel} onDelete={onDelete} />
    </div>
  );
}

function MissionMileageEditorFields({
  draft,
  editRate,
  onChangeDistance,
  onChangeRate,
  onEnableRateEdit,
}: {
  draft: MissionExpenseFormValue;
  editRate: boolean;
  onChangeDistance: (value: string) => void;
  onChangeRate: (value: string) => void;
  onEnableRateEdit: () => void;
}) {
  return (
    <>
      <label>
        Distance
        <input autoFocus type="number" step="0.1" value={draft.distanceKm ?? 0} onChange={(event) => onChangeDistance(event.target.value)} />
      </label>
      <label>
        Tarif
        <input type="number" step="0.01" value={centsToMoney(draft.unitRateCents ?? 0)} disabled={!editRate} onChange={(event) => onChangeRate(event.target.value)} />
      </label>
      <strong>Montant calculé {formatMoney(draft.amountCents)}</strong>
      <button className="mission-link-button" type="button" onClick={onEnableRateEdit}>Modifier le tarif</button>
    </>
  );
}

function MissionAmountEditorField({
  amountCents,
  onChange,
  onEnterKeyDown,
}: {
  amountCents: number;
  onChange: (value: string) => void;
  onEnterKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <input autoFocus type="number" step="0.01" value={centsToMoney(amountCents)} onKeyDown={onEnterKeyDown} onChange={(event) => onChange(event.target.value)} />
      <span>$</span>
    </>
  );
}

function MissionExpenseEditorActions({ onSave, onCancel, onDelete }: { onSave: () => void; onCancel: () => void; onDelete: () => void }) {
  return (
    <div className="mission-expense-edit-actions">
      <button type="button" onClick={onSave}>✓ Enregistrer</button>
      <button type="button" aria-label="Annuler la modification" onClick={onCancel}>×</button>
      <button className="is-danger" type="button" onClick={onDelete}>Supprimer</button>
    </div>
  );
}

function ExpenseReceiptUploader({ receipts, onAddReceipt, onDeleteReceipt }: { receipts: ExpenseReceipt[]; onAddReceipt: (file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  function onChange(file?: File) {
    if (!file) return;
    const nextError = onAddReceipt(file);
    setError(nextError);
  }

  return (
    <div className="mission-receipt-uploader" data-testid="expense-receipt-uploader">
      <strong>Justificatif</strong>
      {receipts.length ? (
        <ExpenseReceiptList receipts={receipts} onDeleteReceipt={onDeleteReceipt} />
      ) : (
        <label className="mission-link-button">
          Ajouter reçu
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(event) => onChange(event.target.files?.[0])} hidden />
        </label>
      )}
      {error ? <span className="mission-receipt-error">{error}</span> : null}
    </div>
  );
}

function ExpenseReceiptList({ receipts, onDeleteReceipt }: { receipts: ExpenseReceipt[]; onDeleteReceipt: (receiptId: string) => void }) {
  if (receipts.length > 1) {
    return (
      <div className="mission-receipt-list">
        <span>{receipts.length} justificatifs</span>
        {receipts.map((receipt) => (
          <ExpenseReceiptPreview key={receipt.id} receipt={receipt} onDeleteReceipt={onDeleteReceipt} />
        ))}
      </div>
    );
  }
  return <ExpenseReceiptPreview receipt={receipts[0]} onDeleteReceipt={onDeleteReceipt} />;
}

function ExpenseReceiptPreview({ receipt, onDeleteReceipt }: { receipt: ExpenseReceipt; onDeleteReceipt: (receiptId: string) => void }) {
  return (
    <div className="mission-receipt-preview">
      <span>📎 {receipt.fileName}</span>
      <a href={receipt.storageUrl} aria-label={`Voir le justificatif ${receipt.fileName}`}>Voir</a>
      <label className="mission-link-button">
        Remplacer
        <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" hidden />
      </label>
      <button className="mission-link-button" type="button" aria-label={`Supprimer le justificatif ${receipt.fileName}`} onClick={() => onDeleteReceipt(receipt.id)}>
        Supprimer
      </button>
    </div>
  );
}

function MissionFinancialPreview({ preview, rate }: { preview: { hours: number; subtotal: number; expenses: number; total: number }; rate: number }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mission-form-card mission-summary-card">
      <h2>Résumé</h2>
      <div className="mission-summary-main">
        <MissionSummaryLine label="Début" value={`${preview.hours.toFixed(2)} h`} />
        <MissionSummaryLine label="Financier" value={formatMoney(moneyToCents(preview.total))} strong />
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => setOpen((value) => !value)}
          startIcon={open ? undefined : <EditRoundedIcon />}
          sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
        >
          {open ? 'Masquer le détail' : 'Voir le détail'}
        </Button>
      </div>
      {open ? (
        <div className="mission-preview-grid">
          <MissionSummaryLine label="Taux" value={`${rate.toFixed(2)} $`} />
          <MissionSummaryLine label="Sous-total" value={formatMoney(moneyToCents(preview.subtotal))} />
          <MissionSummaryLine label="Frais" value={formatMoney(moneyToCents(preview.expenses))} />
          <MissionSummaryLine label="Taxes" value="Selon type" />
          <MissionSummaryLine label="Total" value={formatMoney(moneyToCents(preview.total))} strong />
        </div>
      ) : null}
    </section>
  );
}

function MissionFormActions({ mode, invoice, onSubmit, onCancel }: { mode: 'create' | 'edit'; invoice?: Invoice; onSubmit: (action: WorkflowAction) => void; onCancel: () => void }) {
  if (mode === 'create') {
    return (
      <div className="mission-form-actions">
        <Button 
          variant="outlined" 
          type="button" 
          onClick={() => onSubmit('save_draft')}
          sx={{ borderRadius: 2 }}
        >
          Enregistrer brouillon
        </Button>
        <Button 
          variant="outlined" 
          type="button" 
          onClick={() => onSubmit('confirm')}
          sx={{ borderRadius: 2 }}
        >
          Valider mission
        </Button>
        <Button 
          variant="contained" 
          type="button" 
          onClick={() => onSubmit('confirm_generate')}
          sx={{ borderRadius: 2 }}
        >
          Valider et générer facture
        </Button>
      </div>
    );
  }
  const actions = getAvailableEditActions(invoice);
  return (
    <div className="mission-form-actions">
      <Button 
        variant="outlined" 
        type="button" 
        onClick={onCancel}
        sx={{ borderRadius: 2 }}
      >
        Annuler
      </Button>
      {actions.map((definition) => (
        <Button 
          key={definition.action} 
          variant={definition.primary ? 'contained' : 'outlined'} 
          type="button" 
          onClick={() => onSubmit(definition.action)}
          sx={{ borderRadius: 2 }}
        >
          {definition.label}
        </Button>
      ))}
    </div>
  );
}
