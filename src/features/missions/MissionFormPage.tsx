import { useEffect, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type SetStateAction, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  alpha,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  useTheme,
  SvgIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { NotFoundState } from '../../components/NotFoundState';
import { useNotifications } from '../../components/NotificationSystem';
import { createId } from '../../services/ids';
import { createInvoiceFromMission } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { 
  calculateDayHours,
  createDay,
  daysBetween,
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
import { actTypeCatalog, getActTypeDefinition } from '../../services/actTypes';
import { invoiceForMission, invoiceMissionIds } from '../../services/businessRules';
import { getAvailableEditActions, getInvoiceEditImpact, type MissionEditAction } from '../../services/missionEditRules';
import type { AuditTrailInput } from '../../services/auditTrail';
import { setAppStateAsync, updateAppState, useAppState } from '../../storage/localStore';
import type { AppState, ExpenseReceipt, Invoice, Mission, MissionExpense, MissionStatus, Pharmacien, Pharmacie, PharmacyWeeklySchedule } from '../../storage/schema';
import { findInvoice, missionInvoice, pharmacieDisplayName } from '../../storage/selectors';
import './MissionFormPage.css';
import { MissionSummaryPanel } from './components/MissionSummaryPanel';
import { getPlatform } from '../../services/platformService';
import { PharmacieFormModal } from '../pharmacies/PharmacieFormModal';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import { downloadInvoicePdf } from '../../services/downloadInvoicePdf';
import { logMappedError, mapError } from '../../services/errorMapper';
import { formatPharmacyScheduleForDate, getPharmacyFranchiseLabel, getPharmacyScheduleForDate } from '../../services/pharmacyMetadata';

type MissionExpenseFormValue = MissionExpense;
type WorkflowAction = 'save_draft' | 'confirm' | MissionEditAction;

const missionTypes = actTypeCatalog.map((actType) => ({ value: actType.value, label: actType.label }));

function normalizeSearchText(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function pharmacyContextFranchiseLabel(pharmacie?: Pharmacie): string {
  const label = getPharmacyFranchiseLabel(pharmacie);
  return !label || label === 'Non renseignée' ? 'Bannière non renseignée' : label;
}

function pharmacyContextAddress(pharmacie?: Pharmacie): string {
  return addressOf(pharmacie) || 'Adresse non renseignée';
}

function compareOptionalDateDesc(left?: string, right?: string): number {
  const leftTime = left ? Date.parse(left) : 0;
  const rightTime = right ? Date.parse(right) : 0;
  return rightTime - leftTime;
}

function sortPharmaciesForPicker(pharmacies: Pharmacie[]): Pharmacie[] {
  return [...pharmacies].sort((left, right) => {
    if (Boolean(left.isFavorite) !== Boolean(right.isFavorite)) {
      return left.isFavorite ? -1 : 1;
    }

    if (left.isFavorite && right.isFavorite && left.favoriteRank !== right.favoriteRank) {
      if (left.favoriteRank === undefined) return 1;
      if (right.favoriteRank === undefined) return -1;
      return left.favoriteRank - right.favoriteRank;
    }

    const recentCompare = compareOptionalDateDesc(left.lastUsedAt, right.lastUsedAt);
    if (recentCompare !== 0) return recentCompare;

    return pharmacieDisplayName(left).localeCompare(pharmacieDisplayName(right), 'fr', { sensitivity: 'base' });
  });
}

function searchPharmacies(pharmacies: Pharmacie[], query: string): Pharmacie[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return pharmacies;

  return pharmacies.filter((pharmacie) => {
    const searchable = [
      pharmacieDisplayName(pharmacie),
      pharmacyContextFranchiseLabel(pharmacie),
      pharmacie.adresse,
      pharmacie.ville,
      pharmacie.codePostal,
      pharmacie.notes,
    ].map(normalizeSearchText).join(' ');

    return searchable.includes(normalizedQuery);
  });
}

function searchPharmaciens(pharmaciens: Pharmacien[], query: string): Pharmacien[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return pharmaciens;

  return pharmaciens.filter((pharmacien) => {
    const searchable = [
      pharmacien.nom,
      pharmacien.adresse,
      pharmacien.ville,
      pharmacien.codePostal,
      pharmacien.email,
      pharmacien.telephone,
      pharmacien.opqLicenseNumber,
    ].map(normalizeSearchText).join(' ');

    return searchable.includes(normalizedQuery);
  });
}

function selectedDatesFromPeriod(values: Pick<MissionFormValues, 'dateDebut' | 'dateFin' | 'isMultiDay' | 'excludedDates'>): string[] {
  const end = values.isMultiDay ? values.dateFin : values.dateDebut;
  const excluded = new Set(values.excludedDates ?? []);
  return daysBetween(values.dateDebut, end || values.dateDebut).filter((date) => !excluded.has(date));
}

function buildPeriodFromSelectedDates(current: MissionFormValues, selectedDates: string[]): MissionFormValues {
  const sorted = [...new Set(selectedDates)].sort();
  const fallback = current.dateDebut || new Date().toISOString().slice(0, 10);
  const first = sorted[0] ?? fallback;
  const last = sorted.at(-1) ?? first;
  const allRangeDates = daysBetween(first, last);
  return {
    ...current,
    dateDebut: first,
    dateFin: last,
    isMultiDay: first !== last,
    excludedDates: allRangeDates.filter((date) => !sorted.includes(date)),
  };
}

function buildMissionValuesFromSelectedDates(
  current: MissionFormValues,
  selectedDates: string[],
  pharmacyWeeklySchedule?: PharmacyWeeklySchedule,
  restoredDay?: MissionDayFormValue,
): MissionFormValues {
  const sorted = [...new Set(selectedDates)].sort();
  if (!sorted.length) return current;

  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const allRangeDates = daysBetween(first, last);
  const restoredByDate = restoredDay ? { [restoredDay.dateService]: restoredDay } : {};
  const days = sorted.map((date) => {
    const existingDay = current.days.find((day) => day.dateService === date) ?? restoredByDate[date];
    if (existingDay) return existingDay;

    const schedule = getPharmacyScheduleForDate(pharmacyWeeklySchedule, date);
    const dayDefaults = schedule?.enabled && schedule.startTime && schedule.endTime
      ? { ...current, defaultStartTime: schedule.startTime, defaultEndTime: schedule.endTime }
      : current;
    return createDay(date, dayDefaults, []);
  });

  return {
    ...current,
    dateDebut: first,
    dateFin: last,
    isMultiDay: first !== last,
    excludedDates: allRangeDates.filter((date) => !sorted.includes(date)),
    days,
  };
}

function formatMissionDatesSummary(values: MissionFormValues): string {
  const dates = [...new Set(values.days.map((day) => day.dateService))].sort();
  if (!dates.length) return 'Dates à choisir';
  const formatter = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  const dayFormatter = new Intl.DateTimeFormat('fr-CA', { day: 'numeric' });
  const monthYearFormatter = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' });

  if (dates.length === 1) return formatter.format(new Date(`${dates[0]}T00:00:00`));

  const first = dates[0];
  const last = dates.at(-1) ?? first;
  const consecutive = daysBetween(first, last).length === dates.length;
  if (consecutive) {
    return `du ${dayFormatter.format(new Date(`${first}T00:00:00`))} au ${formatter.format(new Date(`${last}T00:00:00`))}`;
  }

  const sameMonth = dates.every((date) => date.slice(0, 7) === first.slice(0, 7));
  if (dates.length <= 4 && sameMonth) {
    const parts = dates.map((date) => dayFormatter.format(new Date(`${date}T00:00:00`)));
    const lastPart = parts.pop();
    return `${parts.join(', ')}${parts.length ? ' et ' : ''}${lastPart} ${monthYearFormatter.format(new Date(`${first}T00:00:00`))}`;
  }

  return `${dates.length} jours sélectionnés`;
}

function monthLabel(dateIso: string): string {
  return new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(new Date(`${dateIso}T00:00:00`));
}

function addMonthsIso(dateIso: string, offset: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setMonth(date.getMonth() + offset, 1);
  return date.toISOString().slice(0, 10);
}

function calendarDaysForMonth(monthIso: string): Array<{ date: string; dayNumber: number } | null> {
  const base = new Date(`${monthIso.slice(0, 7)}-01T00:00:00`);
  const firstWeekdayIndex = (base.getDay() + 6) % 7;
  const nextMonth = new Date(base);
  nextMonth.setMonth(base.getMonth() + 1, 1);
  const daysInMonth = Math.round((nextMonth.getTime() - base.getTime()) / 86_400_000);
  return [
    ...Array.from({ length: firstWeekdayIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const dayNumber = index + 1;
      const date = `${monthIso.slice(0, 7)}-${String(dayNumber).padStart(2, '0')}`;
      return { date, dayNumber };
    }),
  ];
}

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
      sx={sx}
    />
  );
}

function EditRoundedIcon() {
  return (
    <SvgIcon fontSize="small">
      <path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1q-.15.15-.15.36M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
    </SvgIcon>
  );
}

function FormSelectField({ label, value, options, onChange, sx }: { 
  label: string; 
  value: string; 
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  sx?: object;
}) {
  const labelId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-label`;
  const readableSelectSx = {
    '& .MuiSelect-select': {
      overflow: 'visible',
      textOverflow: 'clip',
      whiteSpace: 'normal',
    },
  };
  return (
    <FormControl
      fullWidth
      size="small"
      sx={sx ? [sx, readableSelectSx] : readableSelectSx}
    >
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        label={label}
        variant="outlined"
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
    <Box className={`mission-summary-line${strong ? ' is-strong' : ''}`}>
      <Typography variant="caption" color="text.secondary">
        {label} :
      </Typography>
      <Typography variant="body2">
        {value}
      </Typography>
    </Box>
  );
}

function formatHoursFr(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function formatDateFr(value: string): string {
  if (!value) return 'Date à choisir';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getMissionChecks(values: MissionFormValues): string[] {
  const checks: string[] = [];
  const totalMinutes = minutesFromTime(values.defaultEndTime) - minutesFromTime(values.defaultStartTime);
  if (!values.pharmacieId) checks.push('Pharmacie manquante');
  if (totalMinutes <= 0) checks.push('Horaire incomplet');
  if (values.defaultUnpaidBreakMinutes > totalMinutes) checks.push('Pause à vérifier');
  if (values.tauxHoraire <= 0) checks.push('Taux horaire manquant');
  if (values.distanceReferenceKm <= 0) checks.push('Distance non calculée');
  return checks;
}

export function MissionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const state = useAppState();
  const { notify } = useNotifications();
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
    changePharmacien,
    changePharmacie,
    buildMissionFromForm,
  } = useMissionForm(mode, missionId);

  const invoice = existing ? findInvoice(state, existing.invoiceId) ?? missionInvoice(state, existing) : undefined;
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [pharmacistPickerOpen, setPharmacistPickerOpen] = useState(false);
  const [pharmacyPickerOpen, setPharmacyPickerOpen] = useState(false);
  const [pharmacieModalOpen, setPharmacieModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<WorkflowAction | null>(null);
  const preview = useMissionFinancialPreview(values);
  const returnPath = mode === 'edit' && existing ? `/missions?selected=${existing.id}` : '/missions';
  const missionChecks = getMissionChecks(values);

  const markPharmacyUsed = useCallback((pharmacieId: string, timestamp = new Date().toISOString()) => {
    updateAppState((current) => ({
      ...current,
      pharmacies: current.pharmacies.map((item) =>
        item.id === pharmacieId ? { ...item, lastUsedAt: timestamp } : item,
      ),
    }));
  }, []);

  const handleSelectPharmacy = useCallback((pharmacieId: string) => {
    changePharmacie(pharmacieId);
    markPharmacyUsed(pharmacieId);
    setPharmacyPickerOpen(false);
  }, [changePharmacie, markPharmacyUsed]);

  const handleSelectPharmacist = useCallback((pharmacienId: string) => {
    changePharmacien(pharmacienId);
    setPharmacistPickerOpen(false);
  }, [changePharmacien]);

  const handleToggleFavoritePharmacy = useCallback((pharmacieId: string) => {
    updateAppState((current) => {
      const favoriteRanks = current.pharmacies
        .map((item) => item.favoriteRank)
        .filter((rank): rank is number => typeof rank === 'number');
      const nextRank = favoriteRanks.length ? Math.max(...favoriteRanks) + 1 : 1;

      return {
        ...current,
        pharmacies: current.pharmacies.map((item) => {
          if (item.id !== pharmacieId) return item;
          const nextFavorite = !item.isFavorite;
          return {
            ...item,
            isFavorite: nextFavorite,
            favoriteRank: nextFavorite ? item.favoriteRank ?? nextRank : item.favoriteRank,
          };
        }),
      };
    });
  }, []);

  const handleCreatedPharmacy = useCallback((createdPharmacie: Pharmacie) => {
    setValues((current) => {
      const pharmacyDaySchedule = getPharmacyScheduleForDate(createdPharmacie.weeklySchedule, current.dateDebut);
      return regenerateDays({
        ...current,
        pharmacieId: createdPharmacie.id,
        distanceReferenceKm: 0,
        defaultStartTime: pharmacyDaySchedule?.enabled ? pharmacyDaySchedule.startTime ?? current.defaultStartTime : current.defaultStartTime,
        defaultEndTime: pharmacyDaySchedule?.enabled ? pharmacyDaySchedule.endTime ?? current.defaultEndTime : current.defaultEndTime,
      });
    });
    markPharmacyUsed(createdPharmacie.id);
    setPharmacieModalOpen(false);
    setPharmacyPickerOpen(false);
  }, [markPharmacyUsed, regenerateDays, setValues]);

  useEffect(() => {
    setValues((current) => regenerateDays(current));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(action: WorkflowAction) {
    const mission = buildMissionFromForm(values, existing);
    const status: MissionStatus = action === 'save_draft'
      ? 'DRAFT'
      : action === 'confirm'
        ? 'CONFIRMED'
      : mission.status;
    const finalMission = { ...mission, status };
    let regeneratedInvoice: Invoice | undefined;

    setSubmittingAction(action);
    try {
      const nextState = buildNextMissionState({
        current: state,
        mode,
        existing,
        action,
        finalMission,
        pendingReceipts,
      });
      regeneratedInvoice = nextState.regeneratedInvoice;

      await setAppStateAsync(nextState.state, buildMissionAuditInput({
        mode,
        action,
        mission: finalMission,
        existing,
        invoice,
        regeneratedInvoice,
      }));

      if (action === 'save_regenerate' && regeneratedInvoice) {
        const result = await downloadInvoicePdf(regeneratedInvoice, nextState.state);
        if (result.status === 'downloaded') {
          notify({ severity: 'success', message: 'Facture rééditée et PDF généré.' });
        } else if (result.status === 'cancelled') {
          notify({ severity: 'info', message: 'Facture rééditée. Téléchargement annulé.' });
        } else {
          throw result.error;
        }
      }

      if (fromOnboarding) {
        navigate('/welcome');
      } else if (mode === 'create' && action === 'confirm') {
        navigate(`/missions/${finalMission.id}/invoice`);
      } else {
        navigate(`/missions?selected=${finalMission.id}`);
      }
    } catch (error) {
      const mapped = mapError(error, { code: 'PDF_GENERATION_FAILED' });
      logMappedError(mapped, error);
      notify({
        severity: mapped.severity,
        message: action === 'save_regenerate' ? 'Facture rééditée, mais le PDF n’a pas pu être généré.' : mapped.message,
        persist: action === 'save_regenerate' || mapped.severity === 'error',
      });
    } finally {
      setSubmittingAction(null);
    }
  }

  if (mode === 'edit' && missionId && !existing) {
    return (
      <NotFoundState
        title="Mission introuvable"
        description="La mission demandée n’existe plus dans le stockage local."
        actionLabel="Retour aux missions"
        actionTo="/missions"
      />
    );
  }

  return <main className="mission-form-page">
    <PageHeader
      eyebrow="Missions"
      title={mode === 'edit' ? 'Modifier mission' : 'Nouvelle mission'}
      backTo={returnPath}
      backLabel="Missions"
      data-testid="mission-form-back-button"
      sx={(theme) => ({
        borderRadius: 10,
        minHeight: 70,
        px: { xs: 2, md: 2.5 },
        py: { xs: 0.75, md: 1 },
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
            : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        '& > .MuiStack-root': {
          gap: 0.75,
        },
        '& .MuiTypography-overline': {
          color: alpha(theme.palette.common.white, 0.78),
          fontWeight: 800,
          letterSpacing: '0.12em',
        },
        '& .MuiTypography-h1': {
          fontSize: { xs: '1.42rem', md: '1.72rem' },
          lineHeight: 1.05,
        },
        '& .MuiButtonBase-root': {
          borderRadius: 1.5,
        },
      })}
    />
    {mode === 'edit' ? <MissionWarning invoice={invoice} /> : null}
    <div className="mission-form-workspace">
      <div className="mission-form-main-column" aria-label="Parcours de création de mission">
        <MissionContextCard
          values={values}
          pharmacist={pharmacien}
          pharmacy={pharmacie}
          onOpenPharmacistPicker={() => setPharmacistPickerOpen(true)}
          onOpenPharmacyPicker={() => setPharmacyPickerOpen(true)}
          onSetValues={setValues}
          regenerateDays={regenerateDays}
        />
        <MissionCoreCard
          values={values}
          pharmacyWeeklySchedule={pharmacie?.weeklySchedule}
          onSetActType={(value) => setField('actType', value)}
          onSetValues={setValues}
        />
        <MissionScheduleCard
          values={values}
          onSetValues={setValues}
          regenerateDays={regenerateDays}
        />
        <MissionDaysFeesNotesSection
          values={values}
          receipts={[...state.expenseReceipts, ...pendingReceipts]}
          openDayId={openDayId}
          setOpenDayId={setOpenDayId}
          updateDay={updateDay}
          addExpense={addExpense}
          addTypedExpense={addTypedExpense}
          updateExpense={updateExpense}
          removeExpense={removeExpense}
          addReceipt={addReceipt}
          deleteReceipt={deleteReceipt}
          showNotes={showNotes}
          onShowNotes={() => setShowNotes(true)}
          onChangeNotes={(value) => setField('notes', value)}
        />
      </div>
      <MissionLiveSidebar
        mode={mode}
        invoice={invoice}
        values={values}
        pharmacy={pharmacie}
        preview={preview}
        checks={missionChecks}
        submittingAction={submittingAction}
        onSubmit={submit}
        onCancel={() => navigate(returnPath)}
      />
    </div>

    <PharmacistPickerModal
      open={pharmacistPickerOpen}
      pharmacists={state.pharmaciens}
      selectedPharmacistId={values.pharmacienId}
      onSelect={handleSelectPharmacist}
      onClose={() => setPharmacistPickerOpen(false)}
      onCreateNew={() => navigate('/pharmacien/new')}
    />

    <PharmacyPickerModal
      open={pharmacyPickerOpen}
      pharmacies={state.pharmacies}
      selectedPharmacyId={values.pharmacieId}
      missionDate={values.dateDebut}
      onSelect={handleSelectPharmacy}
      onToggleFavorite={handleToggleFavoritePharmacy}
      onClose={() => setPharmacyPickerOpen(false)}
      onCreateNew={() => {
        setPharmacyPickerOpen(false);
        setPharmacieModalOpen(true);
      }}
    />
    
    <PharmacieFormModal
      open={pharmacieModalOpen}
      onClose={() => setPharmacieModalOpen(false)}
      pharmacieId={undefined}
      onSaved={handleCreatedPharmacy}
    />
  </main>;
}

export function buildNextMissionState({
  current,
  mode,
  existing,
  action,
  finalMission,
  pendingReceipts,
}: {
  current: AppState;
  mode: 'create' | 'edit';
  existing?: Mission;
  action: WorkflowAction;
  finalMission: Mission;
  pendingReceipts: ExpenseReceipt[];
}): { state: AppState; regeneratedInvoice?: Invoice } {
  const currentInvoice = mode === 'edit'
    ? current.invoices.find((item) =>
        item.id === finalMission.invoiceId ||
        item.id === existing?.invoiceId ||
        invoiceMissionIds(item).includes(finalMission.id)
      )
    : undefined;
  let invoices = current.invoices;
  let missionToStore = finalMission;
  let regeneratedInvoice: Invoice | undefined;

  if (mode === 'edit' && currentInvoice && action === 'save_regenerate') {
    const invoiceMissions = invoiceMissionIds(currentInvoice)
      .map((missionId) => (missionId === finalMission.id ? finalMission : current.missions.find((mission) => mission.id === missionId)))
      .filter((mission): mission is Mission => Boolean(mission));
    const missionsForTotal = invoiceMissions.length ? invoiceMissions : [finalMission];
    regeneratedInvoice = {
      ...currentInvoice,
      hours: Math.round(missionsForTotal.reduce((sum, mission) => sum + mission.totalHours, 0) * 100) / 100,
      amountCents: missionsForTotal.reduce((sum, mission) => sum + mission.totalCents, 0),
      pharmacieId: finalMission.pharmacieId,
      pharmacienId: finalMission.pharmacienId,
      missionIds: invoiceMissionIds(currentInvoice).length ? invoiceMissionIds(currentInvoice) : [finalMission.id],
      missionId: currentInvoice.missionId ?? finalMission.id,
    };
    invoices = invoices.map((item) => (item.id === currentInvoice.id ? regeneratedInvoice! : item));
    missionToStore = {
      ...finalMission,
      invoiceId: currentInvoice.id,
      events: [
        ...finalMission.events,
        {
          id: createId('evt'),
          eventType: 'INVOICE_UPDATED',
          label: `Facture ${currentInvoice.numero} rééditée`,
          eventDate: new Date().toISOString(),
        },
      ],
    };
  } else if (mode === 'edit' && currentInvoice && action === 'create_corrected_version') {
    regeneratedInvoice = createInvoiceFromMission(finalMission, current);
    invoices = [...invoices, regeneratedInvoice];
    missionToStore = {
      ...finalMission,
      invoiceId: regeneratedInvoice.id,
      events: [
        ...finalMission.events,
        {
          id: createId('evt'),
          eventType: 'INVOICE_UPDATED',
          label: `Version corrigée ${regeneratedInvoice.numero} créée`,
          eventDate: new Date().toISOString(),
        },
      ],
    };
    regeneratedInvoice = {
      ...regeneratedInvoice,
      correctedFromInvoiceId: currentInvoice.id,
    };
    invoices = invoices.map((item) =>
      item.id === regeneratedInvoice!.id ? regeneratedInvoice! : item,
    );
  }

  const receiptsToStore = pendingReceipts.map((receipt) => ({
    ...receipt,
    missionId: missionToStore.id,
    storageUrl: receipt.storageUrl.replace('receipts/draft/', `receipts/${missionToStore.id}/`),
  }));

  return {
    state: {
      ...current,
      missions: mode === 'edit'
        ? current.missions.map((item) => (item.id === existing?.id ? missionToStore : item))
        : [...current.missions, missionToStore],
      invoices,
      expenseReceipts: [
        ...current.expenseReceipts.filter((receipt) => !receiptsToStore.some((item) => item.id === receipt.id)),
        ...receiptsToStore,
      ],
    },
    regeneratedInvoice,
  };
}

function buildMissionAuditInput({
  mode,
  action,
  mission,
  existing,
  invoice,
  regeneratedInvoice,
}: {
  mode: 'create' | 'edit';
  action: WorkflowAction;
  mission: Mission;
  existing?: Mission;
  invoice?: Invoice;
  regeneratedInvoice?: Invoice;
}): AuditTrailInput | null {
  if (mode !== 'edit' || !existing || !invoice) return null;

  if (action === 'save_regenerate' && regeneratedInvoice) {
    return {
      eventType: 'STATE_UPDATED',
      scope: 'invoices',
      label: `Facture ${invoice.numero} rééditée`,
      detail: `${existing.missionCode} a été corrigée et le PDF de ${regeneratedInvoice.numero} doit être transmis au client.`,
    };
  }

  if (action === 'create_corrected_version' && regeneratedInvoice) {
    return {
      eventType: 'STATE_UPDATED',
      scope: 'invoices',
      label: `Version corrigée créée pour ${invoice.numero}`,
      detail: `${existing.missionCode} a généré la nouvelle facture ${regeneratedInvoice.numero} sans modifier le document d'origine.`,
    };
  }

  if (action === 'save_internal') {
    return {
      eventType: 'STATE_UPDATED',
      scope: 'missions',
      label: `Correction interne enregistrée pour ${existing.missionCode}`,
      detail: invoice.status === 'PAID' || invoice.status === 'ARCHIVED'
        ? `La mission a été mise à jour sans toucher à la facture ${invoice.numero}.`
        : `La mission a été mise à jour avec la facture ${invoice.numero} conservée.`,
    };
  }

  return {
    eventType: 'STATE_UPDATED',
    scope: invoice.status === 'PAID' || invoice.status === 'ARCHIVED' ? 'invoices' : 'missions',
    label: `Mission ${mission.missionCode} mise à jour`,
    detail: invoice.status === 'SENT'
      ? `La mission a été sauvegardée et la facture ${invoice.numero} devra être rééditée si nécessaire.`
      : `La mission a été sauvegardée.`,
  };
}

function MissionContextCard({
  values,
  pharmacist,
  pharmacy,
  onOpenPharmacistPicker,
  onOpenPharmacyPicker,
  onSetValues,
  regenerateDays,
}: {
  values: MissionFormValues;
  pharmacist?: Pharmacien;
  pharmacy?: Pharmacie;
  onOpenPharmacistPicker: () => void;
  onOpenPharmacyPicker: () => void;
  onSetValues: Dispatch<SetStateAction<MissionFormValues>>;
  regenerateDays: (values?: MissionFormValues) => MissionFormValues;
}) {
  return (
    <section className="mission-form-card">
      <div className="mission-section-title">
        <h2>1. Contexte</h2>
      </div>
      <div className="mission-form-fields">
        <PharmacistContextSummary
          pharmacist={pharmacist}
          onOpenPicker={onOpenPharmacistPicker}
        />
        <PharmacyContextSummary
          pharmacy={pharmacy}
          missionDate={values.dateDebut}
          onOpenPicker={onOpenPharmacyPicker}
        />
        {!values.pharmacieId ? <div className="mission-field-warning">Sélectionnez une pharmacie pour créer la mission.</div> : null}
        <FormField
          label="Taux horaire ($ / h)"
          type="number"
          value={String(values.tauxHoraire)}
          onChange={(value) => onSetValues((current) => regenerateDays({ ...current, tauxHoraire: parseMoney(value) }))}
          sx={{ gridColumn: { xs: '1 / -1', md: 'span 2' } }}
        />
      </div>
    </section>
  );
}

function PharmacistContextSummary({
  pharmacist,
  onOpenPicker,
}: {
  pharmacist?: Pharmacien;
  onOpenPicker: () => void;
}) {
  const address = pharmacist ? addressOf(pharmacist) || 'Adresse de départ non renseignée' : 'Aucun pharmacien sélectionné';
  return (
    <button
      className="mission-person-summary"
      type="button"
      onClick={onOpenPicker}
      aria-label={`Choisir le pharmacien${pharmacist ? `, ${pharmacist.nom}` : ''}`}
    >
      <span className="mission-pharmacy-label">Pharmacien</span>
      <strong>{pharmacist?.nom ?? 'Choisir un pharmacien'}</strong>
      <small>{address}</small>
    </button>
  );
}

function PharmacistPickerModal({
  open,
  pharmacists,
  selectedPharmacistId,
  onSelect,
  onClose,
  onCreateNew,
}: {
  open: boolean;
  pharmacists: Pharmacien[];
  selectedPharmacistId?: string;
  onSelect: (pharmacistId: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = searchPharmaciens(
    [...pharmacists].sort((left, right) => left.nom.localeCompare(right.nom, 'fr', { sensitivity: 'base' })),
    query,
  );

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="pharmacist-picker-title"
      data-testid="pharmacist-picker-modal"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle id="pharmacist-picker-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 750 }}>Choisir un pharmacien</Typography>
        <Button color="inherit" size="small" onClick={onClose}>Fermer</Button>
      </DialogTitle>
      <DialogContent className="pharmacy-picker-content">
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Recherche"
          placeholder="Rechercher un pharmacien, une adresse..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {!pharmacists.length ? (
          <div className="pharmacy-picker-empty">
            <strong>Aucun pharmacien enregistré.</strong>
            <p>Ajoutez un pharmacien pour créer une mission.</p>
          </div>
        ) : !filtered.length ? (
          <div className="pharmacy-picker-empty">
            <strong>Aucun pharmacien ne correspond à cette recherche.</strong>
          </div>
        ) : (
          <div className="pharmacy-picker-list">
            {filtered.map((pharmacist) => (
              <button
                key={pharmacist.id}
                className={`pharmacist-picker-card${pharmacist.id === selectedPharmacistId ? ' is-selected' : ''}`}
                type="button"
                onClick={() => onSelect(pharmacist.id)}
              >
                <strong>{pharmacist.nom}</strong>
                <span>{addressOf(pharmacist) || 'Adresse de départ non renseignée'}</span>
                {pharmacist.id === selectedPharmacistId ? <small>Actuel</small> : null}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
        <Button variant="text" startIcon={<AddRoundedIcon />} onClick={onCreateNew}>
          Ajouter un pharmacien
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PharmacyContextSummary({
  pharmacy,
  missionDate,
  onOpenPicker,
}: {
  pharmacy?: Pharmacie;
  missionDate: string;
  onOpenPicker: () => void;
}) {
  if (!pharmacy) {
    return (
      <button className="mission-pharmacy-summary mission-pharmacy-summary--empty" type="button" onClick={onOpenPicker}>
        <div>
          <span className="mission-pharmacy-label">Pharmacie</span>
          <p>Aucune pharmacie sélectionnée.</p>
          <small>Sélectionnez une pharmacie pour afficher la bannière, l’horaire et l’adresse.</small>
        </div>
        <span className="mission-pharmacy-change">Choisir une pharmacie</span>
      </button>
    );
  }

  const franchiseLabel = pharmacyContextFranchiseLabel(pharmacy);
  const daySchedule = formatPharmacyScheduleForDate(pharmacy.weeklySchedule, missionDate);
  const address = pharmacyContextAddress(pharmacy);

  return (
    <button className="mission-pharmacy-summary" type="button" onClick={onOpenPicker} aria-label={`Changer de pharmacie, ${pharmacieDisplayName(pharmacy)}`}>
      <div className="mission-pharmacy-summary-main">
        <div>
          <span className="mission-pharmacy-label">Pharmacie</span>
          <div className="mission-pharmacy-name-row">
            <strong>{pharmacieDisplayName(pharmacy)}</strong>
            {pharmacy.isFavorite ? <span className="mission-pharmacy-favorite"><StarRoundedIcon fontSize="inherit" /> Favorite</span> : null}
          </div>
        </div>
        <span className="mission-pharmacy-change">Changer</span>
      </div>
      <div className="mission-pharmacy-meta">
        <span>🏷 {franchiseLabel}</span>
        <span>🕘 {daySchedule}</span>
      </div>
      <p className="mission-pharmacy-address">📍 {address}</p>
    </button>
  );
}

function PharmacyPickerModal({
  open,
  pharmacies,
  selectedPharmacyId,
  missionDate,
  onSelect,
  onToggleFavorite,
  onClose,
  onCreateNew,
}: {
  open: boolean;
  pharmacies: Pharmacie[];
  selectedPharmacyId?: string;
  missionDate: string;
  onSelect: (pharmacyId: string) => void;
  onToggleFavorite: (pharmacyId: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
}) {
  const [query, setQuery] = useState('');
  const sorted = sortPharmaciesForPicker(pharmacies);
  const filtered = searchPharmacies(sorted, query);
  const favorites = filtered.filter((pharmacy) => pharmacy.isFavorite);
  const others = filtered.filter((pharmacy) => !pharmacy.isFavorite);
  const hasQuery = Boolean(query.trim());

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function renderPharmacyCard(pharmacy: Pharmacie) {
    const selected = pharmacy.id === selectedPharmacyId;
    const franchiseLabel = pharmacyContextFranchiseLabel(pharmacy);
    const daySchedule = formatPharmacyScheduleForDate(pharmacy.weeklySchedule, missionDate);
    const address = pharmacyContextAddress(pharmacy);

    return (
      <div
        key={pharmacy.id}
        className={`pharmacy-picker-card${selected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`Sélectionner ${pharmacieDisplayName(pharmacy)}`}
        onClick={() => onSelect(pharmacy.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(pharmacy.id);
          }
        }}
      >
        <button
          className="pharmacy-picker-favorite"
          type="button"
          aria-label={pharmacy.isFavorite ? 'Retirer des favorites' : 'Ajouter aux favorites'}
          aria-pressed={Boolean(pharmacy.isFavorite)}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(pharmacy.id);
          }}
        >
          {pharmacy.isFavorite ? <StarRoundedIcon fontSize="small" /> : <StarBorderRoundedIcon fontSize="small" />}
        </button>
        <div className="pharmacy-picker-card-body">
          <div className="pharmacy-picker-card-title">
            <strong>{pharmacieDisplayName(pharmacy)}</strong>
            {selected ? <span>Actuelle</span> : null}
          </div>
          <p>{franchiseLabel} · {daySchedule}</p>
          <small>{address}</small>
        </div>
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="pharmacy-picker-title"
      data-testid="pharmacy-picker-modal"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
          },
        },
      }}
    >
      <DialogTitle id="pharmacy-picker-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 750 }}>Choisir une pharmacie</Typography>
        <Button color="inherit" size="small" onClick={onClose}>Fermer</Button>
      </DialogTitle>
      <DialogContent className="pharmacy-picker-content">
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Recherche"
          placeholder="Rechercher une pharmacie, une bannière, une adresse..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {!pharmacies.length ? (
          <div className="pharmacy-picker-empty">
            <strong>Aucune pharmacie enregistrée.</strong>
            <p>Ajoutez une pharmacie pour créer une mission.</p>
          </div>
        ) : !filtered.length ? (
          <div className="pharmacy-picker-empty">
            <strong>Aucune pharmacie ne correspond à cette recherche.</strong>
            <p>Vous pouvez créer une nouvelle fiche pharmacie.</p>
          </div>
        ) : (
          <div className="pharmacy-picker-sections">
            {favorites.length ? (
              <section>
                <h3>Favorites</h3>
                <div className="pharmacy-picker-list">{favorites.map(renderPharmacyCard)}</div>
              </section>
            ) : null}
            {others.length ? (
              <section>
                <h3>{hasQuery || favorites.length ? 'Toutes les pharmacies' : 'Pharmacies'}</h3>
                <div className="pharmacy-picker-list">{others.map(renderPharmacyCard)}</div>
              </section>
            ) : null}
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
        <Button variant="text" startIcon={<AddRoundedIcon />} onClick={onCreateNew}>
          Ajouter une pharmacie
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MissionCoreCard({
  values,
  pharmacyWeeklySchedule,
  onSetActType,
  onSetValues,
}: {
  values: MissionFormValues;
  pharmacyWeeklySchedule?: PharmacyWeeklySchedule;
  onSetActType: (value: string) => void;
  onSetValues: Dispatch<SetStateAction<MissionFormValues>>;
}) {
  const { notify } = useNotifications();
  const [calendarMonth, setCalendarMonth] = useState(values.dateDebut);
  const selectedDates = selectedDatesFromPeriod(values);
  const selectedDateSet = new Set(selectedDates);
  const calendarDays = calendarDaysForMonth(calendarMonth);
  const selectedCountLabel = `${selectedDates.length} jour${selectedDates.length > 1 ? 's' : ''} sélectionné${selectedDates.length > 1 ? 's' : ''}`;
  const toggleSelectedDate = (date: string) => {
    const removedDay = values.days.find((day) => day.dateService === date);
    const wasSelected = selectedDateSet.has(date);
    if (wasSelected && selectedDateSet.size <= 1) return;

    const nextSelected = wasSelected
      ? selectedDates.filter((selectedDate) => selectedDate !== date)
      : [...selectedDates, date];

    onSetValues((current) => buildMissionValuesFromSelectedDates(current, nextSelected, pharmacyWeeklySchedule));

    if (wasSelected && removedDay) {
      notify({
        severity: 'info',
        message: 'Jour retiré',
        onUndo: () => {
          onSetValues((current) =>
            buildMissionValuesFromSelectedDates(
              current,
              [...selectedDatesFromPeriod(current), removedDay.dateService],
              pharmacyWeeklySchedule,
              removedDay,
            ),
          );
        },
      });
    }
  };
  const selectedClosedDays = selectedDates.filter((date) => {
    const schedule = getPharmacyScheduleForDate(pharmacyWeeklySchedule, date);
    return schedule && schedule.enabled === false;
  });

  return (
    <section className="mission-form-card">
      <div className="mission-section-title">
        <h2>2. Mission</h2>
      </div>
      <div className="mission-form-fields">
        <FormSelectField
          label="Type de mission"
          value={values.actType}
          onChange={onSetActType}
          options={missionTypes}
          sx={{ gridColumn: { xs: '1 / -1', md: 'span 2' } }}
        />
        <div className="mission-period-box">
          <div className="mission-subsection-heading">
            <strong>Période de mission</strong>
          </div>
          <div className="mission-calendar-picker" aria-label="Calendrier de sélection des jours travaillés">
            <div className="mission-calendar-header">
              <button className="mission-small-button" type="button" onClick={() => setCalendarMonth((current) => addMonthsIso(current, -1))}>←</button>
              <strong>{monthLabel(calendarMonth)}</strong>
              <button className="mission-small-button" type="button" onClick={() => setCalendarMonth((current) => addMonthsIso(current, 1))}>→</button>
            </div>
            <div className="mission-calendar-grid" aria-hidden="true">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="mission-calendar-grid">
              {calendarDays.map((day, index) => day ? (
                <button
                  key={day.date}
                  type="button"
                  className={`mission-calendar-day${selectedDateSet.has(day.date) ? ' is-selected' : ''}`}
                  aria-pressed={selectedDateSet.has(day.date)}
                  aria-label={`${selectedDateSet.has(day.date) ? 'Désélectionner' : 'Sélectionner'} le ${day.date}`}
                  onClick={() => toggleSelectedDate(day.date)}
                >
                  {day.dayNumber}
                </button>
              ) : <span key={`blank-${index}`} className="mission-calendar-empty" />)}
            </div>
          </div>
          <div className="mission-period-actions">
            <span>{selectedCountLabel}</span>
            {selectedClosedDays.length ? <span className="mission-period-warning">Pharmacie indiquée fermée ce jour</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MissionScheduleCard({
  values,
  onSetValues,
  regenerateDays,
}: {
  values: MissionFormValues;
  onSetValues: Dispatch<SetStateAction<MissionFormValues>>;
  regenerateDays: (values?: MissionFormValues) => MissionFormValues;
}) {
  const paidHours = calculateDayHours(values.defaultStartTime, values.defaultEndTime, values.defaultUnpaidBreakMinutes);
  const totalMinutes = minutesFromTime(values.defaultEndTime) - minutesFromTime(values.defaultStartTime);
  const scheduleError = totalMinutes <= 0
    ? 'L’heure de fin doit être après l’heure de début.'
    : values.defaultUnpaidBreakMinutes > totalMinutes
      ? 'La pause ne peut pas dépasser la durée de la mission.'
      : undefined;

  return (
    <section className="mission-form-card">
      <div className="mission-section-title">
        <h2>3. Horaire</h2>
      </div>
      <div className="mission-schedule-summary">
        {values.defaultStartTime} → {values.defaultEndTime} · pause {values.defaultUnpaidBreakMinutes} min · {formatHoursFr(paidHours)} h payées
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
          label="Pause"
          type="number"
          value={String(values.defaultUnpaidBreakMinutes)}
          onChange={(value) => onSetValues((current) => regenerateDays({
            ...current,
            defaultUnpaidBreakMinutes: Number(value) || 0,
          }))}
        />
        {scheduleError ? <div className="mission-field-warning">{scheduleError}</div> : null}
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
  const theme = useTheme();

  return (
    <section className="mission-form-card mission-notes-card">
      <div className="mission-section-title">
        <span>Frais et notes</span>
        <h2>Notes</h2>
      </div>
      {notes && !showNotes ? (
        <div className="mission-note-preview">
          <p>{notes.length > 140 ? `${notes.slice(0, 140)}…` : notes}</p>
          <Button variant="outlined" size="small" onClick={onShowNotes} startIcon={<EditRoundedIcon />} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
            Modifier
          </Button>
        </div>
      ) : showNotes ? (
        <div className="mission-form-fields">
          <TextField
            multiline
            rows={2}
            value={notes}
            onChange={(event) => onChangeNotes(event.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            sx={{ gridColumn: '1 / -1' }}
            placeholder="Ajoutez des notes..."
          />
        </div>
      ) : (
        <Button variant="outlined" size="small" onClick={onShowNotes} startIcon={<EditRoundedIcon />} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
          Ajouter une note
        </Button>
      )}
    </section>
  );
}

function MissionDaysFeesNotesSection({
  values,
  receipts,
  openDayId,
  setOpenDayId,
  updateDay,
  addExpense,
  addTypedExpense,
  updateExpense,
  removeExpense,
  addReceipt,
  deleteReceipt,
  showNotes,
  onShowNotes,
  onChangeNotes,
}: {
  values: MissionFormValues;
  receipts: ExpenseReceipt[];
  openDayId: string | null;
  setOpenDayId: (id: string | null) => void;
  updateDay: (id: string, patch: Partial<MissionDayFormValue>) => void;
  addExpense: (dayId: string, type: ExpenseType) => void;
  addTypedExpense: (dayId: string, typeKey: string) => void;
  updateExpense: (dayId: string, expense: MissionExpenseFormValue) => void;
  removeExpense: (dayId: string, feeId: string) => void;
  addReceipt: (dayId: string, expenseId: string, file: File) => string | null;
  deleteReceipt: (receiptId: string) => void;
  showNotes: boolean;
  onShowNotes: () => void;
  onChangeNotes: (value: string) => void;
}) {
  const theme = useTheme();
  const notes = values.notes;

  return (
    <section className="mission-form-card">
      <div className="mission-section-title">
        <h2>4. Jours travaillés</h2>
      </div>
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
      <div className="mission-notes-inline">
        <div className="mission-subsection-heading">
          <strong>Notes</strong>
          <span>Facultatif</span>
        </div>
        {notes && !showNotes ? (
          <div className="mission-note-preview">
            <p>{notes.length > 140 ? `${notes.slice(0, 140)}…` : notes}</p>
            <Button variant="outlined" size="small" onClick={onShowNotes} startIcon={<EditRoundedIcon />} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
              Modifier
            </Button>
          </div>
        ) : showNotes ? (
          <div className="mission-form-fields">
            <TextField
              multiline
              rows={2}
              value={notes}
              onChange={(event) => onChangeNotes(event.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              sx={{ gridColumn: '1 / -1' }}
              placeholder="Ajoutez des notes..."
            />
          </div>
        ) : (
          <Button variant="outlined" size="small" onClick={onShowNotes} startIcon={<EditRoundedIcon />} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
            Ajouter une note
          </Button>
        )}
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
        <small>{day.startTime} → {day.endTime} · pause {day.unpaidBreakMinutes} min · {formatHoursFr(day.paidHours)} h payées</small>
      </div>
      {feeTotalCents > 0 ? (
        <span>{feeTypes || 'Frais'} · {formatMoney(feeTotalCents)}</span>
      ) : (
        <span className="mission-day-muted-action">+ Ajouter un frais</span>
      )}
      <span className="mission-day-edit-label">Modifier ce jour</span>
    </>
  );
}

function MissionExpensesEditor({ expenses, receipts, onAddMeal, onAddKm, onAddTyped, onUpdateExpense, onDeleteExpense, onAddReceipt, onDeleteReceipt }: { expenses: MissionExpenseFormValue[]; receipts: ExpenseReceipt[]; onAddMeal: () => void; onAddKm: () => void; onAddTyped: (typeKey: string) => void; onUpdateExpense: (expense: MissionExpenseFormValue) => void; onDeleteExpense: (expenseId: string) => void; onAddReceipt: (expenseId: string, file: File) => string | null; onDeleteReceipt: (receiptId: string) => void }) {
  const [showExpenseMenu, setShowExpenseMenu] = useState(false);
  return (
    <div className="mission-expenses-editor">
      <MissionExpensesHeader
        onToggleExpenseMenu={() => setShowExpenseMenu((value) => !value)}
      />
      {showExpenseMenu ? (
        <MissionExpenseTypeList
          onAddMeal={() => {
            onAddMeal();
            setShowExpenseMenu(false);
          }}
          onAddKm={() => {
            onAddKm();
            setShowExpenseMenu(false);
          }}
          onAddTyped={(typeKey) => {
            onAddTyped(typeKey);
            setShowExpenseMenu(false);
          }}
          onClose={() => setShowExpenseMenu(false)}
        />
      ) : null}
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
  onToggleExpenseMenu,
}: {
  onToggleExpenseMenu: () => void;
}) {
  return (
    <div className="mission-expenses-heading">
      <strong>Frais</strong>
      <div className="mission-expense-actions">
        <button className="mission-small-button" type="button" onClick={onToggleExpenseMenu}>+ Ajouter un frais</button>
      </div>
    </div>
  );
}

function MissionExpenseTypeList({ onAddMeal, onAddKm, onAddTyped, onClose }: { onAddMeal: () => void; onAddKm: () => void; onAddTyped: (typeKey: string) => void; onClose: () => void }) {
  return (
    <div className="mission-expense-type-list" role="menu" aria-label="Choisir un type de frais">
      <button className="mission-small-button" type="button" role="menuitem" onClick={onAddMeal}>Repas</button>
      <button className="mission-small-button" type="button" role="menuitem" onClick={onAddKm}>Kilométrage</button>
      {missionQuickExpenseTypes().map((type) => (
        <button
          key={type.key}
          className="mission-small-button"
          type="button"
          role="menuitem"
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
  const { notify } = useNotifications();
  useEffect(() => { function onKey(event: KeyboardEvent) { if (event.key === 'Escape') setEditing(false); } if (editing) window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [editing]);
  
  const handleExpenseDelete = useCallback(() => {
    onDelete(expense.id);
    notify({
      severity: 'info',
      message: 'Frais supprimé',
      onUndo: () => onUpdate(expense),
    });
    setEditing(false);
  }, [expense, notify, onDelete, onUpdate]);

  return (
    <>
      <MissionExpenseItem
        expense={expense}
        receiptsCount={receipts.length}
        onEdit={() => setEditing(true)}
        onDelete={handleExpenseDelete}
      />
      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby={`expense-editor-${expense.id}`}
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle id={`expense-editor-${expense.id}`}>
          Modifier le frais
        </DialogTitle>
        <DialogContent>
          <MissionExpenseEditor
            expense={expense}
            receipts={receipts}
            onSave={(next) => {
              onUpdate(next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            onDelete={handleExpenseDelete}
            onAddReceipt={onAddReceipt}
            onDeleteReceipt={onDeleteReceipt}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function MissionExpenseItem({
  expense,
  receiptsCount,
  onEdit,
  onDelete,
}: {
  expense: MissionExpenseFormValue;
  receiptsCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const amountLabel = expense.typeKey === 'MILEAGE' && expense.distanceKm
    ? `Km auto · ${String(expense.distanceKm)} km AR · ${formatMoney(expense.amountCents)}`
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
      <button className="mission-link-button mission-expense-delete" type="button" aria-label={'Supprimer ' + expense.label} onClick={onDelete}>
        <DeleteOutlineRoundedIcon fontSize="small" />
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

function MissionLiveSidebar({
  mode,
  invoice,
  values,
  pharmacy,
  preview,
  checks,
  submittingAction,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  invoice?: Invoice;
  values: MissionFormValues;
  pharmacy?: Pharmacie;
  preview: { hours: number; subtotal: number; expenses: number; total: number };
  checks: string[];
  submittingAction: WorkflowAction | null;
  onSubmit: (action: WorkflowAction) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <aside className="mission-live-sidebar" aria-label="Résumé évolutif de la mission" data-testid="mission-live-sidebar">
      <div className="mission-live-sidebar-inner">
        <MissionSummaryPanel
        pharmacyName={pharmacy ? pharmacieDisplayName(pharmacy) : 'Pharmacie non sélectionnée'}
        pharmacyAddress={pharmacy ? pharmacyContextAddress(pharmacy) : 'Adresse non renseignée'}
        dates={formatMissionDatesSummary(values)}
        daysWorked={values.days.length}
        paidHours={preview.hours}
        hourlyRateCents={Math.round(values.tauxHoraire * 100)}
        subtotalCents={Math.round(preview.subtotal * 100)}
        expensesCents={Math.round(preview.expenses * 100)}
        totalCents={Math.round(preview.total * 100)}
      />
        <MissionFormActions mode={mode} invoice={invoice} submittingAction={submittingAction} onSubmit={onSubmit} onCancel={onCancel} />
      </div>
    </aside>
  );
}

function MissionFormActions({
  mode,
  invoice,
  submittingAction,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  invoice?: Invoice;
  submittingAction: WorkflowAction | null;
  onSubmit: (action: WorkflowAction) => Promise<void>;
  onCancel: () => void;
}) {
  const isSubmitting = Boolean(submittingAction);
  if (mode === 'create') {
    return (
      <div className="mission-actions-block">
        <div className="mission-form-actions">
          <Button 
            variant="outlined" 
            type="button" 
            disabled={isSubmitting}
            onClick={() => onSubmit('save_draft')}
            title="Enregistre la mission sans la valider."
          >
            Enregistrer brouillon
          </Button>
          <Button 
            variant="contained" 
            type="button" 
            disabled={isSubmitting}
            onClick={() => onSubmit('confirm')}
            title="Valide la mission et ouvre l’étape de facturation."
            data-testid="mission-primary-submit"
          >
            Valider
          </Button>
        </div>
      </div>
    );
  }
  const actions = getAvailableEditActions(invoice);
  return (
    <div className="mission-form-actions">
      <Button 
        variant="outlined" 
        type="button" 
        disabled={isSubmitting}
        onClick={onCancel}
      >
        Annuler
      </Button>
      {actions.map((definition) => (
        <Button 
          key={definition.action} 
          variant={definition.primary ? 'contained' : 'outlined'} 
          type="button" 
          disabled={isSubmitting}
          onClick={() => onSubmit(definition.action)}
        >
          {definition.label}
        </Button>
      ))}
    </div>
  );
}
