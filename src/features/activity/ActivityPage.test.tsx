import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lightTheme } from '../../app/theme';
import { ActivityPage } from './ActivityPage';

const navigateMock = vi.fn();

// Mock state without priorities (zeros) - default
vi.mock('../../storage/localStore', () => ({
  useAppState: () => ({
    version: 3,
    activePharmacienId: 'ph1',
    pharmaciens: [{ id: 'ph1', nom: 'Jim Pharmacien' }],
    pharmacies: [],
    missions: [],
    invoices: [],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: { defaultTaxStatus: 'SMALL_SUPPLIER', smallSupplierThresholdCents: 50000, smallSupplierWarningRate: 0.8 },
    distanceReferences: [],
    opqPharmacistRegistry: { entries: [], sourceUrl: '' },
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
      invoiceDefaults: { invoiceDueDays: 30, paymentTerms: '' },
      pdfCalendar: {
        calendarIcsEnabled: true,
        calendarReminderMinutes: null,
        pdfFooterEnabled: true,
        calendarEventTitle: '',
        calendarReminder: 'NONE',
      },
    },
    uiSettings: { themeMode: 'system' },
    localDataSettings: { autoBackupEnabled: true },
    ui: { missionFilters: {}, auditTrail: [] },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('ActivityPage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  describe('Header', () => {
    it('does not show back link "Accueil" on activity page', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      // Should NOT have text "Accueil" anywhere
      expect(screen.queryByText('Accueil')).not.toBeInTheDocument();
    });

    it('shows eyebrow "PharmFact" in header', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByText('PharmFact')).toBeInTheDocument();
    });

    it('shows settings button in header', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('activity-options-icon')).toBeInTheDocument();
    });

    it('navigates to options when settings clicked', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      screen.getByTestId('activity-options-icon').click();
      expect(navigateMock).toHaveBeenCalledWith('/options');
    });
  });

  describe('Zero priorities state', () => {
    it('does not show Priorités section when all values are zero', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.queryByText('Priorités')).not.toBeInTheDocument();
    });
  });

  describe('Activité à venir section', () => {
    it('always shows Activité à venir section', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByText('Activité à venir')).toBeInTheDocument();
    });

    it('shows sentence format for upcoming activity', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      // Should show week number and "Aucune mission à venir" when no missions
      expect(screen.getByText(/Semaine/)).toBeInTheDocument();
      expect(screen.getByText(/Aucune mission à venir/)).toBeInTheDocument();
    });
  });

  describe('Actions rapides section', () => {
    it('shows Actions rapides section', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByText('Actions rapides')).toBeInTheDocument();
    });

    it('renders Créer une mission tile', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByText('Créer une mission')).toBeInTheDocument();
    });

    it('Créer une mission tile navigates to /mission/new', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      const createTile = screen.getByTestId('activity-action-create-mission');
      createTile.click();
      expect(navigateMock).toHaveBeenCalledWith('/mission/new');
    });

    it('shows all quick action tiles', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByText('Suivi des missions')).toBeInTheDocument();
      expect(screen.getByText('Factures & encaissement')).toBeInTheDocument();
      expect(screen.getByText('Pilotage fiscal')).toBeInTheDocument();
      expect(screen.getByText('Pharmacies')).toBeInTheDocument();
      expect(screen.getByText('Pharmaciens')).toBeInTheDocument();
    });

    it('renders tiles as clickable with testIds', () => {
      render(
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ActivityPage />
          </MemoryRouter>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('activity-action-missions')).toBeInTheDocument();
      expect(screen.getByTestId('activity-action-invoices')).toBeInTheDocument();
      expect(screen.getByTestId('activity-action-financial')).toBeInTheDocument();
      expect(screen.getByTestId('activity-action-pharmacies')).toBeInTheDocument();
      expect(screen.getByTestId('activity-action-pharmaciens')).toBeInTheDocument();
    });
  });
});
