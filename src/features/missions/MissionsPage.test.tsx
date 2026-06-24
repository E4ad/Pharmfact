import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lightTheme } from '../../app/theme';
import { MissionsPage } from './MissionsPage';
import type { AppState, Invoice, Mission, Pharmacie } from '../../storage/schema';

function mission(patch: Partial<Mission> = {}): Mission {
  return {
    id: 'mis_1',
    missionCode: 'MIS-2026-001',
    pharmacienId: 'ph_1',
    pharmacieId: 'pha_1',
    status: 'CONFIRMED',
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: '2026-06-18',
    dateFin: '2026-06-18',
    days: [{ id: 'day_1', dateService: '2026-06-18', startTime: '09:00', endTime: '21:00', unpaidBreakMinutes: 0, description: '', hours: 11, expenses: [] }],
    hourlyRateCents: 8000,
    mealFeeCents: 2000,
    mileageKm: 0,
    mileageRateCents: 61,
    totalHours: 11,
    subtotalCents: 88000,
    mealTotalCents: 2000,
    mileageTotalCents: 0,
    totalCents: 90000,
    notes: '',
    events: [],
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    ...patch,
  };
}

function pharmacy(): Pharmacie {
  return {
    id: 'pha_1',
    nom: 'PJC 092 - Martin Chao',
    adresse: '4466, rue Beaubien Est',
    ville: 'Montréal',
    codePostal: 'H1X 1Y1',
    telephone: '',
    email: '',
    defaultBreakMinutes: 60,
    weeklySchedule: {
      monday: { enabled: true, startTime: '09:00', endTime: '21:00' },
      tuesday: { enabled: true, startTime: '09:00', endTime: '21:00' },
      wednesday: { enabled: true, startTime: '09:00', endTime: '21:00' },
      thursday: { enabled: true, startTime: '09:00', endTime: '21:00' },
      friday: { enabled: true, startTime: '09:00', endTime: '21:00' },
      saturday: { enabled: true, startTime: '09:00', endTime: '18:00' },
      sunday: { enabled: true, startTime: '09:00', endTime: '18:00' },
      source: 'manual',
    },
  };
}

const baseState: AppState = {
  version: 4,
  activePharmacienId: 'ph_1',
  pharmaciens: [{ id: 'ph_1', nom: 'QA Pharmacien', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 8000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
  pharmacies: [pharmacy()],
  missions: [mission()],
  invoices: [],
  taxPayments: [],
  deductibleExpenses: [],
  expenseReceipts: [],
  fiscalSettings: { defaultTaxStatus: 'SMALL_SUPPLIER' as const, reserveRate: 0, fiscalYearStartMonth: 1, currentFiscalYear: 2026, smallSupplierThresholdCents: 30000, smallSupplierWarningRate: 0, instalmentDates: [], quebecNetTaxOwingThresholdCents: 0, federalNetTaxOwingThresholdCents: 0, federalDefaultNetTaxOwingThresholdCents: 0, currentYear: 2026, includeMissionDeductibleExpenses: false, trackExpenseReceipts: false, warnMissingExpenseReceipts: false, showMonthlyView: true, showQuarterlyView: true, showAnnualView: true, enableInstalmentTracking: false, enableSmallSupplierTracking: false, enableExpenseTracking: false },
  distanceReferences: [],
  opqPharmacistRegistry: { entries: [], sourceUrl: '' },
  appOptions: { missionDefaults: { defaultMissionType: 'REMPLACEMENT_OFFICINE', defaultStartTime: '08:00', defaultEndTime: '17:00', defaultBreakMinutes: 60, mealAutoEnabled: true, mealThresholdHours: 8, mealDefaultCents: 2000, mileageRateCents: 61 }, invoiceDefaults: { invoiceDueDays: 30, paymentTerms: '' }, pdfCalendar: { calendarIcsEnabled: true, calendarReminderMinutes: null, pdfFooterEnabled: true, calendarEventTitle: '', calendarReminder: 'NONE' } },
  uiSettings: { themeMode: 'light' },
  localDataSettings: { autoBackupEnabled: true },
  ui: { missionFilters: {} },
};

let currentState: AppState = baseState;

vi.mock('../../storage/localStore', () => ({
  useAppState: () => currentState,
  updateAppState: vi.fn(),
}));

vi.mock('../../components/NotificationSystem', () => ({
  useNotifications: () => ({ notify: vi.fn() }),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../services/downloadInvoicePdf', () => ({
  downloadInvoicePdf: vi.fn().mockResolvedValue({ status: 'downloaded' }),
}));

vi.mock('../../services/calendarIcs', () => ({
  buildMissionIcs: vi.fn(),
  downloadIcs: vi.fn(),
}));

vi.mock('../../services/errorMapper', () => ({
  logMappedError: vi.fn(),
  mapError: vi.fn().mockReturnValue({ shouldDisplay: false }),
}));

vi.mock('../../services/undoManager', () => ({
  undoManager: { add: vi.fn().mockReturnValue('undo_1') },
}));

function renderMissionsPage() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <MemoryRouter initialEntries={['/missions']}>
        <MissionsPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('MissionsPage render', () => {
  beforeEach(() => {
    currentState = baseState;
    vi.clearAllMocks();
  });

  it('renders a compact header with back to Accueil and Créer une mission button', () => {
    renderMissionsPage();
    expect(screen.getByTestId('missions-page-header')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Créer une mission' })).toBeInTheDocument();
  });

  it('renders Pilotage des missions and not Repères propriétaires', () => {
    renderMissionsPage();
    expect(screen.getByRole('heading', { name: 'Pilotage des missions' })).toBeInTheDocument();
    expect(screen.queryByText('Repères propriétaires')).not.toBeInTheDocument();
  });

  it('renders compact KPI cards', () => {
    renderMissionsPage();
    expect(screen.getByText('À venir — 7 jours')).toBeInTheDocument();
    expect(screen.getByText('Montant estimé — 7 jours')).toBeInTheDocument();
    expect(screen.getByText('À facturer')).toBeInTheDocument();
    expect(screen.getByText('Factures à finaliser')).toBeInTheDocument();
  });

  it('renders filter chips', () => {
    renderMissionsPage();
    expect(screen.getByRole('group', { name: /Filtrer les missions/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toutes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brouillon' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planifiée' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'En cours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminée' })).toBeInTheDocument();
  });

  it('renders mission cards with key information', () => {
    renderMissionsPage();
    expect(screen.getByText(/PJC 092 - Martin Chao/)).toBeInTheDocument();
    expect(screen.getByText(/4466, rue Beaubien Est/)).toBeInTheDocument();
    expect(screen.getByText('MIS-2026-001')).toBeInTheDocument();
    expect(screen.getByText('18 juin 2026')).toBeInTheDocument();
    expect(screen.getByText('11,00 h payées')).toBeInTheDocument();
    expect(screen.getAllByText('Planifiée').length).toBeGreaterThanOrEqual(1);
  });

  it('shows ICS action in the mission detail modal', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    expect(screen.getByLabelText('Télécharger le calendrier ICS')).toBeInTheDocument();
  });

  it('opens mission detail modal on card click', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText('Fermer le détail de la mission')).toBeInTheDocument();
    expect(screen.getByLabelText('Télécharger le calendrier ICS')).toBeInTheDocument();
  });

  it('shows empty state when no missions', () => {
    currentState = { ...baseState, missions: [] };
    renderMissionsPage();
    expect(screen.getByText(/Aucune mission/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Créer une mission' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows filter empty state when no missions match', () => {
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Brouillon' }));
    expect(screen.getByText('Aucune mission dans ce filtre.')).toBeInTheDocument();
  });

  it('shows invoice action in modal when mission is completed without invoice', () => {
    currentState = { ...baseState, missions: [mission({ status: 'COMPLETED', invoiceId: undefined })] };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Continuer vers la facturation' })).toBeInTheDocument();
  });

  it('has a Créer une mission button that is clickable', () => {
    renderMissionsPage();
    expect(screen.getByRole('button', { name: 'Créer une mission' })).toBeInTheDocument();
  });

  it('shows pharmacy schedule table in modal', () => {
    currentState = { ...baseState, missions: [mission({ status: 'COMPLETED', invoiceId: undefined })] };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Horaire de la pharmacie')).toBeInTheDocument();
    expect(within(dialog).getByText('Lundi')).toBeInTheDocument();
    expect(within(dialog).getByText('Jeudi')).toBeInTheDocument();
    expect(within(dialog).queryByText('Pause')).not.toBeInTheDocument();
  });

  it('shows dark summary card with mission totals in modal', () => {
    currentState = { ...baseState, missions: [mission({ status: 'COMPLETED', invoiceId: undefined })] };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Résumé')).toBeInTheDocument();
    expect(within(dialog).getByText(/900,00\s*\$/)).toBeInTheDocument();
  });

  it('shows worked days in modal', () => {
    currentState = { ...baseState, missions: [mission({ status: 'COMPLETED', invoiceId: undefined })] };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('Jours travaillés').length).toBeGreaterThanOrEqual(1);
    expect(within(dialog).getAllByText('11,00 h').length).toBeGreaterThanOrEqual(1);
  });
});
