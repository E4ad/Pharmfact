import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lightTheme } from '../../app/theme';
import { NotificationProvider } from '../../components/NotificationSystem';
import { MissionFormPage } from './MissionFormPage';

const missionFormMock = vi.hoisted(() => {
  const day = {
    id: 'day_test',
    dateService: '2026-06-22',
    startTime: '08:00',
    endTime: '17:00',
    unpaidBreakMinutes: 60,
    description: 'Mission',
    paidHours: 8,
    expenses: [],
  };

  const values = {
    pharmacienId: 'ph_test',
    pharmacieId: 'pha_test',
    actType: 'REMPLACEMENT_OFFICINE',
    dateDebut: '2026-06-22',
    dateFin: '2026-06-22',
    isMultiDay: false,
    excludedDates: [],
    defaultStartTime: '08:00',
    defaultEndTime: '17:00',
    defaultUnpaidBreakMinutes: 60,
    tauxHoraire: 85,
    distanceReferenceKm: 12,
    kmUnitRate: 0.61,
    days: [day],
    notes: '',
  };

  return {
    values,
    setValues: vi.fn(),
    pendingReceipts: [],
    existing: undefined,
    pharmacien: { id: 'ph_test', nom: 'QA Pharmacien' },
    pharmacie: {
      id: 'pha_test',
      nom: 'PJC 092 - Martin Chao',
      adresse: '123 rue Test',
      ville: 'Montréal',
      codePostal: 'H2X 1Y1',
      franchise: 'jean_coutu',
      franchiseLabel: 'Jean Coutu',
      isFavorite: true,
      weeklySchedule: {
        monday: { enabled: true, startTime: '08:00', endTime: '17:00' },
        tuesday: { enabled: false },
        wednesday: { enabled: false },
        thursday: { enabled: false },
        friday: { enabled: false },
        saturday: { enabled: false },
        sunday: { enabled: false },
        source: 'manual',
      },
    },
    setField: vi.fn(),
    regenerateDays: vi.fn((source = values) => source),
    updateDay: vi.fn(),
    addExpense: vi.fn(),
    addTypedExpense: vi.fn(),
    removeExpense: vi.fn(),
    removeDay: vi.fn(),
    updateExpense: vi.fn(),
    addReceipt: vi.fn(),
    deleteReceipt: vi.fn(),
    recalcDistance: vi.fn(),
    distanceStatus: 'manual' as 'unknown' | 'ready' | 'missing_coordinates' | 'routing_failed' | 'manual',
    distanceSource: 'manual' as 'route' | 'manual' | 'cached' | undefined,
    distanceError: undefined,
    distanceCanRoute: true,
    setManualDistance: vi.fn(),
    changePharmacie: vi.fn(),
    buildMissionFromForm: vi.fn(),
  };
});

const appStateMock = vi.hoisted(() => ({
  version: 3,
  activePharmacienId: 'ph_test',
  pharmaciens: [{ id: 'ph_test', nom: 'QA Pharmacien', hourlyRateCents: 8500 }],
  pharmacies: [
    {
      id: 'pha_test',
      nom: 'PJC 092 - Martin Chao',
      adresse: '123 rue Test',
      ville: 'Montréal',
      codePostal: 'H2X 1Y1',
      franchise: 'jean_coutu',
      franchiseLabel: 'Jean Coutu',
      isFavorite: true,
      weeklySchedule: {
        monday: { enabled: true, startTime: '08:00', endTime: '17:00' },
        tuesday: { enabled: false },
        wednesday: { enabled: false },
        thursday: { enabled: false },
        friday: { enabled: false },
        saturday: { enabled: false },
        sunday: { enabled: false },
        source: 'manual',
      },
    },
    {
      id: 'pha_other',
      nom: 'Familiprix Santé',
      adresse: '456 rue Est',
      ville: 'Montréal',
      codePostal: 'H2X 2Y2',
      franchise: 'familiprix',
      franchiseLabel: 'Familiprix',
      isFavorite: false,
    },
  ],
  missions: [],
  invoices: [],
  taxPayments: [],
  deductibleExpenses: [],
  expenseReceipts: [],
  fiscalSettings: { defaultTaxStatus: 'SMALL_SUPPLIER' },
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
}));

vi.mock('../../hooks/useMissionForm', () => ({
  useMissionForm: () => missionFormMock,
}));

vi.mock('../../storage/localStore', () => ({
  useAppState: () => appStateMock,
  setAppStateAsync: vi.fn(),
  updateAppState: vi.fn(),
}));

function renderMissionForm() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <NotificationProvider>
        <MemoryRouter initialEntries={['/missions/new']}>
          <MissionFormPage mode="create" />
        </MemoryRouter>
      </NotificationProvider>
    </ThemeProvider>,
  );
}

describe('MissionFormPage render', () => {
  beforeEach(() => {
    Object.assign(missionFormMock.values, {
      pharmacieId: 'pha_test',
      actType: 'REMPLACEMENT_OFFICINE',
      dateDebut: '2026-06-22',
      dateFin: '2026-06-22',
      isMultiDay: false,
      excludedDates: [],
      defaultStartTime: '08:00',
      defaultEndTime: '17:00',
      defaultUnpaidBreakMinutes: 60,
      tauxHoraire: 85,
      distanceReferenceKm: 12,
      kmUnitRate: 0.61,
      notes: '',
    });
    missionFormMock.values.days = [{
      id: 'day_test',
      dateService: '2026-06-22',
      startTime: '08:00',
      endTime: '17:00',
      unpaidBreakMinutes: 60,
      description: 'Mission',
      paidHours: 8,
      expenses: [],
    }];
    missionFormMock.distanceStatus = 'manual';
    missionFormMock.distanceSource = 'manual';
    missionFormMock.distanceError = undefined;
    missionFormMock.distanceCanRoute = true;
    vi.clearAllMocks();
  });

  it('shows a compact create header with a return link to Missions', () => {
    renderMissionForm();

    expect(screen.getByRole('heading', { name: 'Nouvelle mission' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Missions' })).toHaveAttribute('href', '/missions');
    expect(screen.queryByText(/Créez une mission de remplacement/)).not.toBeInTheDocument();
  });

  it('keeps form sections and create actions visible', () => {
    renderMissionForm();

    expect(screen.getByRole('button', { name: /Choisir le pharmacien, QA Pharmacien/ })).toBeInTheDocument();
    expect(screen.getByText('QA Pharmacien')).toBeInTheDocument();
    expect(screen.queryByText('Taux, adresse de départ et facturation')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Parcours de création de mission')).toBeInTheDocument();
    expect(screen.getByTestId('mission-live-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. Contexte' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Profil et pharmacie' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Pharmacie' })).not.toBeInTheDocument();
    expect(screen.getAllByText('PJC 092 - Martin Chao').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Favorite')).toBeInTheDocument();
    expect(screen.getByText(/Jean Coutu/)).toBeInTheDocument();
    expect(screen.getByText(/lundi 08:00–17:00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Changer de pharmacie/ })).toBeInTheDocument();
    expect(screen.queryByText('Pharmacie sélectionnée')).not.toBeInTheDocument();
    expect(screen.getAllByText(/123 rue Test/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { name: '2. Mission' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mission' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Type de mission' })).toHaveTextContent('Remplacement en officine');
    expect(screen.getByText('Période de mission')).toBeInTheDocument();
    expect(screen.getByLabelText('Calendrier de sélection des jours travaillés')).toBeInTheDocument();
    expect(screen.getByText('1 jour sélectionné')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mettre à jour les jours' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Période :/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3. Horaire' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Horaire' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4. Jours travaillés' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Jours, frais et notes' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Résumé' })).toBeInTheDocument();
    expect(screen.queryByText('Contrôle permanent')).not.toBeInTheDocument();
    expect(screen.queryByText('Voir le détail')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Aperçu facture' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Statut distance' })).not.toBeInTheDocument();
    expect(screen.queryByText('Facture liée')).not.toBeInTheDocument();
    expect(screen.queryByText(/Libellé facture/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prérempli/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Préremplie/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Taux horaire ($ / h)')).toBeInTheDocument();
    const contextSection = screen.getByRole('heading', { name: '1. Contexte' }).closest('section');
    const scheduleSection = screen.getByRole('heading', { name: '3. Horaire' }).closest('section');
    expect(contextSection).not.toBeNull();
    expect(scheduleSection).not.toBeNull();
    expect(within(contextSection as HTMLElement).getByLabelText('Taux horaire ($ / h)')).toBeInTheDocument();
    expect(within(scheduleSection as HTMLElement).queryByLabelText('Taux horaire ($ / h)')).not.toBeInTheDocument();
    expect(within(scheduleSection as HTMLElement).getByLabelText('Début')).toBeInTheDocument();
    expect(within(scheduleSection as HTMLElement).getByLabelText('Fin')).toBeInTheDocument();
    expect(within(scheduleSection as HTMLElement).getByLabelText('Pause')).toBeInTheDocument();
    expect(screen.queryByText(/Distance saisie manuellement/)).not.toBeInTheDocument();
    expect(screen.queryByText('Distance domicile → pharmacie')).not.toBeInTheDocument();
    expect(screen.queryByText('Frais km')).not.toBeInTheDocument();
    expect(screen.queryByText('Coordonnées manquantes pour le profil pharmacien')).not.toBeInTheDocument();
    expect(screen.queryByText('Frais km calculés uniquement avec une distance affichée.')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Saisir manuellement la distance aller-retour en kilomètres' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/08:00 → 17:00 · pause 60 min · 8,00 h payées/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+ Ajouter un frais')).toBeInTheDocument();
    expect(screen.queryByText('Frais : 0,00 $')).not.toBeInTheDocument();
    expect(screen.getAllByText(/total mission/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PJC 092 - Martin Chao').length).toBeGreaterThanOrEqual(1);

    const sidebar = screen.getByTestId('mission-live-sidebar');
    expect(within(sidebar).getByText(/Jours travaillés/)).toBeInTheDocument();
    expect(within(sidebar).queryByText(/12.0 km AR · saisie manuelle/)).not.toBeInTheDocument();
    expect(within(sidebar).getAllByText(/8,00 h/).length).toBeGreaterThanOrEqual(1);
    expect(within(sidebar).getByRole('button', { name: 'Enregistrer brouillon' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Valider' })).toBeInTheDocument();
    expect(within(sidebar).queryByRole('button', { name: 'Valider mission' })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole('button', { name: 'Valider et générer facture' })).not.toBeInTheDocument();
    expect(within(sidebar).getByTestId('mission-primary-submit')).toHaveClass('MuiButton-contained');
    expect(within(sidebar).queryByText(/Choisissez si la mission/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Valider' })).toHaveLength(1);
  });

  it('opens the pharmacy picker and selects an existing pharmacy', () => {
    renderMissionForm();

    fireEvent.click(screen.getByRole('button', { name: /Changer de pharmacie/ }));

    expect(screen.getByTestId('pharmacy-picker-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choisir une pharmacie' })).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Familiprix Santé')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sélectionner Familiprix Santé' }));

    expect(missionFormMock.changePharmacie).toHaveBeenCalledWith('pha_other');
  });

  it('filters pharmacies in the picker and toggles favorites without selecting', () => {
    renderMissionForm();

    fireEvent.click(screen.getByRole('button', { name: /Changer de pharmacie/ }));
    fireEvent.change(screen.getByLabelText('Recherche'), { target: { value: 'familiprix' } });

    const picker = screen.getByTestId('pharmacy-picker-modal');
    expect(within(picker).getByText('Familiprix Santé')).toBeInTheDocument();
    expect(within(picker).queryByText('PJC 092 - Martin Chao')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter aux favorites' }));

    expect(missionFormMock.changePharmacie).not.toHaveBeenCalled();
  });

  it('updates the mission hourly rate from the context section', () => {
    renderMissionForm();
    missionFormMock.setValues.mockClear();
    missionFormMock.regenerateDays.mockClear();

    const contextSection = screen.getByRole('heading', { name: '1. Contexte' }).closest('section');
    expect(contextSection).not.toBeNull();

    fireEvent.change(within(contextSection as HTMLElement).getByLabelText('Taux horaire ($ / h)'), {
      target: { value: '110' },
    });

    expect(missionFormMock.setValues).toHaveBeenCalledTimes(1);
    const updater = missionFormMock.setValues.mock.calls[0][0] as (current: typeof missionFormMock.values) => typeof missionFormMock.values;
    const next = updater(missionFormMock.values);

    expect(next.tauxHoraire).toBe(110);
    expect(next.defaultStartTime).toBe('08:00');
    expect(next.defaultEndTime).toBe('17:00');
    expect(next.defaultUnpaidBreakMinutes).toBe(60);
  });

  it('keeps distance as a single summary line when it is missing', () => {
    Object.assign(missionFormMock.values, {
      distanceReferenceKm: 0,
    });
    missionFormMock.distanceStatus = 'missing_coordinates';
    missionFormMock.distanceSource = undefined;
    missionFormMock.distanceCanRoute = false;

    renderMissionForm();

    expect(screen.queryByText('Distance : coordonnées manquantes')).not.toBeInTheDocument();
    expect(screen.queryByText('Coordonnées manquantes pour les deux adresses')).not.toBeInTheDocument();
    expect(screen.queryByText('Coordonnées manquantes pour le profil pharmacien')).not.toBeInTheDocument();

    const sidebar = screen.getByTestId('mission-live-sidebar');
    expect(within(sidebar).queryByText('coordonnées manquantes')).not.toBeInTheDocument();
    expect(within(sidebar).queryByText('Distance non calculée')).not.toBeInTheDocument();
  });

  it('selects mission days from the compact calendar', () => {
    Object.assign(missionFormMock.values, {
      isMultiDay: true,
      dateFin: '2026-06-26',
    });
    missionFormMock.values.days = [
      { ...missionFormMock.values.days[0], id: 'day_1', dateService: '2026-06-22' },
      { ...missionFormMock.values.days[0], id: 'day_2', dateService: '2026-06-23' },
    ];

    renderMissionForm();

    expect(screen.queryByRole('checkbox', { name: 'Plusieurs jours' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Désélectionner le 2026-06-22' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Désélectionner le 2026-06-23' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Mettre à jour les jours' })).not.toBeInTheDocument();
    expect(screen.getAllByText('5 jours sélectionnés').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/^Période :/)).not.toBeInTheDocument();

    missionFormMock.setValues.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Sélectionner le 2026-06-27' }));
    expect(missionFormMock.setValues).toHaveBeenCalledTimes(1);
  });
});
