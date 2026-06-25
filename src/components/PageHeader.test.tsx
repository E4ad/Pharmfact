import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';
import { lightTheme } from '../app/theme';

describe('PageHeader', () => {
  it('renders a compact page title with a back link', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <PageHeader
            eyebrow="Missions"
            title="Missions"
            description="Suivez les missions."
            backTo="/activity"
            backLabel="Accueil"
          />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Missions' })).toBeInTheDocument();
    expect(screen.getByText('Suivez les missions.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/activity');
  });
});
