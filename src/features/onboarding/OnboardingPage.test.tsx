import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OnboardingPage } from './OnboardingPage';
import { lightTheme } from '../../app/theme';
import { importAppState } from '../../storage/localStore';
import { createDemoState, createSeedState } from '../../storage/seedData';

const originalLocalStorage = globalThis.localStorage;
let store: Record<string, string> = {};

function createEmptyState() {
  const seed = createSeedState();
  return {
    ...seed,
    activePharmacienId: null,
    pharmaciens: [],
    pharmacies: [],
    missions: [],
    invoices: [],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    distanceReferences: [],
    ui: {
      ...seed.ui,
      missionFilters: {},
      auditTrail: [],
    },
  };
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    store = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, writable: true });
  });

  it('shows a stable onboarding step when the app has no data', async () => {
    importAppState(JSON.stringify(createEmptyState()));

    render(
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter initialEntries={['/welcome']}>
          <OnboardingPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('onboarding-create-pharmacien')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.localStorage.getItem('in_onboarding_flow')).toBe('true');
    });
  });

  it('keeps the profile selection when onboarding is not needed', () => {
    importAppState(JSON.stringify(createDemoState()));
    window.localStorage.removeItem('in_onboarding_flow');

    render(
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter initialEntries={['/welcome']}>
          <OnboardingPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Qui êtes-vous ?' })).toBeInTheDocument();
  });
});
