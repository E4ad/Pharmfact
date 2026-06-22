import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  bootstrapState: { status: 'loading' as 'loading' | 'ready' | 'error', errorMessage: undefined as string | undefined },
  routerShouldThrow: false,
}));

vi.mock('../storage/localStore', () => ({
  useAppState: () => ({
    version: 3,
    activePharmacienId: '',
    pharmaciens: [],
    pharmacies: [],
    missions: [],
    invoices: [],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: { defaultTaxStatus: 'SMALL_SUPPLIER' },
    distanceReferences: [],
    opqPharmacistRegistry: { entries: [], sourceUrl: 'https://example.invalid' },
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
    uiSettings: { themeMode: 'system' },
    localDataSettings: { autoBackupEnabled: true },
    ui: { missionFilters: {}, auditTrail: [] },
  }),
  useStorageBootstrapState: () => mockState.bootstrapState,
  retryStorageBootstrap: vi.fn(),
  startWithEmptyState: vi.fn(),
}));

vi.mock('../hooks/useAutoBackup', () => ({
  useAutoBackup: vi.fn(),
}));

vi.mock('../components/ThemeToolbar', () => ({
  ThemeToolbar: () => null,
}));

vi.mock('./router', () => ({
  router: {},
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    RouterProvider: () => {
      if (mockState.routerShouldThrow) {
        throw new Error('Routeur indisponible');
      }

      return <div data-testid="router-provider" />;
    },
  };
});

import App from './App';

describe('App bootstrap', () => {
  beforeEach(() => {
    mockState.bootstrapState = { status: 'loading', errorMessage: undefined };
    mockState.routerShouldThrow = false;
  });

  it('shows a bootstrap screen while Tauri storage is still loading', () => {
    render(<App />);

    expect(screen.getByTestId('storage-bootstrap-screen')).toBeInTheDocument();
    expect(screen.getByText('Chargement des données')).toBeInTheDocument();
    expect(screen.queryByTestId('router-provider')).not.toBeInTheDocument();
  });

  it('shows a recovery screen when Tauri storage fails', () => {
    mockState.bootstrapState = { status: 'error', errorMessage: 'Stockage indisponible' };

    render(<App />);

    expect(screen.getByTestId('storage-bootstrap-error-screen')).toBeInTheDocument();
    expect(screen.getByText('Stockage indisponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Démarrer avec un état vide' })).toBeInTheDocument();
    expect(screen.queryByTestId('router-provider')).not.toBeInTheDocument();
  });

  it('shows a render error screen when React rendering fails after bootstrap', () => {
    mockState.bootstrapState = { status: 'ready', errorMessage: undefined };
    mockState.routerShouldThrow = true;

    render(<App />);

    expect(screen.getByTestId('app-render-error-screen')).toBeInTheDocument();
    expect(screen.getByText('Routeur indisponible')).toBeInTheDocument();
  });
});
