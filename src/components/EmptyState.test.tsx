import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { lightTheme } from '../app/theme';

describe('EmptyState', () => {
  it('keeps the recovery action explicit when provided', () => {
    const onAction = vi.fn();

    render(
      <ThemeProvider theme={lightTheme}>
        <EmptyState
          title="Aucune facture"
          description="Les factures apparaîtront ici."
          actionLabel="Créer une mission"
          onAction={onAction}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'Créer une mission' })).toBeInTheDocument();
  });
});
