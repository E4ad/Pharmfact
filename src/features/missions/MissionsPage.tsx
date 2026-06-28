import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded';
import {
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { borderWidth, borderRadiusScale } from '../../design-system/tokens';
import { FadeIn } from '../../components/FadeIn';
import { useNotifications } from '../../components/NotificationSystem';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { MetricCard } from '../../components/MetricCard';
import { InvoiceDraftModal } from './InvoiceDraftModal';
import { MissionDetailPanel } from './MissionDetailPanel';
import { MissionListCard, prevMissionStatus } from './MissionListCard';
import { buildMissionIcs, downloadIcs } from '../../services/calendarIcs';
import { validateReceiptFile, createLocalReceipt, uploadExpenseReceipt, removeReceiptFromState } from '../../services/expenseReceipts';
import { createId } from '../../services/ids';
import { createInvoiceFromMission, createInvoiceFromMissions, createInvoicePayment, addPaymentToInvoice, transitionInvoice } from '../../services/invoiceWorkflow';
import { missionsReadyToInvoice } from '../../services/businessRules';
import { buildMissionWindowMetrics } from '../../services/dashboardMetrics';
import { formatMoney } from '../../services/money';
import { missionStatusLabels } from '../../services/missionStatus';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { AppState, ExpenseReceipt, Invoice, InvoicePayment, InvoiceStatus, Mission, MissionExpense, MissionStatus, Pharmacie } from '../../storage/schema';
import { downloadInvoicePdf } from '../../services/downloadInvoicePdf';
import { logMappedError, mapError } from '../../services/errorMapper';
import { findInvoice, findPharmacien, findPharmacie, missionInvoice, pharmacieDisplayName } from '../../storage/selectors';
import { undoManager } from '../../services/undoManager';
import { todayIso } from '../../services/ids';

type MissionFocus = 'all' | 'upcoming7d' | 'estimated7d' | 'toInvoice' | 'toFinalize' | 'overdue';

const FOCUS_LABELS: Record<Exclude<MissionFocus, 'all'>, string> = {
  upcoming7d: 'À venir 7j',
  estimated7d: 'Estimées 7j',
  toInvoice: 'À facturer',
  toFinalize: 'Factures à finaliser',
  overdue: 'En retard',
};

type MainMissionFilter = 'ACTIVE' | 'ALL' | 'ARCHIVED' | 'CANCELLED';

const MAIN_FILTER_OPTIONS: Array<{ value: MainMissionFilter; label: string }> = [
  { value: 'ACTIVE', label: 'Actives' },
  { value: 'ALL', label: 'Toutes' },
  { value: 'ARCHIVED', label: 'Archivées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

type AdvancedMissionFilter = {
  missionStatuses: MissionStatus[];
  invoiceStages: string[];
  paymentStatuses: string[];
  pharmacieIds: string[];
};

const EMPTY_ADVANCED_FILTER: AdvancedMissionFilter = { missionStatuses: [], invoiceStages: [], paymentStatuses: [], pharmacieIds: [] };

type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

// Legacy type kept for focus filter compatibility
type MissionFilterStatus = MissionStatus | 'ACTIVE' | 'ARCHIVED_ONLY' | 'ALL' | 'ready_to_invoice' | 'invoice_draft' | 'invoice_sent' | 'paid';


function parseMissionFocus(value: string | null): MissionFocus {
  if (value === 'upcoming_7d' || value === 'upcoming7d') return 'upcoming7d';
  if (value === 'estimated_7d' || value === 'estimated7d') return 'estimated7d';
  if (value === 'to_invoice' || value === 'toInvoice') return 'toInvoice';
  if (value === 'to_finalize' || value === 'toFinalize') return 'toFinalize';
  if (value === 'overdue') return 'overdue';
  return 'all';
}

function matchesMissionFocus(
  mission: Mission,
  focus: MissionFocus,
  todayIsoValue: string,
  windowEndIso: string,
  state: AppState,
): boolean {
  if (focus === 'all') return true;
  if (focus === 'upcoming7d') {
    return mission.status !== 'ARCHIVED' && mission.status !== 'CANCELLED' && mission.dateDebut >= todayIsoValue && mission.dateDebut <= windowEndIso;
  }
  if (focus === 'estimated7d') {
    return (
      mission.status !== 'ARCHIVED' &&
      mission.status !== 'CANCELLED' &&
      mission.dateDebut <= windowEndIso &&
      mission.dateFin >= todayIsoValue &&
      (mission.status === 'CONFIRMED' || mission.status === 'IN_PROGRESS' || mission.status === 'COMPLETED')
    );
  }
  if (focus === 'toInvoice') {
    return mission.status === 'COMPLETED' && !mission.invoiceId;
  }
  if (focus === 'toFinalize') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'draft' || invoice.status === 'ready_to_send'));
  }
  if (focus === 'overdue') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    const s = invoice?.status?.toLowerCase();
    return Boolean(invoice && (s === 'sent') && invoice.dateEcheance != null && invoice.dateEcheance < todayIsoValue);
  }
  return true;
}

function matchesMainFilter(mission: Mission, filter: MainMissionFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'ACTIVE') return mission.status !== 'ARCHIVED' && mission.status !== 'CANCELLED';
  if (filter === 'ARCHIVED') return mission.status === 'ARCHIVED';
  if (filter === 'CANCELLED') return mission.status === 'CANCELLED';
  return true;
}

function matchesAdvancedFilter(mission: Mission, filter: AdvancedMissionFilter, state: AppState): boolean {
  if (filter.missionStatuses.length > 0 && !filter.missionStatuses.includes(mission.status)) return false;
  if (filter.pharmacieIds.length > 0 && !filter.pharmacieIds.includes(mission.pharmacieId)) return false;
  if (filter.invoiceStages.length > 0 || filter.paymentStatuses.length > 0) {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    if (filter.invoiceStages.length > 0) {
      const stage = deriveInvoiceStage(invoice);
      if (!filter.invoiceStages.includes(stage)) return false;
    }
    if (filter.paymentStatuses.length > 0) {
      const ps = invoice?.paymentStatus ?? 'to_collect';
      if (!filter.paymentStatuses.includes(ps)) return false;
    }
  }
  return true;
}

function deriveInvoiceStage(invoice: Invoice | undefined): string {
  if (!invoice || invoice.status === 'VOIDED' || invoice.status === 'replaced') return 'none';
  const s = invoice.status.toLowerCase();
  if (s === 'draft') return 'draft';
  if (s === 'ready_to_send' || s === 'generated') return 'ready_to_send';
  if (s === 'sent') return 'sent';
  if (s === 'paid') return 'paid';
  return 'none';
}

// Legacy filter kept for focus filter compatibility
function matchesMissionStatusFilter(mission: Mission, filter: MissionFilterStatus, state: AppState): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'ACTIVE') return mission.status !== 'ARCHIVED' && mission.status !== 'CANCELLED';
  if (filter === 'ARCHIVED_ONLY') return mission.status === 'ARCHIVED' || mission.status === 'CANCELLED';
  if (filter === 'ready_to_invoice') return mission.status === 'COMPLETED' && !mission.invoiceId;
  if (filter === 'invoice_draft') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'draft' || invoice.status === 'ready_to_send'));
  }
  if (filter === 'invoice_sent') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return Boolean(invoice && (invoice.status === 'SENT' || invoice.status === 'sent' || invoice.status === 'GENERATED'));
  }
  if (filter === 'paid') {
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    return invoice?.paymentStatus === 'paid';
  }
  return mission.status === (filter as MissionStatus);
}

export function MissionsPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('selected'));
  const [mainFilter, setMainFilter] = useState<MainMissionFilter>('ALL');
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedMissionFilter>(EMPTY_ADVANCED_FILTER);
  const [pendingFilter, setPendingFilter] = useState<AdvancedMissionFilter>(EMPTY_ADVANCED_FILTER);
  const [advancedAnchor, setAdvancedAnchor] = useState<HTMLElement | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date_desc');
  const [focusFilter, setFocusFilter] = useState<MissionFocus>(() => parseMissionFocus(searchParams.get('filter') ?? searchParams.get('focus')));
  const [friseModalMission, setFriseModalMission] = useState<Mission | null>(null);
  const [missionRevertConfirm, setMissionRevertConfirm] = useState<{ missionId: string; prevStatus: MissionStatus; invoiceWarning?: 'draft' | 'ready' } | null>(null);
  const [invoiceRevertConfirm, setInvoiceRevertConfirm] = useState<{ type: 'delete_draft' | 'revert_to_draft' | 'revert_to_ready'; missionId: string } | null>(null);
  const [pendingExpenseChange, setPendingExpenseChange] = useState<{ missionId: string; dayId: string; expense: MissionExpense } | null>(null);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const today = todayIso();
  // Legacy status filter kept for KPI focus clicks
  const [statusFilter, setStatusFilter] = useState<MissionFilterStatus>('ACTIVE');
  const missionMetrics = useMemo(() => buildMissionWindowMetrics(state, today), [state, today]);

  const draftCount = useMemo(() => state.missions.filter((m) => m.status === 'DRAFT').length, [state.missions]);
  const inProgressCount = useMemo(() => state.missions.filter((m) => m.status === 'IN_PROGRESS').length, [state.missions]);
  const toCollectCount = useMemo(
    () => state.invoices.filter((inv) => (inv.status === 'sent' || inv.status === 'SENT') && inv.paymentStatus !== 'paid').length,
    [state.invoices],
  );
  const overdueCount = useMemo(
    () => state.invoices.filter((inv) => (inv.status === 'sent' || inv.status === 'SENT') && inv.dateEcheance < today).length,
    [state.invoices, today],
  );
  const invoicesToFinalizeCount = useMemo(
    () => state.invoices.filter((inv) => inv.status === 'draft' || inv.status === 'ready_to_send').length,
    [state.invoices],
  );

  const missions = useMemo(
    () =>
      [...state.missions]
        .filter((mission) => matchesMainFilter(mission, mainFilter))
        .filter((mission) => matchesMissionStatusFilter(mission, statusFilter, state))
        .filter((mission) => matchesMissionFocus(mission, focusFilter, today, missionMetrics.windowEndIso, state))
        .filter((mission) => matchesAdvancedFilter(mission, advancedFilter, state))
        .sort((a, b) => {
          switch (sortKey) {
            case 'date_asc':    return `${a.dateDebut}${a.createdAt}`.localeCompare(`${b.dateDebut}${b.createdAt}`);
            case 'amount_desc': return (b.totalCents ?? 0) - (a.totalCents ?? 0);
            case 'amount_asc':  return (a.totalCents ?? 0) - (b.totalCents ?? 0);
            default:            return `${b.dateDebut}${b.createdAt}`.localeCompare(`${a.dateDebut}${a.createdAt}`);
          }
        }),
    [state.missions, mainFilter, statusFilter, focusFilter, advancedFilter, sortKey, today, missionMetrics.windowEndIso, state],
  );

  const uniquePharmacies = useMemo(
    () =>
      [...new Set(state.missions.map((m) => m.pharmacieId))]
        .map((id) => ({ id, pharmacie: findPharmacie(state, id) }))
        .filter((p): p is { id: string; pharmacie: NonNullable<ReturnType<typeof findPharmacie>> } => p.pharmacie != null),
    [state],
  );

  const firstMissionIdsByPharmacy = useMemo(() => {
    const firstByPharmacy = new Map<string, Mission>();
    state.missions.forEach((mission) => {
      const current = firstByPharmacy.get(mission.pharmacieId);
      if (!current || `${mission.dateDebut}${mission.createdAt}`.localeCompare(`${current.dateDebut}${current.createdAt}`) < 0) {
        firstByPharmacy.set(mission.pharmacieId, mission);
      }
    });
    return new Set([...firstByPharmacy.values()].map((mission) => mission.id));
  }, [state.missions]);

  const invoiceReadyGroups = useMemo(() => {
    const groups = new Map<string, Mission[]>();
    missionsReadyToInvoice(state).forEach((mission) => {
      groups.set(mission.pharmacieId, [...(groups.get(mission.pharmacieId) ?? []), mission]);
    });
    return [...groups.entries()].map(([pharmacieId, groupMissions]) => ({
      pharmacie: findPharmacie(state, pharmacieId),
      missions: groupMissions,
    }));
  }, [state]);

  useEffect(() => {
    document.title = 'Missions · Pharmfact';
  }, []);

  useEffect(() => {
    const selected = searchParams.get('selected');
    setSelectedId(selected);
  }, [searchParams]);

  useEffect(() => {
    setFocusFilter(parseMissionFocus(searchParams.get('filter') ?? searchParams.get('focus')));
  }, [searchParams]);

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.delete('selected');
          return next;
        });
      }
    }
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, []);

  function openMission(missionId: string) {
    setSelectedId(missionId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('selected', missionId);
      return next;
    });
  }

  function closeMission() {
    setSelectedId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('selected');
      return next;
    });
  }

  function setMissionFocus(focus: MissionFocus, kpiLabel?: string) {
    setFocusFilter(focus);
    setActiveKpi(kpiLabel ?? null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('focus');
      if (focus === 'all') next.delete('filter');
      else if (focus === 'toInvoice') next.set('filter', 'to_invoice');
      else if (focus === 'toFinalize') next.set('filter', 'to_finalize');
      else next.set('filter', focus);
      return next;
    });
  }

  function setMissionStatusFilter(filter: MissionFilterStatus) {
    setStatusFilter(filter);
    // Sync main filter to show the right scope for KPI clicks
    if (filter === 'ALL') setMainFilter('ALL');
    else if (filter === 'ARCHIVED_ONLY') setMainFilter('ARCHIVED');
    else setMainFilter('ACTIVE');
  }

  function generateInvoice(mission: Mission) {
    const currentMission = state.missions.find((item) => item.id === mission.id);
    if (!currentMission || currentMission.invoiceId) return;
    const invoice = createInvoiceFromMission(currentMission, state);

    updateAppState((current) => ({
      ...current,
      invoices: [...current.invoices, invoice],
      missions: current.missions.map((item) =>
        item.id === mission.id
          ? {
              ...item,
              invoiceId: invoice.id,
              events: [
                ...item.events,
                { id: createId('evt'), eventType: 'INVOICE_CREATED', label: `Facture ${invoice.numero} générée`, eventDate: new Date().toISOString() },
              ],
            }
          : item,
      ),
    }));

    const undoId = undoManager.add({
      description: `Supprimer la facture ${invoice.numero}`,
      undo: () => {
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.filter((item) => item.id !== invoice.id),
          missions: current.missions.map((item) => (item.id === currentMission.id ? currentMission : item)),
        }));
      },
    });

    notify({
      severity: 'success',
      message: `Facture ${invoice.numero} générée.`,
      onUndo: () => undoManager.undo(undoId),
    });
  }

  function generateGroupedInvoice(groupMissions: Mission[]) {
    if (!groupMissions.length) return;
    const invoice = createInvoiceFromMissions(groupMissions, state);
    const missionIds = new Set(groupMissions.map((mission) => mission.id));

    updateAppState((current) => ({
      ...current,
      invoices: [...current.invoices, invoice],
      missions: current.missions.map((item) =>
        missionIds.has(item.id)
          ? {
              ...item,
              invoiceId: invoice.id,
              events: [
                ...item.events,
                { id: createId('evt'), eventType: 'INVOICE_CREATED', label: `Facture ${invoice.numero} générée`, eventDate: new Date().toISOString() },
              ],
            }
          : item,
      ),
    }));

    notify({ severity: 'success', message: `Facture ${invoice.numero} générée pour ${groupMissions.length} mission(s).` });
  }

  function downloadCalendar(mission: Mission) {
    const pharmacien = findPharmacien(state, mission.pharmacienId);
    const pharmacie = findPharmacie(state, mission.pharmacieId);
    downloadIcs(`${mission.missionCode}.ics`, buildMissionIcs(mission, pharmacien, pharmacie));
    notify({ severity: 'success', message: 'Invitation calendrier téléchargée.' });
  }

  async function downloadPdf(invoiceId: string) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    try {
      const result = await downloadInvoicePdf(invoice, state);
      if (result.status === 'downloaded') {
        notify({ severity: 'success', message: 'PDF téléchargé.' });
      } else if (result.status === 'error') {
        throw result.error;
      }
    } catch (error) {
      const mapped = mapError(error, { code: 'PDF_GENERATION_FAILED' });
      logMappedError(mapped, error);
      if (mapped.shouldDisplay) {
        notify({ severity: mapped.severity, message: mapped.message, persist: mapped.severity === 'error' });
      }
    }
  }

  function toggleFavoritePharmacie(pharmacieId: string) {
    updateAppState((current) => ({
      ...current,
      pharmacies: current.pharmacies.map((item) =>
        item.id === pharmacieId ? { ...item, isFavorite: !item.isFavorite } : item,
      ),
    }));
  }

  function updateMissionStatus(missionId: string, status: MissionStatus) {
    const previous = state.missions.find((m) => m.id === missionId);
    if (!previous || previous.status === status) return;
    if (status === 'ARCHIVED') {
      const inv = findInvoice(state, previous.invoiceId) ?? missionInvoice(state, previous);
      if (!inv || inv.paymentStatus !== 'paid') {
        notify({ severity: 'warning', message: 'La mission ne peut être archivée qu\'une fois la facture entièrement encaissée.' });
        return;
      }
    }
    updateAppState((current) => ({
      ...current,
      missions: current.missions.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status,
              events: [
                ...m.events,
                { id: createId('evt'), eventType: 'STATUS_CHANGED' as const, label: `Statut changé : ${missionStatusLabels[status]}`, eventDate: new Date().toISOString() },
              ],
            }
          : m,
      ),
    }));
    const undoId = undoManager.add({
      description: `Restaurer le statut de ${previous.missionCode}`,
      undo: () => updateAppState((current) => ({ ...current, missions: current.missions.map((m) => (m.id === missionId ? previous : m)) })),
    });
    notify({ severity: 'success', message: `${previous.missionCode} → ${missionStatusLabels[status]}.`, onUndo: () => undoManager.undo(undoId) });
  }

  function savePayment(invoiceId: string, input: Omit<InvoicePayment, 'id' | 'createdAt'>) {
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const payment = createInvoicePayment(invoice, input);
    const updatedInvoice = addPaymentToInvoice(invoice, payment, invoice.amountCents);
    updateAppState((current) => ({ ...current, invoices: current.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)) }));
    notify({ severity: 'success', message: `Paiement de ${formatMoney(input.amount)} enregistré.` });
  }

  async function generatePdf(invoiceId: string): Promise<void> {
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    try {
      const result = await downloadInvoicePdf(invoice, state);
      if (result.status === 'downloaded') {
        const updated = transitionInvoice(invoice, 'ready_to_send');
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.map((inv) => (inv.id === invoiceId ? updated : inv)),
        }));
        notify({ severity: 'success', message: 'PDF généré. Facture prête à envoyer.' });
      } else if (result.status === 'error') {
        throw result.error;
      }
    } catch (error) {
      const mapped = mapError(error, { code: 'PDF_GENERATION_FAILED' });
      logMappedError(mapped, error);
      if (mapped.shouldDisplay) {
        notify({ severity: mapped.severity, message: mapped.message, persist: mapped.severity === 'error' });
      }
    }
  }

  function markInvoiceSent(invoiceId: string) {
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const updated = transitionInvoice(invoice, 'sent');
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((inv) => (inv.id === invoiceId ? updated : inv)),
    }));
    notify({ severity: 'success', message: `Facture ${invoice.numero} marquée comme envoyée.` });
  }

  function deletePayment(invoiceId: string, paymentId: string) {
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const remaining = (invoice.payments ?? []).filter((p) => p.id !== paymentId);
    const paidAmountCents = remaining.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, invoice.amountCents - paidAmountCents);
    const paymentStatus: 'to_collect' | 'partial' | 'paid' =
      paidAmountCents === 0 ? 'to_collect' : balanceDue === 0 ? 'paid' : 'partial';
    const updated = { ...invoice, payments: remaining, paidAmountCents, paymentStatus };
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((inv) => (inv.id === invoiceId ? updated : inv)),
    }));
    notify({ severity: 'success', message: 'Paiement supprimé.' });
  }

  function handleSaveExpense(missionId: string, dayId: string, expense: MissionExpense) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;

    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    const invoiceStatus = invoice?.status.toLowerCase();

    if (invoice && (invoiceStatus === 'sent' || invoiceStatus === 'paid' || invoice.status === 'SENT' || invoice.status === 'PAID')) {
      setPendingExpenseChange({ missionId, dayId, expense });
      return;
    }

    applyExpenseSave(missionId, dayId, expense, mission, invoice);
  }

  function applyExpenseSave(missionId: string, dayId: string, expense: MissionExpense, mission: Mission, invoice: Invoice | undefined) {
    const newDays = mission.days.map((day) => {
      if (day.id !== dayId) return day;
      const existingIdx = (day.expenses ?? []).findIndex((e) => e.id === expense.id);
      if (existingIdx >= 0) {
        const expenses = [...(day.expenses ?? [])];
        expenses[existingIdx] = expense;
        return { ...day, expenses };
      }
      return { ...day, expenses: [...(day.expenses ?? []), expense] };
    });

    const allNewExpenses = newDays.flatMap((d) => d.expenses ?? []);
    const newMealTotal = allNewExpenses.filter((e) => e.typeKey === 'MEAL').reduce((s, e) => s + e.amountCents, 0);
    const newMileageTotal = allNewExpenses.filter((e) => e.typeKey === 'MILEAGE').reduce((s, e) => s + e.amountCents, 0);
    const newExpenseTotal = allNewExpenses.reduce((s, e) => s + e.amountCents, 0);
    const newTotal = mission.subtotalCents + newExpenseTotal;
    const updatedMission: Mission = {
      ...mission, days: newDays, mealTotalCents: newMealTotal, mileageTotalCents: newMileageTotal, totalCents: newTotal,
    };

    let pdfWarning = false;
    updateAppState((current) => {
      let updatedInvoices = current.invoices;
      if (invoice) {
        const iStatus = invoice.status.toLowerCase();
        if (iStatus === 'draft') {
          const missionIds = invoice.missionIds ?? [missionId];
          const allMissions = current.missions.map((m) => (m.id === missionId ? updatedMission : m));
          const newAmount = missionIds.reduce((sum, mid) => sum + (allMissions.find((m) => m.id === mid)?.totalCents ?? 0), 0);
          updatedInvoices = current.invoices.map((inv) =>
            inv.id === invoice.id ? { ...inv, amountCents: newAmount, balanceDue: newAmount - (inv.paidAmountCents ?? 0) } : inv,
          );
        } else if (iStatus === 'ready_to_send' || iStatus === 'generated') {
          pdfWarning = true;
          updatedInvoices = current.invoices.map((inv) =>
            inv.id === invoice.id
              ? { ...inv, correctionState: { ...(inv.correctionState ?? {}), pdfNeedsRegeneration: true } }
              : inv,
          );
        }
      }
      return { ...current, missions: current.missions.map((m) => (m.id === missionId ? updatedMission : m)), invoices: updatedInvoices };
    });

    if (pdfWarning) {
      notify({ severity: 'warning', message: 'Frais mis à jour. Le PDF doit être régénéré.' });
    } else {
      notify({ severity: 'success', message: 'Frais enregistré.' });
    }
  }

  function handleDeleteExpense(missionId: string, dayId: string, expenseId: string) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const day = mission.days.find((d) => d.id === dayId);
    if (!day?.expenses?.find((e) => e.id === expenseId)) return;

    const previousMission = mission;
    const newDays = mission.days.map((d) =>
      d.id !== dayId ? d : { ...d, expenses: (d.expenses ?? []).filter((e) => e.id !== expenseId) },
    );
    const allNewExpenses = newDays.flatMap((d) => d.expenses ?? []);
    const newMealTotal = allNewExpenses.filter((e) => e.typeKey === 'MEAL').reduce((s, e) => s + e.amountCents, 0);
    const newMileageTotal = allNewExpenses.filter((e) => e.typeKey === 'MILEAGE').reduce((s, e) => s + e.amountCents, 0);
    const newExpenseTotal = allNewExpenses.reduce((s, e) => s + e.amountCents, 0);
    const newTotal = mission.subtotalCents + newExpenseTotal;
    const updatedMission: Mission = {
      ...mission, days: newDays, mealTotalCents: newMealTotal, mileageTotalCents: newMileageTotal, totalCents: newTotal,
    };

    updateAppState((current) => ({
      ...current,
      missions: current.missions.map((m) => (m.id === missionId ? updatedMission : m)),
    }));

    const undoId = undoManager.add({
      description: 'Restaurer le frais supprimé',
      undo: () => updateAppState((current) => ({ ...current, missions: current.missions.map((m) => (m.id === missionId ? previousMission : m)) })),
    });
    notify({ severity: 'success', message: 'Frais supprimé.', onUndo: () => undoManager.undo(undoId) });
  }

  async function handleAddReceipt(missionId: string, dayId: string, expenseId: string, file: File) {
    const error = validateReceiptFile(file);
    if (error) { notify({ severity: 'error', message: error }); return; }

    const receipt = createLocalReceipt({ file, expenseId, missionId, missionDayId: dayId });
    updateAppState((s) => ({
      ...s,
      expenseReceipts: [...s.expenseReceipts, receipt],
      missions: s.missions.map((m) => m.id !== missionId ? m : {
        ...m,
        days: m.days.map((d) => d.id !== dayId ? d : {
          ...d,
          expenses: (d.expenses ?? []).map((e) =>
            e.id !== expenseId ? e : { ...e, receiptIds: [...(e.receiptIds ?? []), receipt.id] },
          ),
        }),
      }),
    }));

    try {
      const uploaded = await uploadExpenseReceipt({ file, expenseId, missionId, missionDayId: dayId });
      updateAppState((s) => ({
        ...s,
        expenseReceipts: s.expenseReceipts.map((r) => r.id === receipt.id ? uploaded : r),
      }));
    } catch {
      notify({ severity: 'error', message: 'Erreur lors du téléversement du reçu.' });
    }
  }

  function handleDeleteReceipt(receiptId: string) {
    updateAppState((s) => removeReceiptFromState(s, receiptId));
  }

  function handleRevertMissionStep(missionId: string) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const prev = prevMissionStatus(mission.status);
    if (!prev) return;

    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    if (!invoice) {
      updateMissionStatus(missionId, prev);
      return;
    }

    const status = invoice.status.toLowerCase();
    if (status === 'sent' || status === 'paid' || invoice.status === 'SENT' || invoice.status === 'PAID') {
      const what = status === 'paid' ? 'payée' : 'envoyée';
      notify({ severity: 'warning', message: `Impossible de reculer : la facture est ${what}.` });
      return;
    }

    const invoiceWarning = (status === 'ready_to_send' || status === 'generated') ? 'ready' : 'draft';
    setMissionRevertConfirm({ missionId, prevStatus: prev, invoiceWarning });
  }

  function handleRevertInvoiceStep(missionId: string) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    if (!invoice) return;

    const status = invoice.status.toLowerCase();

    if (status === 'paid' || invoice.status === 'PAID') {
      notify({ severity: 'info', message: 'Une facture payée ne peut pas être ramenée en arrière depuis la frise. Modifiez ou supprimez un paiement dans la section paiement.' });
      return;
    }

    if (status === 'sent' || invoice.status === 'SENT') {
      if ((invoice.payments ?? []).length > 0) {
        notify({ severity: 'warning', message: 'Impossible de reculer : la facture a des paiements enregistrés. Supprimez-les d\'abord.' });
        return;
      }
      setInvoiceRevertConfirm({ type: 'revert_to_ready', missionId });
      return;
    }

    if (status === 'ready_to_send' || status === 'generated') {
      setInvoiceRevertConfirm({ type: 'revert_to_draft', missionId });
      return;
    }

    if (status === 'draft') {
      setInvoiceRevertConfirm({ type: 'delete_draft', missionId });
    }
  }

  function executeDeleteInvoiceDraft(missionId: string) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    if (!invoice) return;

    if (invoice.missionIds && invoice.missionIds.length > 1) {
      notify({ severity: 'warning', message: 'Cette facture regroupe plusieurs missions et ne peut pas être supprimée depuis la frise.' });
      setInvoiceRevertConfirm(null);
      return;
    }

    const previousMission = mission;
    const previousInvoice = invoice;

    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.filter((inv) => inv.id !== invoice.id),
      missions: current.missions.map((m) => (m.id === missionId ? { ...m, invoiceId: undefined } : m)),
    }));

    const undoId = undoManager.add({
      description: `Restaurer la facture ${invoice.numero}`,
      undo: () =>
        updateAppState((current) => ({
          ...current,
          invoices: [...current.invoices, previousInvoice],
          missions: current.missions.map((m) => (m.id === missionId ? previousMission : m)),
        })),
    });

    notify({ severity: 'success', message: `Facture ${invoice.numero} supprimée.`, onUndo: () => undoManager.undo(undoId) });
    setInvoiceRevertConfirm(null);
  }

  function executeInvoiceRevertToDraft(missionId: string) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    if (!invoice) return;

    const previousInvoice = invoice;
    const updated = { ...invoice, status: 'draft' as InvoiceStatus, pdfGeneratedAt: undefined, pdfPath: undefined };

    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((inv) => (inv.id === invoice.id ? updated : inv)),
    }));

    const undoId = undoManager.add({
      description: `Restaurer ${invoice.numero} à "Prête à envoyer"`,
      undo: () =>
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.map((inv) => (inv.id === invoice.id ? previousInvoice : inv)),
        })),
    });

    notify({ severity: 'success', message: `Facture ${invoice.numero} revenue en brouillon.`, onUndo: () => undoManager.undo(undoId) });
    setInvoiceRevertConfirm(null);
  }

  function executeInvoiceRevertToReady(missionId: string) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
    if (!invoice) return;

    const previousInvoice = invoice;
    const updated = { ...invoice, status: 'ready_to_send' as InvoiceStatus, sentAt: undefined };

    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((inv) => (inv.id === invoice.id ? updated : inv)),
    }));

    const undoId = undoManager.add({
      description: `Restaurer ${invoice.numero} à "Envoyée"`,
      undo: () =>
        updateAppState((current) => ({
          ...current,
          invoices: current.invoices.map((inv) => (inv.id === invoice.id ? previousInvoice : inv)),
        })),
    });

    notify({ severity: 'success', message: `Facture ${invoice.numero} revenue à "Prête à envoyer".`, onUndo: () => undoManager.undo(undoId) });
    setInvoiceRevertConfirm(null);
  }

  function handleAdvanceMissionStep(missionId: string, targetStatus: MissionStatus) {
    updateMissionStatus(missionId, targetStatus);
  }

  function handleAdvanceInvoiceStep(missionId: string, nextIndex: number) {
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const invoice = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);

    if (nextIndex === 1) {
      // Non créée → Brouillon: create invoice
      generateInvoice(mission);
      // Open the accordion so user sees the new invoice
      openMission(missionId);
    } else if (nextIndex === 2) {
      // Brouillon → Prête à envoyer: show full invoice preview modal
      if (invoice) setFriseModalMission(mission);
    } else if (nextIndex === 3) {
      // Prête à envoyer → Envoyée (puis À encaisser auto via invoiceStepIndex)
      if (invoice) markInvoiceSent(invoice.id);
    }
    // nextIndex === 5 (À encaisser → Payée): ouvrir l'accordéon section paiement
    else if (nextIndex === 5) {
      openMission(missionId);
    }
  }

  const compactHeaderSx = (theme: import('@mui/material').Theme) => ({
    minHeight: 80,
    px: { xs: 2, md: 2.5 },
    py: { xs: 0.75, md: 1 },
    borderRadius: 10,
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    '& .MuiTypography-overline': {
      color: alpha(theme.palette.common.white, 0.78),
      fontWeight: 800,
      letterSpacing: '0.12em',
    },
    '& .MuiTypography-h1': {
      fontSize: { xs: '1.42rem', md: '1.72rem' },
      lineHeight: 1.05,
    },
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ width: 'min(1120px, 100%)', mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <PageHeader
        eyebrow="MISSIONS"
        title="Missions"
        backTo="/activity"
        backLabel="Accueil"
        data-testid="missions-page-header"
        actions={
          <Button
            variant="contained"
            onClick={() => navigate('/missions/new')}
            sx={{
              bgcolor: 'common.white',
              color: 'primary.dark',
              fontWeight: 800,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            Créer une mission
          </Button>
        }
        sx={compactHeaderSx}
      />

      <PageSection
        title="Pilotage des missions"
        spacing={1.5}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' },
            gap: 1,
          }}
        >
          {[
            { label: 'À valider', value: String(draftCount), helper: 'Brouillons', tone: 'default' as const, action: () => { setMissionStatusFilter('DRAFT'); setMissionFocus('all', 'À valider'); } },
            { label: 'À venir 7j', value: String(missionMetrics.upcomingCount), helper: 'Confirmées', tone: 'primary' as const, action: () => { setMissionFocus('upcoming7d', 'À venir 7j'); setMissionStatusFilter('ACTIVE'); } },
            { label: 'En cours', value: String(inProgressCount), helper: 'Missions actives', tone: 'warning' as const, action: () => { setMissionStatusFilter('IN_PROGRESS'); setMissionFocus('all', 'En cours'); } },
            { label: 'À facturer', value: String(missionMetrics.toInvoiceCount), helper: formatMoney(missionMetrics.toInvoiceCents), tone: 'warning' as const, action: () => { setMissionFocus('toInvoice', 'À facturer'); setMissionStatusFilter('ACTIVE'); } },
            { label: 'Factures à finaliser', value: String(invoicesToFinalizeCount), helper: 'Non finalisées', tone: 'default' as const, action: () => { setMissionFocus('toFinalize', 'Factures à finaliser'); setMissionStatusFilter('ACTIVE'); } },
            { label: 'À encaisser', value: String(toCollectCount), helper: 'Factures envoyées', tone: 'primary' as const, action: () => { setMissionStatusFilter('invoice_sent'); setMissionFocus('all', 'À encaisser'); } },
            { label: 'En retard', value: String(overdueCount), helper: 'Échéance dépassée', tone: 'error' as const, action: () => { setMissionFocus('overdue', 'En retard'); setMainFilter('ALL'); setStatusFilter('ALL'); } },
          ].map((kpi) => (
            <Box key={kpi.label} sx={{ borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} onClick={kpi.action}>
              <MetricCard
                label={kpi.label}
                value={kpi.value}
                helperText={kpi.helper}
                tone={kpi.tone}
                compact
                active={activeKpi === kpi.label}
              />
            </Box>
          ))}
        </Box>
      </PageSection>

      {invoiceReadyGroups.length ? (
        <PageSection title="Missions à facturer" description="Les regroupements sont limités aux missions d'une même pharmacie." spacing={2}>
          <Stack spacing={1.5}>
            {invoiceReadyGroups.map((group) => (
              <SurfaceCard key={group.pharmacie?.id ?? group.missions[0]?.pharmacieId} contentSx={{ p: 2 }} sx={{ borderRadius: borderRadiusScale.xl }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{pharmacieDisplayName(group.pharmacie)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.missions.length} mission(s) · {formatMoney(group.missions.reduce((sum, mission) => sum + mission.totalCents, 0))}
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={() => generateGroupedInvoice(group.missions)}>
                    Générer facture groupée
                  </Button>
                </Stack>
              </SurfaceCard>
            ))}
          </Stack>
        </PageSection>
      ) : null}

      <PageSection
        title="File de missions"
        description={`${missions.length} mission${missions.length > 1 ? 's' : ''} affichée${missions.length > 1 ? 's' : ''}.`}
        spacing={1.5}
      >
        {/* Main filter chips + Filtres avancés */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label="Filtrer les missions par statut">
          {MAIN_FILTER_OPTIONS.map((option) => {
            const active = mainFilter === option.value;
            return (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => {
                  setMainFilter(option.value);
                  setStatusFilter('ALL');
                  setFocusFilter('all');
                  setActiveKpi(null);
                }}
                sx={(theme) => ({
                  height: 32,
                  borderRadius: 8,
                  fontWeight: active ? 800 : 600,
                  bgcolor: active ? 'primary.main' : 'background.paper',
                  color: active ? 'primary.contrastText' : 'text.primary',
                  border: `${borderWidth.thin}px solid ${active ? 'transparent' : theme.palette.divider}`,
                  '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                })}
              />
            );
          })}
          <Select
            size="small"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            startAdornment={<SwapVertRoundedIcon sx={{ fontSize: 15, mr: 0.5, color: 'text.secondary' }} />}
            sx={{ height: 32, borderRadius: 8, fontSize: '0.8rem', minWidth: 118 }}
          >
            <MenuItem value="date_desc">Date ↓</MenuItem>
            <MenuItem value="date_asc">Date ↑</MenuItem>
            <MenuItem value="amount_desc">Montant ↓</MenuItem>
            <MenuItem value="amount_asc">Montant ↑</MenuItem>
          </Select>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FilterListRoundedIcon fontSize="small" />}
            onClick={(e) => setAdvancedAnchor(e.currentTarget)}
            sx={{
              ml: 'auto',
              height: 32,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.8rem',
              borderColor: 'divider',
              color: 'text.secondary',
              textTransform: 'none',
            }}
          >
            Filtres avancés
          </Button>

          {/* Advanced filter popover */}
          <Popover
            open={Boolean(advancedAnchor)}
            anchorEl={advancedAnchor}
            onClose={() => setAdvancedAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { p: 2.5, minWidth: 280, borderRadius: borderRadiusScale.lg } } }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Filtres avancés</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Statut mission</Typography>
                {(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as MissionStatus[]).map((s) => (
                  <FormControlLabel
                    key={s}
                    control={
                      <Checkbox
                        size="small"
                        checked={pendingFilter.missionStatuses.includes(s)}
                        onChange={(e) => setPendingFilter((f) => ({
                          ...f,
                          missionStatuses: e.target.checked ? [...f.missionStatuses, s] : f.missionStatuses.filter((x) => x !== s),
                        }))}
                      />
                    }
                    label={<Typography variant="body2">{
                      s === 'DRAFT' ? 'Brouillon'
                      : s === 'CONFIRMED' ? 'Validée'
                      : s === 'IN_PROGRESS' ? 'En cours'
                      : 'Terminée'
                    }</Typography>}
                    sx={{ display: 'flex', ml: 0 }}
                  />
                ))}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Facturation</Typography>
                {[['none', 'Non créée'], ['draft', 'Brouillon'], ['ready_to_send', 'Prête à envoyer'], ['sent', 'Envoyée'], ['paid', 'Payée']].map(([val, lbl]) => (
                  <FormControlLabel
                    key={val}
                    control={
                      <Checkbox
                        size="small"
                        checked={pendingFilter.invoiceStages.includes(val)}
                        onChange={(e) => setPendingFilter((f) => ({
                          ...f,
                          invoiceStages: e.target.checked ? [...f.invoiceStages, val] : f.invoiceStages.filter((x) => x !== val),
                        }))}
                      />
                    }
                    label={<Typography variant="body2">{lbl}</Typography>}
                    sx={{ display: 'flex', ml: 0 }}
                  />
                ))}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paiement</Typography>
                {[['to_collect', 'À encaisser'], ['partial', 'Partiel'], ['paid', 'Payée']].map(([val, lbl]) => (
                  <FormControlLabel
                    key={val}
                    control={
                      <Checkbox
                        size="small"
                        checked={pendingFilter.paymentStatuses.includes(val)}
                        onChange={(e) => setPendingFilter((f) => ({
                          ...f,
                          paymentStatuses: e.target.checked ? [...f.paymentStatuses, val] : f.paymentStatuses.filter((x) => x !== val),
                        }))}
                      />
                    }
                    label={<Typography variant="body2">{lbl}</Typography>}
                    sx={{ display: 'flex', ml: 0 }}
                  />
                ))}
              </Box>
              {uniquePharmacies.length > 1 ? (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pharmacie</Typography>
                  {uniquePharmacies.map(({ id, pharmacie }) => (
                    <FormControlLabel
                      key={id}
                      control={
                        <Checkbox
                          size="small"
                          checked={pendingFilter.pharmacieIds.includes(id)}
                          onChange={(e) => setPendingFilter((f) => ({
                            ...f,
                            pharmacieIds: e.target.checked ? [...f.pharmacieIds, id] : f.pharmacieIds.filter((pid) => pid !== id),
                          }))}
                        />
                      }
                      label={<Typography variant="body2">{pharmacieDisplayName(pharmacie)}</Typography>}
                      sx={{ display: 'flex', ml: 0 }}
                    />
                  ))}
                </Box>
              ) : null}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                <Button size="small" onClick={() => { setPendingFilter(EMPTY_ADVANCED_FILTER); }} color="inherit">
                  Réinitialiser
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => { setAdvancedFilter(pendingFilter); setAdvancedAnchor(null); }}
                >
                  Appliquer
                </Button>
              </Box>
            </Stack>
          </Popover>
        </Box>

        {activeKpi && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={`Filtre KPI : ${activeKpi}`}
              onDelete={() => {
                setMissionFocus('all');
                setStatusFilter('ALL');
                setMainFilter('ACTIVE');
              }}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Box>
        )}

        <FadeIn>
          <SurfaceCard flush sx={{ borderRadius: borderRadiusScale.xl }}>
            {missions.length ? (
              <Stack spacing={0} role="list">
                {missions.map((mission) => {
                  const missionInv = findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission);
                  const missionPharmacy = findPharmacie(state, mission.pharmacieId);
                  const isOpen = selectedId === mission.id;
                  return (
                    <Box key={mission.id} role="listitem">
                      <MissionListCard
                        mission={mission}
                        invoice={missionInv}
                        pharmacy={missionPharmacy}
                        isOpen={isOpen}
                        onToggle={() => (isOpen ? closeMission() : openMission(mission.id))}
                        onDownloadPdf={(invoiceId) => downloadPdf(invoiceId)}
                        onDownloadIcs={downloadCalendar}
                        onAdvanceMissionStep={handleAdvanceMissionStep}
                        onAdvanceInvoiceStep={handleAdvanceInvoiceStep}
                        onRevertMissionStep={handleRevertMissionStep}
                        onRevertInvoiceStep={handleRevertInvoiceStep}
                      />
                      <Collapse in={isOpen} unmountOnExit>
                        <MissionDetailPanel
                          mission={mission}
                          pharmacy={missionPharmacy}
                          invoice={missionInv}
                          onClose={closeMission}
                          onEditMission={(id) => navigate(`/missions/${id}/edit`)}
                          onDownloadPdf={downloadPdf}
                          onDownloadIcs={downloadCalendar}
                          onChangeMissionStatus={updateMissionStatus}
                          onGenerateInvoice={generateInvoice}
                          onSavePayment={savePayment}
                          onGeneratePdf={generatePdf}
                          onMarkInvoiceSent={markInvoiceSent}
                          onDeletePayment={deletePayment}
                          onSaveExpense={(dayId, expense) => handleSaveExpense(mission.id, dayId, expense)}
                          onDeleteExpense={(dayId, expenseId) => handleDeleteExpense(mission.id, dayId, expenseId)}
                          receipts={state.expenseReceipts.filter((r) => r.missionId === mission.id)}
                          onAddReceipt={(dayId, expenseId, file) => handleAddReceipt(mission.id, dayId, expenseId, file)}
                          onDeleteReceipt={handleDeleteReceipt}
                        />
                      </Collapse>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <EmptyState
                onPrimary={() => navigate('/missions/new')}
                onSecondary={() => {
                  setMainFilter('ALL');
                  setStatusFilter('ALL');
                  setFocusFilter('all');
                  setAdvancedFilter(EMPTY_ADVANCED_FILTER);
                  setPendingFilter(EMPTY_ADVANCED_FILTER);
                }}
                hasFilter={mainFilter !== 'ALL' || statusFilter !== 'ALL' || focusFilter !== 'all'}
              />
            )}
          </SurfaceCard>
        </FadeIn>
      </PageSection>

      {friseModalMission && (() => {
        const friseInvoice = findInvoice(state, friseModalMission.invoiceId) ?? missionInvoice(state, friseModalMission);
        const frisePharmacy = findPharmacie(state, friseModalMission.pharmacieId);
        const frisePharmacien = findPharmacien(state, friseModalMission.pharmacienId);
        return friseInvoice ? (
          <InvoiceDraftModal
            open={Boolean(friseModalMission)}
            onClose={() => setFriseModalMission(null)}
            mission={friseModalMission}
            pharmacy={frisePharmacy}
            pharmacien={frisePharmacien}
            invoice={friseInvoice}
            state={state}
            onEditMission={(id) => { setFriseModalMission(null); navigate(`/missions/${id}/edit`); }}
            onGeneratePdf={generatePdf}
            onMarkSent={markInvoiceSent}
            onDownloadPdfDirect={downloadPdf}
          />
        ) : null;
      })()}

      {/* Mission backward confirmation */}
      <Dialog
        open={Boolean(missionRevertConfirm)}
        onClose={() => setMissionRevertConfirm(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="mission-revert-title"
      >
        <DialogTitle id="mission-revert-title">Reculer la mission ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            La mission reviendra à l'étape{' '}
            <strong>
              {missionRevertConfirm?.prevStatus === 'DRAFT'
                ? 'Brouillon'
                : missionRevertConfirm?.prevStatus === 'CONFIRMED'
                  ? 'Validée'
                  : 'En cours'}
            </strong>.
          </Typography>
          {missionRevertConfirm?.invoiceWarning === 'draft' && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              La facture brouillon associée sera conservée mais non liée à ce statut.
            </Typography>
          )}
          {missionRevertConfirm?.invoiceWarning === 'ready' && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              La facture est déjà prête à envoyer. Elle restera en l'état mais les données de la mission auront changé.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMissionRevertConfirm(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              if (missionRevertConfirm) {
                updateMissionStatus(missionRevertConfirm.missionId, missionRevertConfirm.prevStatus);
                setMissionRevertConfirm(null);
              }
            }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice backward confirmation */}
      <Dialog
        open={Boolean(invoiceRevertConfirm)}
        onClose={() => setInvoiceRevertConfirm(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="invoice-revert-title"
      >
        <DialogTitle id="invoice-revert-title">
          {invoiceRevertConfirm?.type === 'delete_draft'
            ? 'Supprimer le brouillon ?'
            : invoiceRevertConfirm?.type === 'revert_to_draft'
              ? 'Revenir en brouillon ?'
              : 'Revenir à "Prête à envoyer" ?'}
        </DialogTitle>
        <DialogContent>
          {invoiceRevertConfirm?.type === 'delete_draft' && (
            <Typography variant="body2">
              Le brouillon de facture sera supprimé. La mission reviendra à l'état "Sans facture". Cette action peut être annulée via le toast.
            </Typography>
          )}
          {invoiceRevertConfirm?.type === 'revert_to_draft' && (
            <Typography variant="body2">
              La facture repassera en brouillon. Le PDF généré deviendra obsolète et devra être regénéré.
            </Typography>
          )}
          {invoiceRevertConfirm?.type === 'revert_to_ready' && (
            <Typography variant="body2">
              La facture repassera à "Prête à envoyer". La date d'envoi sera effacée.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceRevertConfirm(null)}>Annuler</Button>
          <Button
            variant="contained"
            color={invoiceRevertConfirm?.type === 'delete_draft' ? 'error' : 'warning'}
            onClick={() => {
              if (!invoiceRevertConfirm) return;
              if (invoiceRevertConfirm.type === 'delete_draft') executeDeleteInvoiceDraft(invoiceRevertConfirm.missionId);
              else if (invoiceRevertConfirm.type === 'revert_to_draft') executeInvoiceRevertToDraft(invoiceRevertConfirm.missionId);
              else executeInvoiceRevertToReady(invoiceRevertConfirm.missionId);
            }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Expense change on sent/paid invoice — confirm ── */}
      <Dialog open={Boolean(pendingExpenseChange)} onClose={() => setPendingExpenseChange(null)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Modifier un frais après envoi ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            La facture a déjà été envoyée (ou payée). Modifier un frais ne mettra pas à jour le PDF déjà transmis au client. Souhaitez-vous continuer ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setPendingExpenseChange(null)} sx={{ fontWeight: 700 }}>Annuler</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              if (!pendingExpenseChange) return;
              const { missionId, dayId, expense } = pendingExpenseChange;
              const mission = state.missions.find((m) => m.id === missionId);
              const invoice = mission ? (findInvoice(state, mission.invoiceId) ?? missionInvoice(state, mission)) : undefined;
              if (mission) applyExpenseSave(missionId, dayId, expense, mission, invoice);
              setPendingExpenseChange(null);
            }}
            sx={{ fontWeight: 700 }}
          >
            Modifier quand même
          </Button>
        </DialogActions>
      </Dialog>

    </Stack>
    </Box>
  );
}


function EmptyState({ onPrimary, onSecondary, hasFilter }: { onPrimary: () => void; onSecondary: () => void; hasFilter: boolean }) {
  return (
    <Stack spacing={2.5} sx={{ alignItems: 'center', py: 6, px: 3, textAlign: 'center' }}>
      <Typography color="text.secondary" sx={{ fontWeight: 650, maxWidth: 360 }}>
        {hasFilter ? 'Aucune mission dans ce filtre.' : 'Aucune mission pour le moment.'}
      </Typography>
      {!hasFilter ? (
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Créez votre première mission pour commencer le suivi.
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {hasFilter ? (
          <Button variant="outlined" onClick={onSecondary}>Réinitialiser les filtres</Button>
        ) : null}
        <Button variant="contained" onClick={onPrimary}>Créer une mission</Button>
      </Stack>
    </Stack>
  );
}
