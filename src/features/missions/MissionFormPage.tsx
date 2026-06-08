import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageBackButton } from '../../components/PageBackButton';
import { createId, addDaysIso, todayIso } from '../../services/ids';
import { createInvoiceFromMission, invoiceStatusLabels } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { calculateDayHours } from '../../services/missionCalculator';
import { calculateLocalDistance } from '../../hooks/useDistanceCalculator';
import { buildMissionDefaults } from '../../hooks/useMissionDefaults';
import { resolveMissionDefaults } from '../../storage/selectors';
import { useMissionFinancialPreview } from '../../hooks/useMissionFinancialPreview';
import { createLocalReceipt, validateReceiptFile } from '../../services/expenseReceipts';
import { createMissionExpenseDraft, expenseTypeConfig, missionQuickExpenseTypes, normalizeMissionExpense } from '../../services/expenseTypes';
import { getAvailableEditActions, getInvoiceEditImpact, type MissionEditAction } from '../../services/missionEditRules';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { ExpenseReceipt, Invoice, Mission, MissionDay, MissionExpense, MissionStatus } from '../../storage/schema';
import { activePharmacien, findInvoice, findMission, findPharmacien, findPharmacie, missionInvoice } from '../../storage/selectors';
import './MissionFormPage.css';

type ExpenseType = 'REPAS' | 'KM' | 'AUTRE';
type MissionExpenseFormValue = MissionExpense;
type MissionDayFormValue = { id: string; dateService: string; startTime: string; endTime: string; unpaidBreakMinutes: number; paidHours: number; expenses: MissionExpenseFormValue[]; notes?: string };
type WorkflowAction = 'save_draft' | 'confirm' | 'confirm_generate' | MissionEditAction;
type MissionFormValues = {
  pharmacienId: string;
  pharmacieId: string;
  actType: string;
  dateDebut: string;
  dateFin: string;
  isMultiDay: boolean;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultUnpaidBreakMinutes: number;
  tauxHoraire: number;
  distanceReferenceKm: number;
  kmUnitRate: number;
  days: MissionDayFormValue[];
  notes: string;
};

const fallbackMealRule = { mealAutoEnabled: true, mealThresholdHours: 8, mealDefaultAmount: 20 };
const missionTypes = [{ value: 'REMPLACEMENT_OFFICINE', label: 'Remplacement officine' }, { value: 'GARDE', label: 'Garde' }, { value: 'CLINIQUE', label: 'Clinique' }];

function moneyToCents(value: number) { return Math.round((Number(value) || 0) * 100); }
function centsToMoney(cents: number) { return Math.round(cents) / 100; }
function parseMoney(value: string) { return Number(value.replace(',', '.')) || 0; }
function dayName(dateIso: string) { return new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: '2-digit', month: 'short' }).format(new Date(`${dateIso}T00:00:00`)); }
function daysBetween(startIso: string, endIso: string): string[] {
  const days: string[] = [];
  let current = startIso;
  while (current <= endIso && days.length < 60) { days.push(current); current = addDaysIso(current, 1); }
  return days;
}
function addressOf(entity?: { adresse?: string; ville?: string; codePostal?: string }) { return [entity?.adresse, entity?.ville, entity?.codePostal].filter(Boolean).join(', '); }
function estimateDistanceKm(home?: { adresse?: string; ville?: string; codePostal?: string; lat?: number; lng?: number }, work?: { adresse?: string; ville?: string; codePostal?: string; lat?: number; lng?: number }) {
  return calculateLocalDistance({
    homeAddress: addressOf(home),
    workAddress: addressOf(work),
    homeLat: home?.lat,
    homeLng: home?.lng,
    workLat: work?.lat,
    workLng: work?.lng,
  }).distanceKm;
}

function createExpense(type: ExpenseType, overrides: Partial<MissionExpenseFormValue> = {}): MissionExpenseFormValue {
  const typeKey = type === 'REPAS' ? 'MEAL' : type === 'KM' ? 'MILEAGE' : 'OTHER_NON_DEDUCTIBLE';
  return createMissionExpenseDraft({ id: createId('fee'), typeKey, amountCents: 0, overrides });
}
function createDay(dateService: string, values: Pick<MissionFormValues, 'defaultStartTime' | 'defaultEndTime' | 'defaultUnpaidBreakMinutes'>, expenses: MissionExpenseFormValue[] = [], mealRule = fallbackMealRule): MissionDayFormValue {
  const paidHours = calculateDayHours(values.defaultStartTime, values.defaultEndTime, values.defaultUnpaidBreakMinutes);
  const autoMeal = mealRule.mealAutoEnabled && paidHours > mealRule.mealThresholdHours ? [createExpense('REPAS', { amount: mealRule.mealDefaultAmount })] : [];
  return { id: createId('day'), dateService, startTime: values.defaultStartTime, endTime: values.defaultEndTime, unpaidBreakMinutes: values.defaultUnpaidBreakMinutes, paidHours, expenses: expenses.length ? expenses : autoMeal };
}

function missionToForm(mission: Mission): MissionFormValues {
  return {
    pharmacienId: mission.pharmacienId,
    pharmacieId: mission.pharmacieId,
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: mission.dateDebut,
    dateFin: mission.dateFin,
    isMultiDay: mission.dateDebut !== mission.dateFin,
    defaultStartTime: mission.days[0]?.startTime ?? '08:00',
    defaultEndTime: mission.days[0]?.endTime ?? '17:00',
    defaultUnpaidBreakMinutes: mission.days[0]?.unpaidBreakMinutes ?? 60,
    tauxHoraire: centsToMoney(mission.hourlyRateCents),
    distanceReferenceKm: mission.mileageKm,
    kmUnitRate: centsToMoney(mission.mileageRateCents || 61),
    days: mission.days.map((day) => ({ ...day, paidHours: day.hours, expenses: (day.expenses ?? []).map((expense) => normalizeMissionExpense(expense, mission.id, day.id)) })),
    notes: mission.notes ?? '',
  };
}

function buildMissionFromForm(values: MissionFormValues, existing?: Mission): Mission {
  const now = new Date().toISOString();
  const missionId = existing?.id ?? createId('mis');
  const days: MissionDay[] = values.days.map((day) => ({ id: day.id, dateService: day.dateService, startTime: day.startTime, endTime: day.endTime, unpaidBreakMinutes: day.unpaidBreakMinutes, description: 'Remplacement en officine', hours: day.paidHours, expenses: day.expenses.map((expense) => normalizeMissionExpense(expense, missionId, day.id)) }));
  const totalHours = Math.round(values.days.reduce((sum, day) => sum + day.paidHours, 0) * 100) / 100;
  const subtotalCents = Math.round(totalHours * moneyToCents(values.tauxHoraire));
  const expenseTotalCents = values.days.reduce((sum, day) => sum + day.expenses.reduce((feeSum, fee) => feeSum + fee.amountCents, 0), 0);
  return {
    id: missionId,
    missionCode: existing?.missionCode ?? `MIS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    pharmacienId: values.pharmacienId,
    pharmacieId: values.pharmacieId,
    status: existing?.status ?? 'DRAFT',
    dateDebut: values.days[0]?.dateService ?? values.dateDebut,
    dateFin: values.days[values.days.length - 1]?.dateService ?? values.dateFin,
    days,
    hourlyRateCents: moneyToCents(values.tauxHoraire),
    mealFeeCents: 0,
    mileageKm: values.distanceReferenceKm,
    mileageRateCents: moneyToCents(values.kmUnitRate),
    totalHours,
    subtotalCents,
    mealTotalCents: values.days.flatMap((day) => day.expenses).filter((fee) => fee.typeKey === 'MEAL').reduce((sum, fee) => sum + fee.amountCents, 0),
    mileageTotalCents: values.days.flatMap((day) => day.expenses).filter((fee) => fee.typeKey === 'MILEAGE').reduce((sum, fee) => sum + fee.amountCents, 0),
    totalCents: subtotalCents + expenseTotalCents,
    notes: values.notes,
    invoiceId: existing?.invoiceId,
    events: [...(existing?.events ?? []), { id: createId('evt'), eventType: existing ? 'UPDATED' : 'CREATED', label: existing ? 'Mission modifiée depuis le formulaire' : 'Mission créée', eventDate: now }],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function MissionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { missionId } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const existing = mode === 'edit' ? findMission(state, missionId) : undefined;
  const invoice = existing ? findInvoice(state, existing.invoiceId) ?? missionInvoice(state, existing) : undefined;
  const defaults = buildMissionDefaults(state, state.activePharmacienId ?? undefined);
  const missionDefaults = resolveMissionDefaults(state, state.activePharmacienId, values.pharmacieId);
  const currentPharmacien = activePharmacien(state) ?? defaults.pharmacien ?? state.pharmaciens[0];
  const defaultPharmacie = defaults.defaultPharmacie?.id ?? currentPharmacien?.favoritePharmacieId ?? state.pharmacies[0]?.id ?? '';
  const [values, setValues] = useState<MissionFormValues>(() => existing ? missionToForm(existing) : {
    pharmacienId: currentPharmacien?.id ?? '', pharmacieId: defaultPharmacie, actType: defaults.defaultMissionType, dateDebut: todayIso(), dateFin: todayIso(), isMultiDay: false,
    defaultStartTime: defaults.scheduleDefaults.startTime, defaultEndTime: defaults.scheduleDefaults.endTime, defaultUnpaidBreakMinutes: defaults.scheduleDefaults.breakMinutes,
    tauxHoraire: centsToMoney(currentPharmacien?.hourlyRateCents ?? 8500), distanceReferenceKm: defaults.mileageDefaults.distanceKm, kmUnitRate: centsToMoney(defaults.mileageDefaults.rateCents), days: [], notes: '',
  });
  const [pendingReceipts, setPendingReceipts] = useState<ExpenseReceipt[]>([]);
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const pharmacien = findPharmacien(state, values.pharmacienId);
  const pharmacie = findPharmacie(state, values.pharmacieId);
  const preview = useMissionFinancialPreview(values);

  useEffect(() => {
    setValues((current) => regenerateDays(current));
  }, []);

  useEffect(() => {
    const km = estimateDistanceKm(pharmacien, pharmacie);
    if (km > 0 && values.distanceReferenceKm === 0) {
      setField('distanceReferenceKm', km);
    }
  }, [values.pharmacienId, values.pharmacieId]);

  function setField<K extends keyof MissionFormValues>(field: K, value: MissionFormValues[K]) { setValues((current) => ({ ...current, [field]: value })); }
  function regenerateDays(source = values) {
    const end = source.isMultiDay ? source.dateFin : source.dateDebut;
    const nextDays = daysBetween(source.dateDebut, end || source.dateDebut).map((date) => {
      const existingDay = source.days.find((day) => day.dateService === date);
      return existingDay ? recalcDay({ ...existingDay, startTime: source.defaultStartTime, endTime: source.defaultEndTime, unpaidBreakMinutes: source.defaultUnpaidBreakMinutes }) : createDay(date, source, [], { mealAutoEnabled: defaults.mealDefaults.enabled, mealThresholdHours: defaults.mealDefaults.thresholdHours, mealDefaultAmount: centsToMoney(defaults.mealDefaults.amountCents) });
    });
    return { ...source, dateFin: end || source.dateDebut, days: nextDays };
  }
  function recalcDay(day: MissionDayFormValue) { return { ...day, paidHours: calculateDayHours(day.startTime, day.endTime, day.unpaidBreakMinutes) }; }
  function updateDay(dayId: string, patch: Partial<MissionDayFormValue>) { setValues((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? recalcDay({ ...day, ...patch }) : day) })); }
  function addExpense(dayId: string, type: ExpenseType) {
    setValues((current) => {
      const distanceKm = current.distanceReferenceKm || estimateDistanceKm(findPharmacien(state, current.pharmacienId), findPharmacie(state, current.pharmacieId));
      return {
        ...current,
        distanceReferenceKm: type === 'KM' && distanceKm > 0 ? distanceKm : current.distanceReferenceKm,
        days: current.days.map((day) => day.id === dayId ? { ...day, expenses: [...day.expenses, type === 'KM' ? createExpense('KM', { distanceKm, unitRateCents: moneyToCents(current.kmUnitRate), unitRate: current.kmUnitRate, quantity: distanceKm, amountCents: Math.round(distanceKm * moneyToCents(current.kmUnitRate)), amount: Math.round(distanceKm * current.kmUnitRate * 100) / 100 }) : createExpense(type, { amountCents: type === 'REPAS' ? defaults.mealDefaults.amountCents : 0, amount: type === 'REPAS' ? centsToMoney(defaults.mealDefaults.amountCents) : 0 })] } : day),
      };
    });
  }
  function addTypedExpense(dayId: string, typeKey: string) { setValues((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? { ...day, expenses: [...day.expenses, createMissionExpenseDraft({ id: createId('fee'), typeKey, missionDayId: dayId })] } : day) })); }
  function removeExpense(dayId: string, feeId: string) { setValues((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? { ...day, expenses: day.expenses.filter((fee) => fee.id !== feeId) } : day) })); }
  function updateExpense(dayId: string, expense: MissionExpenseFormValue) { setValues((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? { ...day, expenses: day.expenses.map((fee) => fee.id === expense.id ? expense : fee) } : day) })); }
  function addReceipt(dayId: string, expenseId: string, file: File): string | null { const error = validateReceiptFile(file); if (error) return error; const receipt = createLocalReceipt({ file, expenseId, missionId: existing?.id ?? 'draft', missionDayId: dayId }); setPendingReceipts((current) => [...current, receipt]); setValues((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? { ...day, expenses: day.expenses.map((fee) => fee.id === expenseId ? { ...fee, receiptIds: [...(fee.receiptIds ?? []), receipt.id] } : fee) } : day) })); return null; }
  function deleteReceipt(receiptId: string) { setPendingReceipts((current) => current.filter((receipt) => receipt.id !== receiptId)); setValues((current) => ({ ...current, days: current.days.map((day) => ({ ...day, expenses: day.expenses.map((fee) => ({ ...fee, receiptIds: fee.receiptIds?.filter((id) => id !== receiptId) })) })) })); }
  function recalcDistance() {
    const km = estimateDistanceKm(pharmacien, pharmacie);
    setField('distanceReferenceKm', km);
  }
  function changePharmacien(id: string) {
    const next = findPharmacien(state, id);
    setValues((current) => ({ ...current, pharmacienId: id, tauxHoraire: centsToMoney(next?.hourlyRateCents ?? moneyToCents(current.tauxHoraire)), pharmacieId: next?.favoritePharmacieId ?? current.pharmacieId }));
  }
  function changePharmacie(id: string) {
    const next = findPharmacie(state, id);
    setValues((current) => regenerateDays({ ...current, pharmacieId: id, defaultUnpaidBreakMinutes: next?.defaultBreakMinutes ?? current.defaultUnpaidBreakMinutes }));
  }
  function submit(action: WorkflowAction) {
    const mission = buildMissionFromForm(values, existing);
    const status: MissionStatus = action === 'save_draft' ? 'DRAFT' : action === 'confirm' || action === 'confirm_generate' ? 'CONFIRMED' : mission.status;
    const finalMission = { ...mission, status };
    updateAppState((current) => {
      const currentInvoice = existing ? current.invoices.find((item) => item.id === existing.invoiceId || item.missionId === existing.id) : undefined;
      let invoices = current.invoices;
      let missionToStore = finalMission;
      if (mode === 'create' && action === 'confirm_generate') {
        const invoice = createInvoiceFromMission(finalMission, current);
        invoices = [...invoices, invoice]; missionToStore = { ...finalMission, invoiceId: invoice.id };
    } else if (mode === 'edit' && currentInvoice && action === 'save_regenerate') {
        invoices = invoices.map((item) => item.id === currentInvoice.id ? { ...item, hours: finalMission.totalHours, amountCents: finalMission.totalCents, pharmacieId: finalMission.pharmacieId, pharmacienId: finalMission.pharmacienId } : item);
        missionToStore = { ...finalMission, events: [...finalMission.events, { id: createId('evt'), eventType: 'INVOICE_UPDATED', label: `Facture ${currentInvoice.numero} rééditée`, eventDate: new Date().toISOString() }] };
      }
      const receiptsToStore = pendingReceipts.map((receipt) => ({ ...receipt, missionId: missionToStore.id, storageUrl: receipt.storageUrl.replace('receipts/draft/', `receipts/${missionToStore.id}/`) }));
      return { ...current, missions: mode === 'edit' ? current.missions.map((item) => item.id === existing?.id ? missionToStore : item) : [...current.missions, missionToStore], invoices, expenseReceipts: [...current.expenseReceipts.filter((receipt) => !receiptsToStore.some((item) => item.id === receipt.id)), ...receiptsToStore] };
    });
    navigate(`/missions?selected=${finalMission.id}`);
  }

  if (mode === 'edit' && !existing) return <div className="mission-form-page"><PageBackButton to="/missions" label="Missions" /><p>Mission introuvable.</p></div>;

  return <main className="mission-form-page">
    <div className="mission-form-heading"><PageBackButton to={mode === 'edit' && existing ? `/missions?selected=${existing.id}` : '/activity'} label={mode === 'edit' ? 'Missions' : 'Accueil'} /><h1>{mode === 'edit' ? 'Modifier mission' : 'Nouvelle mission'}</h1><p>Créez une mission de remplacement. La facture sera générée automatiquement à partir des horaires, frais et informations saisies.</p><div className="mission-heading-summary">{[pharmacien?.nom, pharmacie?.nom, values.dateDebut].filter(Boolean).join(' · ')}</div></div>
    {mode === 'edit' ? <MissionEditWarning invoice={invoice} /> : null}
    <div className="mission-form-grid">
      <div className="mission-pharmacien-strip"><span>Mission pour <strong>{pharmacien?.nom ?? 'Pharmacien'}</strong></span><button className="mission-link-button" type="button" onClick={() => navigate('/')}>Changer</button></div>
      <section className="mission-form-card"><h2>1. Lieu de mission</h2><div className="mission-form-fields"><SelectField label="Pharmacie" value={values.pharmacieId} onChange={changePharmacie} options={state.pharmacies.map((item) => ({ value: item.id, label: item.nom }))} /><ReadOnly label="Adresse" value={addressOf(pharmacie) || 'Non renseignée'} wide /><div className="mission-form-field is-half"><span>Trajet domicile → pharmacie</span><div className="mission-distance-display"><strong>{values.distanceReferenceKm > 0 ? `${values.distanceReferenceKm.toFixed(1)} km aller-retour` : 'Distance non calculée'}</strong><button className="mission-small-button" type="button" onClick={recalcDistance}>{values.distanceReferenceKm > 0 ? 'Recalculer' : 'Calculer'}</button><input aria-label="Modifier la distance" type="number" value={values.distanceReferenceKm || ''} placeholder="km" onChange={(event) => setField('distanceReferenceKm', parseMoney(event.target.value))} /></div><span>Cette distance sert de référence. Le frais km est ajouté uniquement avec + Km auto.</span></div></div></section>
      <section className="mission-form-card"><h2>2. Mission</h2><div className="mission-form-fields"><SelectField label="Type" value={values.actType} onChange={(value) => setField('actType', value)} options={missionTypes} /><Field label="Date" type="date" value={values.dateDebut} onChange={(value) => setValues((current) => regenerateDays({ ...current, dateDebut: value, dateFin: current.isMultiDay ? current.dateFin : value }))} /><label className="mission-checkbox-field"><input type="checkbox" checked={values.isMultiDay} onChange={(event) => setValues((current) => regenerateDays({ ...current, isMultiDay: event.target.checked, dateFin: event.target.checked ? current.dateFin : current.dateDebut }))} /> Mission sur plusieurs jours</label>{values.isMultiDay ? <Field label="Date fin" type="date" value={values.dateFin} onChange={(value) => setValues((current) => regenerateDays({ ...current, dateFin: value }))} /> : null}{values.isMultiDay ? <button className="mission-small-button" type="button" onClick={() => setValues(regenerateDays())}>Mettre à jour les jours</button> : null}</div></section>
      <section className="mission-form-card"><h2>3. Horaire</h2><div className="mission-schedule-summary">{values.defaultStartTime} → {values.defaultEndTime} · pause {values.defaultUnpaidBreakMinutes} min · {calculateDayHours(values.defaultStartTime, values.defaultEndTime, values.defaultUnpaidBreakMinutes).toFixed(2)} h payées</div><div className="mission-form-fields"><Field label="Début" type="time" value={values.defaultStartTime} onChange={(value) => setValues((current) => regenerateDays({ ...current, defaultStartTime: value }))} /><Field label="Fin" type="time" value={values.defaultEndTime} onChange={(value) => setValues((current) => regenerateDays({ ...current, defaultEndTime: value }))} /><div className="mission-form-field"><label>Pause</label><input type="number" value={String(values.defaultUnpaidBreakMinutes)} onChange={(event) => setValues((current) => regenerateDays({ ...current, defaultUnpaidBreakMinutes: Number(event.target.value) || 0 }))} /><span>Préremplie depuis {pharmacie?.nom ?? 'la pharmacie'}</span></div><div className="mission-form-field"><label>Taux horaire</label><input type="number" value={values.tauxHoraire} onChange={(event) => setField('tauxHoraire', parseMoney(event.target.value))} /><span>Prérempli depuis {pharmacien?.nom ?? 'le profil pharmacien'}</span></div></div></section>
      <MissionDaysSection values={values} receipts={[...state.expenseReceipts, ...pendingReceipts]} openDayId={openDayId} setOpenDayId={setOpenDayId} updateDay={updateDay} addExpense={addExpense} addTypedExpense={addTypedExpense} updateExpense={updateExpense} removeExpense={removeExpense} addReceipt={addReceipt} deleteReceipt={deleteReceipt} />
      <section className="mission-form-card mission-notes-card"><h2>5. Notes</h2>{showNotes || values.notes ? <div className="mission-form-fields"><div className="mission-form-field is-wide"><textarea rows={2} value={values.notes} onChange={(event) => setField('notes', event.target.value)} /></div></div> : <button className="mission-small-button" type="button" onClick={() => setShowNotes(true)}>Ajouter une note</button>}</section>
      <MissionFinancialPreview preview={preview} rate={values.tauxHoraire} />
      <MissionFormActions mode={mode} invoice={invoice} onSubmit={submit} onCancel={() => navigate(mode === 'edit' && existing ? `/missions?selected=${existing.id}` : '/missions')} />
    </div>
  </main>;
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) { return <div className="mission-form-field"><label>{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <div className="mission-form-field"><label>{label}</label><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>; }
function ReadOnly({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={`mission-form-field ${wide ? 'is-half' : ''}`}><span>{label}</span><strong>{value}</strong></div>; }
function MissionEditWarning({ invoice }: { invoice?: Invoice }) { const impact = getInvoiceEditImpact(invoice); return <div className={`mission-warning is-${impact.level}`}>{impact.message}</div>; }
function MissionDaysSection({ values, receipts, openDayId, setOpenDayId, updateDay, addExpense, addTypedExpense, updateExpense, removeExpense, addReceipt, deleteReceipt }: { values: MissionFormValues; receipts: ExpenseReceipt[]; openDayId: string | null; setOpenDayId: (id: string | null) => void; updateDay: (id: string, patch: Partial<MissionDayFormValue>) => void; addExpense: (dayId: string, type: ExpenseType) => void; addTypedExpense: (dayId: string, typeKey: string) => void; updateExpense: (dayId: string, expense: MissionExpenseFormValue) => void; removeExpense: (dayId: string, feeId: string) => void; addReceipt: (dayId: string, expenseId: string, file: File) => string | null; deleteReceipt: (receiptId: string) => void }) {
  return <section className="mission-form-card"><h2>4. Jours travaillés</h2><div className="mission-day-list">{values.days.map((day) => <MissionDayAccordion key={day.id} day={day} receipts={receipts} open={openDayId === day.id} onToggle={() => setOpenDayId(openDayId === day.id ? null : day.id)} updateDay={updateDay} addExpense={addExpense} addTypedExpense={addTypedExpense} updateExpense={updateExpense} removeExpense={removeExpense} addReceipt={addReceipt} deleteReceipt={deleteReceipt} />)}</div></section>;
}

function MissionDayAccordion({ day, receipts, open, onToggle, updateDay, addExpense, addTypedExpense, updateExpense, removeExpense, addReceipt, deleteReceipt }: { day: MissionDayFormValue; receipts: ExpenseReceipt[]; open: boolean; onToggle: () => void; updateDay: (id: string, patch: Partial<MissionDayFormValue>) => void; addExpense: (dayId: string, type: ExpenseType) => void; addTypedExpense: (dayId: string, typeKey: string) => void; updateExpense: (dayId: string, expense: MissionExpenseFormValue) => void; removeExpense: (dayId: string, feeId: string) => void; addReceipt: (dayId: string, expenseId: string, file: File) => string | null; deleteReceipt: (receiptId: string) => void }) {
  const feeTotalCents = day.expenses.reduce((sum, fee) => sum + fee.amountCents, 0);
  const feeTypes = [...new Set(day.expenses.map((fee) => expenseTypeConfig(fee.typeKey).label.toLocaleLowerCase('fr-CA')))].join(', ');
  return <div className="mission-day-accordion"><button className="mission-day-button" type="button" onClick={onToggle}><div><strong>{dayName(day.dateService)}</strong><small>{day.startTime} → {day.endTime} · {day.paidHours.toFixed(2)} h</small></div><span>Frais : {formatMoney(feeTotalCents)}{feeTypes ? ' (' + feeTypes + ')' : ''}</span></button>{open ? <div className="mission-day-panel"><div className="mission-form-fields"><Field label="Début" type="time" value={day.startTime} onChange={(value) => updateDay(day.id, { startTime: value })} /><Field label="Fin" type="time" value={day.endTime} onChange={(value) => updateDay(day.id, { endTime: value })} /><Field label="Pause" type="number" value={String(day.unpaidBreakMinutes)} onChange={(value) => updateDay(day.id, { unpaidBreakMinutes: Number(value) || 0 })} /><ReadOnly label="Heures payées" value={day.paidHours.toFixed(2) + ' h'} /></div><MissionExpensesEditor expenses={day.expenses} receipts={receipts} onAddMeal={() => addExpense(day.id, 'REPAS')} onAddKm={() => addExpense(day.id, 'KM')} onAddTyped={(typeKey) => addTypedExpense(day.id, typeKey)} onUpdateExpense={(expense) => updateExpense(day.id, expense)} onDeleteExpense={(expenseId) => removeExpense(day.id, expenseId)} onAddReceipt={(expenseId, file) => addReceipt(day.id, expenseId, file)} onDeleteReceipt={deleteReceipt} /></div> : null}</div>;
}

function MissionExpensesEditor({ expenses, receipts, onAddMeal, onAddKm, onAddTyped, onUpdateExpense, onDeleteExpense, onAddReceipt, onDeleteReceipt }: { expenses: MissionExpenseFormValue[]; receipts: ExpenseReceipt[]; onAddMeal: () => void; onAddKm: () => void; onAddTyped: (typeKey: string) => void; onUpdateExpense: (expense: MissionExpenseFormValue) => void; onDeleteExpense: (expenseId: string) => void; onAddReceipt: (expenseId: string, file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [showOtherTypes, setShowOtherTypes] = useState(false);
  return <div className="mission-expenses-editor"><div className="mission-expenses-heading"><strong>Frais</strong><div className="mission-expense-actions"><button className="mission-small-button" type="button" onClick={onAddMeal}>+ Repas</button><button className="mission-small-button" type="button" onClick={onAddKm}>+ Km auto</button><button className="mission-small-button" type="button" onClick={() => setShowOtherTypes((value) => !value)}>+ Autre</button></div></div>{showOtherTypes ? <div className="mission-expense-type-list">{missionQuickExpenseTypes().map((type) => <button key={type.key} className="mission-small-button" type="button" onClick={() => { onAddTyped(type.key); setShowOtherTypes(false); }}>{type.label}</button>)}</div> : null}{expenses.length ? <div className="mission-expense-list">{expenses.map((expense) => <MissionExpenseRow key={expense.id} expense={expense} receipts={receipts.filter((receipt) => expense.receiptIds?.includes(receipt.id))} onUpdate={onUpdateExpense} onDelete={onDeleteExpense} onAddReceipt={(file) => onAddReceipt(expense.id, file)} onDeleteReceipt={onDeleteReceipt} />)}</div> : <p className="mission-empty-expenses">Aucun frais ajouté.</p>}</div>;
}

function MissionExpenseRow({ expense, receipts, onUpdate, onDelete, onAddReceipt, onDeleteReceipt }: { expense: MissionExpenseFormValue; receipts: ExpenseReceipt[]; onUpdate: (expense: MissionExpenseFormValue) => void; onDelete: (expenseId: string) => void; onAddReceipt: (file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const config = expenseTypeConfig(expense.typeKey);
  useEffect(() => { function onKey(event: KeyboardEvent) { if (event.key === 'Escape') setEditing(false); } if (editing) window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [editing]);
  if (editing) return <MissionExpenseEditor expense={expense} receipts={receipts} onSave={(next) => { onUpdate(next); setEditing(false); }} onCancel={() => setEditing(false)} onDelete={() => { if (window.confirm('Supprimer ce frais ?')) onDelete(expense.id); }} onAddReceipt={onAddReceipt} onDeleteReceipt={onDeleteReceipt} />;
  return <div className="mission-expense-row"><button className="mission-expense-main" type="button" onClick={() => setEditing(true)}><span className="mission-expense-icon">{config.icon}</span><span>{expense.label}</span>{receipts.length ? <span title="Justificatif attaché">📎</span> : null}</button><button className="mission-expense-amount" type="button" onClick={() => setEditing(true)}>{expense.typeKey === 'MILEAGE' && expense.distanceKm ? String(expense.distanceKm) + ' km · ' + formatMoney(expense.amountCents) : formatMoney(expense.amountCents)}</button><button className="mission-link-button" type="button" aria-label={'Modifier ' + expense.label} onClick={() => setEditing(true)}>✎</button></div>;
}

function MissionExpenseEditor({ expense, receipts, onSave, onCancel, onDelete, onAddReceipt, onDeleteReceipt }: { expense: MissionExpenseFormValue; receipts: ExpenseReceipt[]; onSave: (expense: MissionExpenseFormValue) => void; onCancel: () => void; onDelete: () => void; onAddReceipt: (file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [draft, setDraft] = useState(expense);
  const [editRate, setEditRate] = useState(false);
  function update(patch: Partial<MissionExpenseFormValue>) { setDraft((current) => { const next = { ...current, ...patch }; if (next.typeKey !== 'MILEAGE') return { ...next, amount: centsToMoney(next.amountCents) }; const distanceKm = next.distanceKm ?? 0; const unitRateCents = next.unitRateCents ?? 0; const amountCents = Math.round(distanceKm * unitRateCents); return { ...next, amountCents, amount: centsToMoney(amountCents), quantity: distanceKm, unitRate: centsToMoney(unitRateCents) }; }); }
  function updateAmount(value: string) { const amountCents = moneyToCents(parseMoney(value)); update({ amountCents, amount: centsToMoney(amountCents) }); }
  function saveOnEnter(event: ReactKeyboardEvent<HTMLInputElement>) { if (event.key === 'Enter') onSave(draft); if (event.key === 'Escape') onCancel(); }
  const config = expenseTypeConfig(draft.typeKey);
  return <div className={draft.typeKey === 'MILEAGE' ? 'mission-expense-edit-card' : 'mission-expense-edit-row'}><span>{config.icon} {config.label}</span>{draft.typeKey === 'MILEAGE' ? <><label>Distance<input autoFocus type="number" step="0.1" value={draft.distanceKm ?? 0} onChange={(event) => update({ distanceKm: parseMoney(event.target.value) })} /></label><label>Tarif<input type="number" step="0.01" value={centsToMoney(draft.unitRateCents ?? 0)} disabled={!editRate} onChange={(event) => update({ unitRateCents: moneyToCents(parseMoney(event.target.value)) })} /></label><strong>Montant calculé {formatMoney(draft.amountCents)}</strong><button className="mission-link-button" type="button" onClick={() => setEditRate(true)}>Modifier le tarif</button></> : <><input autoFocus type="number" step="0.01" value={centsToMoney(draft.amountCents)} onKeyDown={saveOnEnter} onChange={(event) => updateAmount(event.target.value)} /><span>$</span></>}<ExpenseReceiptUploader receipts={receipts} onAddReceipt={onAddReceipt} onDeleteReceipt={onDeleteReceipt} /><div className="mission-expense-edit-actions"><button type="button" onClick={() => onSave(draft)}>✓ Enregistrer</button><button type="button" onClick={onCancel}>×</button><button className="is-danger" type="button" onClick={onDelete}>Supprimer</button></div></div>;
}

function ExpenseReceiptUploader({ receipts, onAddReceipt, onDeleteReceipt }: { receipts: ExpenseReceipt[]; onAddReceipt: (file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  function onChange(file?: File) { if (!file) return; const nextError = onAddReceipt(file); setError(nextError); }
  return <div className="mission-receipt-uploader"><strong>Justificatif</strong>{receipts.length ? <ExpenseReceiptList receipts={receipts} onDeleteReceipt={onDeleteReceipt} /> : <label className="mission-link-button">Ajouter reçu<input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(event) => onChange(event.target.files?.[0])} hidden /></label>}{error ? <span className="mission-receipt-error">{error}</span> : null}</div>;
}

function ExpenseReceiptList({ receipts, onDeleteReceipt }: { receipts: ExpenseReceipt[]; onDeleteReceipt: (receiptId: string) => void }) {
  if (receipts.length > 1) return <div className="mission-receipt-list"><span>{receipts.length} justificatifs</span>{receipts.map((receipt) => <ExpenseReceiptPreview key={receipt.id} receipt={receipt} onDeleteReceipt={onDeleteReceipt} />)}</div>;
  return <ExpenseReceiptPreview receipt={receipts[0]} onDeleteReceipt={onDeleteReceipt} />;
}

function ExpenseReceiptPreview({ receipt, onDeleteReceipt }: { receipt: ExpenseReceipt; onDeleteReceipt: (receiptId: string) => void }) {
  return <div className="mission-receipt-preview"><span>📎 {receipt.fileName}</span><a href={receipt.storageUrl}>Voir</a><label className="mission-link-button">Remplacer<input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" hidden /></label><button className="mission-link-button" type="button" onClick={() => onDeleteReceipt(receipt.id)}>Supprimer</button></div>;
}

function MissionFinancialPreview({ preview, rate }: { preview: { hours: number; subtotal: number; expenses: number; total: number }; rate: number }) { const [open, setOpen] = useState(false); return <section className="mission-form-card mission-summary-card"><h2>Résumé</h2><div className="mission-summary-main"><strong>{formatMoney(moneyToCents(preview.total))}</strong><span>{preview.hours.toFixed(2)} h · frais {formatMoney(moneyToCents(preview.expenses))} · taxes selon type</span><button className="mission-link-button" type="button" onClick={() => setOpen((value) => !value)}>{open ? 'Masquer le détail' : 'Voir le détail'}</button></div>{open ? <div className="mission-preview-grid"><div className="mission-preview-line"><span>Heures</span><strong>{preview.hours.toFixed(2)} h</strong></div><div className="mission-preview-line"><span>Taux</span><strong>{rate.toFixed(2)} $</strong></div><div className="mission-preview-line"><span>Sous-total</span><strong>{formatMoney(moneyToCents(preview.subtotal))}</strong></div><div className="mission-preview-line"><span>Frais</span><strong>{formatMoney(moneyToCents(preview.expenses))}</strong></div><div className="mission-preview-line"><span>Taxes</span><strong>Selon type</strong></div><div className="mission-preview-line"><span>Total</span><strong>{formatMoney(moneyToCents(preview.total))}</strong></div></div> : null}</section>; }
function MissionFormActions({ mode, invoice, onSubmit, onCancel }: { mode: 'create' | 'edit'; invoice?: Invoice; onSubmit: (action: WorkflowAction) => void; onCancel: () => void }) {
  if (mode === 'create') return <div className="mission-form-actions"><button className="is-secondary" type="button" onClick={() => onSubmit('save_draft')}>Enregistrer brouillon</button><button className="is-secondary" type="button" onClick={() => onSubmit('confirm')}>Valider mission</button><button type="button" onClick={() => onSubmit('confirm_generate')}>Valider et générer facture</button></div>;
  const actions = getAvailableEditActions(invoice);
  return <div className="mission-form-actions"><button className="is-secondary" type="button" onClick={onCancel}>Annuler</button>{actions.map((definition) => <button key={definition.action} className={definition.primary ? '' : 'is-secondary'} type="button" onClick={() => onSubmit(definition.action)}>{definition.label}</button>)}</div>;
}
