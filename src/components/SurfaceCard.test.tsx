import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { SurfaceCard } from './SurfaceCard';
import { lightTheme } from '../app/theme';

describe('SurfaceCard', () => {
  it('keeps the content padding when not flushed', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <SurfaceCard>
          <div data-testid="surface-content">Contenu</div>
        </SurfaceCard>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('surface-content')).toBeInTheDocument();
    expect(container.querySelector('.MuiCardContent-root')).toBeTruthy();
  });

  it('supports flush surfaces for dense cards', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <SurfaceCard flush>
          <div data-testid="surface-content">Contenu</div>
        </SurfaceCard>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('surface-content')).toBeInTheDocument();
    expect(container.querySelector('.MuiCardContent-root')).toBeTruthy();
  });
});
