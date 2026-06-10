import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MissionFormPage } from '../../../features/missions/MissionFormPage';

// Mock des dépendances
vi.mock('../../../storage/localStore', () => ({
  useAppState: () => ({
    version: 2,
    activePharmacienId: 'pharmacien-1',
    pharmaciens: [{
      id: 'pharmacien-1',
      nom: 'Jean Dupont',
      adresse: '123 Rue Test',
      ville: 'Montréal',
      codePostal: 'H1H 1H1',
      telephone: '555-1234',
      email: 'jean@test.com',
      hourlyRateCents: 8000,
      distanceKmDomicile: 10,
      taxStatus: 'SMALL_SUPPLIER',
    }],
    pharmacies: [{
      id: 'pharmacie-1',
      nom: 'Pharmacie Test',
      adresse: '456 Rue Pharmacie',
      ville: 'Montréal',
      codePostal: 'H2H 2H2',
      telephone: '555-5678',
      email: 'pharmacie@test.com',
      defaultBreakMinutes: 60,
    }],
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
      defaultTaxStatus: 'SMALL_SUPPLIER',
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
  updateAppState: vi.fn(),
}));

vi.mock('../../../storage/selectors', () => ({
  findPharmacien: (state: any, id: string) => state.pharmaciens.find((p: any) => p.id === id),
  findPharmacie: (state: any, id: string) => state.pharmacies.find((p: any) => p.id === id),
  findInvoice: () => undefined,
  findMission: () => undefined,
  missionInvoice: () => undefined,
  resolveMissionDefaults: (state: any) => ({
    missionType: 'REMPLACEMENT_OFFICINE',
    startTime: '08:00',
    endTime: '17:00',
    breakMinutes: 60,
    mealAutoEnabled: true,
    mealThresholdHours: 8,
    mealDefaultCents: 2000,
    mileageRateCents: 61,
  }),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

describe('MissionFormPage - Bouton Accueil', () => {
  test('bouton Accueil visible sur nouvelle mission', () => {
    render(
      <MemoryRouter>
        <MissionFormPage mode="create" />
      </MemoryRouter>
    );

    const backButton = screen.getByTestId('mission-form-back-button');
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveTextContent('Accueil');
  });

  test('bouton Missions visible sur modification de mission', () => {
    render(
      <MemoryRouter>
        <MissionFormPage mode="edit" />
      </MemoryRouter>
    );

    const backButton = screen.getByTestId('mission-form-back-button');
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveTextContent('Missions');
  });

  test('bouton aligné en haut à gauche', () => {
    render(
      <MemoryRouter>
        <MissionFormPage mode="create" />
      </MemoryRouter>
    );

    const backButton = screen.getByTestId('mission-form-back-button');
    // Le bouton devrait être dans le mission-form-heading
    expect(backButton).toBeInTheDocument();
  });

  test('clic sur bouton retourne à la bonne page', () => {
    mockNavigate.mockClear();
    render(
      <MemoryRouter>
        <MissionFormPage mode="create" />
      </MemoryRouter>
    );

    const backButton = screen.getByTestId('mission-form-back-button');
    fireEvent.click(backButton);
    
    // Devrait naviguer vers /activity pour nouvelle mission
    expect(mockNavigate).toHaveBeenCalledWith('/activity');
  });
});
