import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { MissionSummaryPanel } from './MissionSummaryPanel';
import { lightTheme } from '../../../app/theme';

const defaultProps = {
  pharmacyName: 'PJC 092',
  pharmacyAddress: '4466, rue Beaubien Est, Montréal, QC H1X 1H9',
  dates: '18 juin 2026',
  daysWorked: 1,
  paidHours: 8,
  hourlyRateCents: 8000,
  subtotalCents: 64000,
  expensesCents: 0,
  totalCents: 64000,
};

function renderPanel(props: Partial<typeof defaultProps> & { topBar?: React.ReactNode; missionCode?: string; children?: React.ReactNode } = {}) {
  const { children, ...rest } = props;
  return render(
    <ThemeProvider theme={lightTheme}>
      <MissionSummaryPanel {...defaultProps} {...rest}>
        {children}
      </MissionSummaryPanel>
    </ThemeProvider>,
  );
}

describe('MissionSummaryPanel', () => {
  it('renders pharmacy name, address and Résumé heading', () => {
    renderPanel();
    expect(screen.getByText('PJC 092')).toBeInTheDocument();
    expect(screen.getByText('4466, rue Beaubien Est, Montréal, QC H1X 1H9')).toBeInTheDocument();
    expect(screen.getByText('Résumé')).toBeInTheDocument();
  });

  it('renders missionCode when provided', () => {
    renderPanel({ missionCode: 'MIS-2026-001' });
    expect(screen.getByText('MIS-2026-001')).toBeInTheDocument();
  });

  it('does not render missionCode element when omitted', () => {
    renderPanel();
    expect(screen.queryByText('MIS-2026-001')).not.toBeInTheDocument();
  });

  it('renders topBar content when provided', () => {
    renderPanel({ topBar: <button aria-label="Fermer le panneau">✕</button> });
    expect(screen.getByLabelText('Fermer le panneau')).toBeInTheDocument();
  });

  it('does not render topBar wrapper when topBar is omitted', () => {
    renderPanel();
    expect(screen.queryByLabelText('Fermer le panneau')).not.toBeInTheDocument();
  });

  it('renders Frais row when expensesCents > 0', () => {
    renderPanel({ expensesCents: 2000 });
    expect(screen.getByText('Frais')).toBeInTheDocument();
  });

  it('hides Frais row when expensesCents is 0', () => {
    renderPanel({ expensesCents: 0 });
    expect(screen.queryByText('Frais')).not.toBeInTheDocument();
  });

  it('renders children inside the panel', () => {
    renderPanel({ children: <span data-testid="child-node">Statut mission</span> });
    expect(screen.getByTestId('child-node')).toBeInTheDocument();
  });
});
