import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { NotificationProvider } from './NotificationSystem';
import { NotFoundState } from './NotFoundState';
import { lightTheme } from '../app/theme';

function renderState() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <NotificationProvider>
        <MemoryRouter>
          <NotFoundState
            title="Mission introuvable"
            description="La mission demandée n’existe plus."
            actionLabel="Retour aux missions"
            actionTo="/missions"
          />
        </MemoryRouter>
      </NotificationProvider>
    </ThemeProvider>,
  );
}

describe('NotFoundState', () => {
  it('renders the missing-entity message and recovery CTA', () => {
    renderState();

    expect(screen.getByText('Mission introuvable')).toBeInTheDocument();
    expect(screen.getByText('La mission demandée n’existe plus.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour aux missions' })).toHaveAttribute('href', '/missions');
  });
});
