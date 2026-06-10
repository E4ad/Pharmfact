/**
 * Types communs partagés à travers l'application
 */

// Mode de thème
export type ThemeMode = 'light' | 'dark' | 'system';

// Statut temporel des mois
export type MonthTemporalStatus = 'PAST' | 'CURRENT' | 'FUTURE';

// Ligne de dépenses annuelles pour le tableau récapitulatif
export type AnnualExpenseRow = {
  month: number; // 1-12
  monthLabel: string;
  status: MonthTemporalStatus;
  manualDeductibleExpensesCents: number;
  missionGeneratedDeductibleExpensesCents: number;
  totalDeductibleExpensesCents: number;
  missingRecommendedReceiptsCount: number;
  missingRequiredReceiptsCount: number;
};

// Props pour les composants de tuiles
export interface TileProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  value?: string | number;
  onClick: () => void;
  testId?: string;
  disabled?: boolean;
}

// Types pour les métriques financières
export type FinancialMetric = {
  label: string;
  valueCents: number;
  helperText: string;
  icon: React.ReactNode;
  iconTone?: 'green' | 'blue' | 'amber' | 'purple' | 'gray';
};
