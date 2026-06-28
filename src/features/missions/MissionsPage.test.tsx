import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lightTheme } from '../../app/theme';
import { MissionsPage } from './MissionsPage';
import type { AppState, Invoice, Mission, Pharmacie } from '../../storage/schema';

function invoice(patch: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv_1',
    numero: 'FAC-2026-001',
    missionId: 'mis_1',
    missionIds: ['mis_1'],
    pharmacienId: 'ph_1',
    pharmacieId: 'pha_1',
    status: 'draft',
    dateFacture: '2026-06-18',
    dateEcheance: '2026-07-18',
    hours: 11,
    amountCents: 90000,
    paidAmountCents: 0,
    paymentStatus: 'to_collect',
    payments: [],
    createdAt: '2026-06-18T00:00:00.000Z',
    ...patch,
  };
}

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
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/activity');
    expect(screen.getByRole('button', { name: 'Créer une mission' })).toBeInTheDocument();
  });

  it('renders Pilotage des missions and not Repères propriétaires', () => {
    renderMissionsPage();
    expect(screen.getByRole('heading', { name: 'Pilotage des missions' })).toBeInTheDocument();
    expect(screen.queryByText('Repères propriétaires')).not.toBeInTheDocument();
  });

  it('renders 7 KPI cards', () => {
    renderMissionsPage();
    expect(screen.getByText('À valider')).toBeInTheDocument();
    expect(screen.getByText('À venir 7j')).toBeInTheDocument();
    expect(screen.getAllByText('En cours').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('À facturer')).toBeInTheDocument();
    expect(screen.getByText('Factures à finaliser')).toBeInTheDocument();
    expect(screen.getAllByText('À encaisser').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('En retard')).toBeInTheDocument();
  });

  it('renders 4 main filter chips and Filtres avancés button', () => {
    renderMissionsPage();
    expect(screen.getByRole('group', { name: /Filtrer les missions/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actives' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toutes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archivées' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annulées' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filtres avancés/ })).toBeInTheDocument();
    // Brouillon / Planifiée / Terminée no longer shown as main chips
    expect(screen.queryByRole('button', { name: 'Brouillon' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Planifiée' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terminée' })).not.toBeInTheDocument();
  });

  it('renders mission cards with key information', () => {
    renderMissionsPage();
    expect(screen.getByText(/PJC 092 - Martin Chao/)).toBeInTheDocument();
    expect(screen.getByText(/4466, rue Beaubien Est/)).toBeInTheDocument();
    expect(screen.getByText('MIS-2026-001')).toBeInTheDocument();
    expect(screen.getByText('11,00 h payées')).toBeInTheDocument();
    expect(screen.getByText('À venir')).toBeInTheDocument();
  });

  it('hides ARCHIVED missions when Actives filter is selected', () => {
    currentState = {
      ...baseState,
      missions: [
        mission({ status: 'CONFIRMED' }),
        mission({ id: 'mis_2', missionCode: 'MIS-2026-002', status: 'ARCHIVED' }),
      ],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Actives' }));
    expect(screen.getByText('MIS-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('MIS-2026-002')).not.toBeInTheDocument();
  });

  it('shows ARCHIVED missions when Toutes filter is selected', () => {
    currentState = {
      ...baseState,
      missions: [
        mission({ status: 'CONFIRMED' }),
        mission({ id: 'mis_2', missionCode: 'MIS-2026-002', status: 'ARCHIVED' }),
      ],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Toutes' }));
    expect(screen.getByText('MIS-2026-001')).toBeInTheDocument();
    expect(screen.getByText('MIS-2026-002')).toBeInTheDocument();
  });

  it('shows ICS action in the mission detail drawer', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByLabelText('Télécharger le calendrier ICS')).toBeInTheDocument();
  });

  it('opens mission detail drawer on card click', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Fermer le panneau')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Télécharger le calendrier ICS')).toBeInTheDocument();
  });

  it('shows empty state when no missions', () => {
    currentState = { ...baseState, missions: [] };
    renderMissionsPage();
    expect(screen.getByText(/Aucune mission/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Créer une mission' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows filter empty state when no missions match via advanced filter', () => {
    renderMissionsPage();
    // Open the advanced filter popover
    fireEvent.click(screen.getByRole('button', { name: /Filtres avancés/ }));
    // Check 'Brouillon' mission status (first matching checkbox = Statut mission section)
    const brouillonCheckboxes = screen.getAllByRole('checkbox', { name: 'Brouillon' });
    fireEvent.click(brouillonCheckboxes[0]);
    // Apply the filter
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));
    expect(screen.getByText('Aucune mission dans ce filtre.')).toBeInTheDocument();
  });

  it('shows Créer la facture CTA in drawer for completed missions without invoice', () => {
    currentState = { ...baseState, missions: [mission({ status: 'COMPLETED', invoiceId: undefined })] };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Créer la facture' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Modifier la mission' })).toBeInTheDocument();
  });

  it('shows Modifier la mission button in drawer action bar for confirmed missions', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByRole('button', { name: 'Modifier la mission' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Créer la facture' })).not.toBeInTheDocument();
  });

  it('shows Modifier la mission button exactly once in drawer', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getAllByRole('button', { name: 'Modifier la mission' })).toHaveLength(1);
  });

  it('shows Modifier la mission in action bar (not only at bottom)', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    fireEvent.click(card!);
    const actionBar = screen.getByTestId('action-bar');
    expect(within(actionBar).getByRole('button', { name: 'Modifier la mission' })).toBeInTheDocument();
  });

  it('has a Créer une mission button that is clickable', () => {
    renderMissionsPage();
    expect(screen.getByRole('button', { name: 'Créer une mission' })).toBeInTheDocument();
  });

  it('shows mission total in summary line of panel', () => {
    currentState = { ...baseState, missions: [mission({ status: 'COMPLETED', invoiceId: undefined })] };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText(/900,00\s*\$/)).toBeInTheDocument();
  });

  it('shows worked days in Détail mission section', () => {
    currentState = { ...baseState, missions: [mission({ status: 'COMPLETED', invoiceId: undefined })] };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getAllByText('Détail mission').length).toBeGreaterThanOrEqual(1);
    expect(within(drawer).getAllByText('11,00 h').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Annuler la mission button for confirmed mission in drawer', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByRole('button', { name: 'Annuler la mission' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'En cours' })).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when clicking Annuler la mission in drawer', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Annuler la mission' }));
    expect(screen.getByText('Annuler la mission ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Confirmer l'annulation" })).toBeInTheDocument();
  });
});

describe('MissionsPage — À faire maintenant CTA ladder', () => {
  beforeEach(() => {
    currentState = baseState;
    vi.clearAllMocks();
  });

  it('shows invoice preview and Ouvrir en grand button for mission with draft invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByText('À faire maintenant')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Prévisualiser la facture' })).toBeInTheDocument();
  });

  it('shows Prévisualiser la facture button exactly once for draft invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getAllByRole('button', { name: 'Prévisualiser la facture' })).toHaveLength(1);
  });

  it('opens invoice draft modal on Prévisualiser la facture click', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Prévisualiser la facture' }));
    expect(screen.getByRole('dialog', { name: /Facture brouillon/ })).toBeInTheDocument();
    expect(screen.getAllByText(/FAC-2026-001/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows invoice number in action bar context for draft invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByText(/FAC-2026-001/)).toBeInTheDocument();
  });

  it('shows Marquer comme envoyée CTA for ready_to_send invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'ready_to_send' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByRole('button', { name: 'Marquer comme envoyée' })).toBeInTheDocument();
  });

  it('shows Encaisser le solde CTA for sent invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByTestId('cta-add-payment')).toBeInTheDocument();
  });

  it('shows inline payment form when Encaisser le solde is clicked', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    fireEvent.click(within(drawer).getByTestId('cta-add-payment'));
    expect(within(drawer).getByLabelText('Montant ($)')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Date reçue')).toBeInTheDocument();
  });

  it('prefills balance amount when Encaisser le solde is clicked', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent', amountCents: 90000, paidAmountCents: 0 })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    fireEvent.click(within(drawer).getByTestId('cta-add-payment'));
    const amountField = within(drawer).getByLabelText('Montant ($)') as HTMLInputElement;
    expect(amountField.value).toBe('900.00');
  });

  it('shows Archiver la mission CTA for fully paid invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent', paymentStatus: 'paid', paidAmountCents: 90000 })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByTestId('cta-archive')).toBeInTheDocument();
    expect(within(drawer).getByText('La mission est entièrement encaissée.')).toBeInTheDocument();
  });

  it('shows mini-ledger with total, encaissé and solde for sent invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent', paidAmountCents: 45000 })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByText('Total facturation')).toBeInTheDocument();
    expect(within(drawer).getByText('Encaissé')).toBeInTheDocument();
    expect(within(drawer).getByText('Solde')).toBeInTheDocument();
  });

  it('shows payment history and delete button when payments exist', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [
        invoice({
          status: 'sent',
          paidAmountCents: 45000,
          payments: [{ id: 'pay_1', amount: 45000, receivedAt: '2026-06-20', method: 'transfer', createdAt: '2026-06-20T00:00:00.000Z' }],
        }),
      ],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).getByText('Historique des paiements')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /Supprimer le paiement/ })).toBeInTheDocument();
  });

  it('shows delete payment confirmation dialog', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [
        invoice({
          status: 'sent',
          paidAmountCents: 45000,
          payments: [{ id: 'pay_1', amount: 45000, receivedAt: '2026-06-20', method: 'transfer', createdAt: '2026-06-20T00:00:00.000Z' }],
        }),
      ],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    fireEvent.click(within(drawer).getByRole('button', { name: /Supprimer le paiement/ }));
    expect(screen.getByText('Supprimer ce paiement ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
  });

  it('shows no CTA block for active (non-completed) missions without invoice', () => {
    renderMissionsPage();
    const card = screen.getByText(/PJC 092 - Martin Chao/).closest('[role="button"]');
    fireEvent.click(card!);
    const drawer = screen.getByTestId('mission-detail-panel');
    expect(within(drawer).queryByText('À faire maintenant')).not.toBeInTheDocument();
  });
});

describe('MissionsPage — bidirectional frise navigation', () => {
  beforeEach(() => {
    currentState = baseState;
    vi.clearAllMocks();
  });

  it('mission frise back step: CONFIRMED with no invoice → direct status change (no dialog)', async () => {
    const { updateAppState: mockUpdate } = await import('../../storage/localStore');
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Mission :' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('mission frise back step: CONFIRMED with draft invoice → confirmation dialog', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'CONFIRMED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Mission :' }));
    expect(screen.getByText('Reculer la mission ?')).toBeInTheDocument();
  });

  it('mission frise back step: CONFIRMED with ready_to_send invoice → dialog with warning', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'CONFIRMED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'ready_to_send' })],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Mission :' }));
    expect(screen.getByText('Reculer la mission ?')).toBeInTheDocument();
    expect(screen.getByText(/déjà prête à envoyer/)).toBeInTheDocument();
  });

  it('mission frise back step: CONFIRMED with sent invoice → blocked (no dialog)', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'CONFIRMED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent' })],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Mission :' }));
    expect(screen.queryByText('Reculer la mission ?')).not.toBeInTheDocument();
  });

  it('mission frise back step: COMPLETED with no invoice → back button enabled', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: undefined })],
    };
    renderMissionsPage();
    expect(screen.getByRole('button', { name: 'Reculer : Mission :' })).not.toBeDisabled();
  });

  it('invoice frise back step: draft → shows delete confirmation dialog', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Facture :' }));
    expect(screen.getByText('Supprimer le brouillon ?')).toBeInTheDocument();
  });

  it('invoice frise back step: ready_to_send → shows revert to draft dialog', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'ready_to_send' })],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Facture :' }));
    expect(screen.getByText('Revenir en brouillon ?')).toBeInTheDocument();
  });

  it('invoice frise back step: sent with no payments → shows revert to ready dialog', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent', payments: [] })],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Facture :' }));
    expect(screen.getByText('Revenir à "Prête à envoyer" ?')).toBeInTheDocument();
  });

  it('invoice frise back step: sent with payments → blocked (no dialog)', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [
        invoice({
          status: 'sent',
          paidAmountCents: 45000,
          payments: [{ id: 'pay_1', amount: 45000, receivedAt: '2026-06-20', method: 'transfer', createdAt: '2026-06-20T00:00:00.000Z' }],
        }),
      ],
    };
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Facture :' }));
    expect(screen.queryByText('Revenir à "Prête à envoyer" ?')).not.toBeInTheDocument();
  });

  it('mission revert dialog confirm calls updateAppState', async () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'CONFIRMED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    const { updateAppState: mockUpdate } = await import('../../storage/localStore');
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Mission :' }));
    expect(screen.getByText('Reculer la mission ?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('invoice delete draft dialog confirm calls updateAppState', async () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    const { updateAppState: mockUpdate } = await import('../../storage/localStore');
    renderMissionsPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reculer : Facture :' }));
    expect(screen.getByText('Supprimer le brouillon ?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('invoice frise first step shows "Sans fact." not "Non créée"', () => {
    renderMissionsPage();
    expect(screen.queryByText('Non créée')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sans fact.').length).toBeGreaterThanOrEqual(1);
  });

  it('invoice frise back button enabled for draft invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    expect(screen.getByRole('button', { name: 'Reculer : Facture :' })).not.toBeDisabled();
  });

  it('detail panel CTA is "Prévisualiser la facture" for draft invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'draft' })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const panel = screen.getByTestId('mission-detail-panel');
    expect(within(panel).getByRole('button', { name: 'Prévisualiser la facture' })).toBeInTheDocument();
  });

  it('detail panel CTA is "Encaisser le solde" for sent invoice', () => {
    currentState = {
      ...baseState,
      missions: [mission({ status: 'COMPLETED', invoiceId: 'inv_1' })],
      invoices: [invoice({ status: 'sent', payments: [] })],
    };
    renderMissionsPage();
    const card = screen.getByText('MIS-2026-001').closest('[role="button"]');
    fireEvent.click(card!);
    const panel = screen.getByTestId('mission-detail-panel');
    expect(within(panel).getByRole('button', { name: 'Encaisser le solde' })).toBeInTheDocument();
  });
});
