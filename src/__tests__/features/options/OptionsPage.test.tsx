import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OptionsPage } from '../../../features/options/OptionsPage';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock des dépendances
vi.mock('../../../storage/localStore', () => ({
  useAppState: () => ({
    version: 2,
    activePharmacienId: 'pharmacien-1',
    pharmaciens: [{ id: 'pharmacien-1', nom: 'Jean Dupont', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 0, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
    pharmacies: [],
    missions: [],
    invoices: [],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: {
      reserveRate: 0.3,
      fiscalYearStartMonth: 1,
      currentFiscalYear: 2024,
      smallSupplierThresholdCents: 3000000,
      smallSupplierWarningRate: 0.8,
      instalmentDates: [],
      quebecNetTaxOwingThresholdCents: 30000,
      federalNetTaxOwingThresholdCents: 30000,
      federalDefaultNetTaxOwingThresholdCents: 30000,
      mileageRateCents: 61,
      currentYear: 2024,
      defaultTaxStatus: 'SMALL_SUPPLIER',
      includeMissionDeductibleExpenses: true,
      trackExpenseReceipts: true,
      warnMissingExpenseReceipts: true,
      showMonthlyView: true,
      showQuarterlyView: true,
      showAnnualView: true,
      enableInstalmentTracking: true,
      enableSmallSupplierTracking: true,
      enableExpenseTracking: true,
    },
    distanceReferences: [],
    appOptions: {
      missionDefaults: {
        defaultMissionType: 'REMPLACEMENT_OFFICINE',
        defaultStartTime: '08:00',
        defaultEndTime: '17:00',
        defaultBreakMinutes: 60,
        mealAutoEnabled: true,
        mealThresholdHours: 8,
        mealDefaultCents: 2000,
        mileageRateCents: 61,
      },
      invoiceDefaults: {
        invoiceDueDays: 30,
        paymentTerms: 'Paiement par virement dans les 30 jours.',
      },
      pdfCalendar: {
        calendarIcsEnabled: true,
        calendarReminderMinutes: null,
        pdfFooterEnabled: true,
        calendarEventTitle: 'Mission pharmacie',
        calendarReminder: 'NONE',
      },
    },
    uiSettings: { themeMode: 'light' },
    localDataSettings: { autoBackupEnabled: true },
    ui: { missionFilters: {}, lastVisitedAt: undefined },
  }),
  setAppState: vi.fn(),
}));

vi.mock('../../../storage/selectors', () => ({
  activePharmacien: (state: any) => state.pharmaciens[0],
  selectAppOptions: (state: any) => state.appOptions,
  selectFinancialOptions: (state: any) => state.fiscalSettings,
  selectUiOptions: (state: any) => state.uiSettings,
  selectLocalDataOptions: (state: any) => state.localDataSettings,
}));

describe('OptionsPage', () => {
  test('affiche toutes les tuiles de configuration', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <OptionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const expectedTiles = [
      'Profil actif',
      'Pharmaciens',
      'Pharmacies',
      'Paramètres mission',
      'Financier & fiscalité',
      'PDF & calendrier',
      'Référentiel des missions',
      'Données locales',
      'Apparence',
    ];

    expectedTiles.forEach(tile => {
      expect(screen.getByText(tile)).toBeInTheDocument();
    });
  });

  test('affiche le bouton de retour vers Accueil', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <OptionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('options-back-button')).toBeInTheDocument();
  });

  test('clic sur tuile Apparence ouvre le drawer', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <OptionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const appearanceTile = screen.getByTestId('options-tile-appearance');
    fireEvent.click(appearanceTile);

    expect(screen.getByTestId('appearance-drawer')).toBeInTheDocument();
  });

  test('clic sur tuile Financier ouvre le drawer', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <OptionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const financialTile = screen.getByTestId('options-tile-financial');
    fireEvent.click(financialTile);

    expect(screen.getByTestId('financial-drawer')).toBeInTheDocument();
  });

  test('clic sur tuile Référentiel des missions ouvre le drawer', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <OptionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    const missionRefTile = screen.getByTestId('options-tile-mission-ref');
    fireEvent.click(missionRefTile);

    expect(screen.getByTestId('mission-ref-drawer')).toBeInTheDocument();
  });

  test('Escape ferme le drawer ouvert', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <OptionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    // Ouvrir un drawer
    const financialTile = screen.getByTestId('options-tile-financial');
    fireEvent.click(financialTile);
    expect(screen.getByTestId('financial-drawer')).toBeInTheDocument();

    // Fermer avec Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('financial-drawer')).not.toBeInTheDocument();
  });

  test('affiche le message d\'info sur la sauvegarde', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <OptionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Cliquez sur une tuile pour configurer/)).toBeInTheDocument();
  });
});
