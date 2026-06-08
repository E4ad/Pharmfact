import type { TaxStatus } from '../schema';

export type FiscalSettings = {
  reserveRate: number;
  fiscalYearStartMonth: number;
  currentFiscalYear: number;
  smallSupplierThresholdCents: number;
  smallSupplierWarningRate: number;
  instalmentDates: string[];
  quebecNetTaxOwingThresholdCents: number;
  federalNetTaxOwingThresholdCents: number;
  federalDefaultNetTaxOwingThresholdCents: number;
  mileageRateCents?: number;
  currentYear: number;
  defaultTaxStatus: TaxStatus;
  includeMissionDeductibleExpenses: boolean;
  trackExpenseReceipts: boolean;
  warnMissingExpenseReceipts: boolean;
  showMonthlyView: boolean;
  showQuarterlyView: boolean;
  showAnnualView: boolean;
  enableInstalmentTracking: boolean;
  enableSmallSupplierTracking: boolean;
  enableExpenseTracking: boolean;
  mealDeductibleRate?: number;
  mileageDeductibleRate?: number;
  parkingDeductibleRate?: number;
  tollDeductibleRate?: number;
  lodgingDeductibleRate?: number;
  transportDeductibleRate?: number;
  suppliesDeductibleRate?: number;
  otherNonDeductibleRate?: number;
};

export function createDefaultFiscalSettings(year: number = new Date().getFullYear()): FiscalSettings {
  return {
    reserveRate: 0.3,
    fiscalYearStartMonth: 1,
    currentFiscalYear: year,
    smallSupplierThresholdCents: 3_000_000,
    smallSupplierWarningRate: 0.8,
    instalmentDates: ['03-15', '06-15', '09-15', '12-15'],
    quebecNetTaxOwingThresholdCents: 180_000,
    federalNetTaxOwingThresholdCents: 300_000,
    federalDefaultNetTaxOwingThresholdCents: 300_000,
    mileageRateCents: 61,
    currentYear: year,
    defaultTaxStatus: 'SMALL_SUPPLIER',
    includeMissionDeductibleExpenses: true,
    trackExpenseReceipts: true,
    warnMissingExpenseReceipts: true,
    showMonthlyView: true,
    showQuarterlyView: true,
    showAnnualView: true,
    enableInstalmentTracking: true,
    enableSmallSupplierTracking: true,
    enableExpenseTracking: true,
  };
}