import type { DeductibleExpense, ExpenseReceipt, FiscalSettings, Invoice, Mission, Pharmacien, TaxPayment } from '../storage/schema';

export type FinancialWarning = {
  id: string;
  level: 'info' | 'warning' | 'danger';
  scope: 'monthly' | 'quarterly' | 'annual';
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export type MonthlyFinancialSnapshot = {
  month: string;
  quarterLabel: string;
  invoicedCents: number;
  collectedCents: number;
  receivableCents: number;
  overdueCents: number;
  manualDeductibleExpensesCents: number;
  missionGeneratedDeductibleExpensesCents: number;
  deductibleExpensesCents: number;
  incomeTaxInstalmentsPaidCents: number;
  estimatedNetProfitCents: number;
  targetReserveCents: number;
  reserveRate: number;
  remainingProvisionCents: number;
  warnings: FinancialWarning[];
  gstCollectedCents?: number;
  qstCollectedCents?: number;
  gstQstCollectedCents?: number;
  gstQstRemittedCents?: number;
};

export type QuarterlyFinancialSnapshot = {
  quarter: number;
  year: number;
  label: string;
  invoicedCents: number;
  collectedCents: number;
  receivableCents: number;
  overdueCents: number;
  manualDeductibleExpensesCents: number;
  missionGeneratedDeductibleExpensesCents: number;
  deductibleExpensesCents: number;
  estimatedNetProfitCents: number;
  targetReserveCents: number;
  remainingProvisionCents: number;
  nextInstalmentDate?: string;
  suggestedInstalmentCents?: number;
  incomeTaxInstalmentsPaidCents?: number;
  instalmentGapCents?: number;
  warnings: FinancialWarning[];
  smallSupplierStatus?: 'ELIGIBLE' | 'NEAR_LIMIT' | 'OVER_LIMIT' | 'UNDER_THRESHOLD' | 'THRESHOLD_REACHED';
  rollingFourQuartersTaxableSuppliesCents?: number;
};

export type AnnualFinancialSnapshot = {
  year: number;
  invoicedCents: number;
  collectedCents: number;
  receivableCents: number;
  overdueCents: number;
  manualDeductibleExpensesCents: number;
  missionGeneratedDeductibleExpensesCents: number;
  deductibleExpensesCents: number;
  estimatedNetProfitCents: number;
  targetReserveCents: number;
  remainingProvisionCents: number;
  quarters: QuarterlyFinancialSnapshot[];
  months: MonthlyFinancialSnapshot[];
  warnings: FinancialWarning[];
  gstQstRemittedCents?: number;
  gstQstRemainingCents?: number;
  incomeTaxInstalmentsPaidCents?: number;
  rollingFourQuartersTaxableSuppliesCents?: number;
  recoveryRate?: number;
  averagePaymentDelayDays?: number;
};

export type MissionDeductibleExpenseRow = {
  id: string;
  date: string;
  label: string;
  category: string;
  amountCents: number;
  missionId: string;
  missionDayId?: string;
  missionCode?: string;
  typeLabel?: string;
  deductibleAmountCents?: number;
  hasReceipt?: boolean;
  receiptRecommended?: boolean;
  receiptRequired?: boolean;
};

function generateMonthlyWarnings(data: {
  invoices: Invoice[];
  todayIso: string;
  fiscalSettings: FiscalSettings;
  missionExpenses: MissionDeductibleExpenseRow[];
  expenseReceipts?: ExpenseReceipt[];
}): FinancialWarning[] {
  const warnings: FinancialWarning[] = [];
  const month = data.todayIso.slice(0, 7);

  const monthInvoices = data.invoices.filter((invoice) => invoice.dateFacture.startsWith(month));

  const overdueInvoices = monthInvoices.filter(
    (invoice) => invoice.status === 'SENT' && new Date(data.todayIso) > new Date(invoice.dateEcheance),
  );

  if (overdueInvoices.length > 0) {
    warnings.push({
      id: 'overdue-invoices-warning',
      level: 'warning',
      scope: 'monthly',
      title: 'Factures en retard',
      message: `Vous avez ${overdueInvoices.length} facture(s) en retard de paiement.`,
    });
  }

  const missingReceipts = monthInvoices.filter((invoice) => invoice.status === 'SENT');

  if (missingReceipts.length > 0) {
    warnings.push({
      id: 'missing-receipts-warning',
      level: 'warning',
      scope: 'monthly',
      title: 'Justificatifs manquants',
      message: `Vous avez ${missingReceipts.length} facture(s) sans justificatif.`,
    });
  }

  const missionExpensesMissingReceipts = data.missionExpenses.filter((e) => e.receiptRecommended && !e.hasReceipt);
  if (missionExpensesMissingReceipts.length > 0) {
    const recommendedMissing = missionExpensesMissingReceipts.filter((e) => !e.receiptRequired);
    if (recommendedMissing.length > 0) {
      warnings.push({
        id: 'mission-receipts-recommended',
        level: 'warning',
        scope: 'monthly',
        title: 'Justificatifs recommandés manquants',
        message: `Vous avez ${recommendedMissing.length} dépense(s) avec justificatif recommandé manquant.`,
      });
    }
    const requiredMissing = missionExpensesMissingReceipts.filter((e) => e.receiptRequired);
    if (requiredMissing.length > 0) {
      warnings.push({
        id: 'mission-receipts-required',
        level: 'danger',
        scope: 'monthly',
        title: 'Justificatifs requis manquants',
        message: `Vous avez ${requiredMissing.length} dépense(s) avec justificatif requis manquant.`,
      });
    }
  }

  const unprocessedExpenseReceipts = (data.expenseReceipts ?? []).filter((receipt) => receipt.ocrStatus === 'NOT_PROCESSED');
  if (unprocessedExpenseReceipts.length > 0) {
    warnings.push({
      id: 'missing-receipts-warning-expense',
      level: 'warning',
      scope: 'monthly',
      title: 'Justificatifs de dépenses non traités',
      message: `Vous avez ${unprocessedExpenseReceipts.length} justificatif(s) de dépense en attente de traitement.`,
    });
  }

  return warnings;
}

export function collectMissionDeductibleExpenseRows(
  missions: Mission[],
  fiscalSettings: FiscalSettings,
): MissionDeductibleExpenseRow[] {
  return missions.flatMap((mission) =>
    mission.days.flatMap((day) =>
      day.expenses
        ?.filter((expense) => expense.createsDeductibleExpense)
        .map((expense) => ({
          id: expense.id,
          date: day.dateService,
          label: expense.label,
          category: expense.deductibleCategory,
          amountCents: expense.amountCents,
          missionId: mission.id,
          missionDayId: day.id,
          missionCode: mission.missionCode,
          typeLabel: expense.typeKey,
          deductibleAmountCents: expense.amountCents * (expense.deductibleRate / 100),
          hasReceipt: !!expense.receiptIds?.length,
          receiptRecommended: fiscalSettings.trackExpenseReceipts && !expense.receiptIds?.length,
          receiptRequired: fiscalSettings.warnMissingExpenseReceipts && !expense.receiptIds?.length,
        })) || [],
    ),
  );
}

export function buildMonthlyFinancialSnapshots(data: {
  invoices: Invoice[];
  taxPayments: TaxPayment[];
  expenses: DeductibleExpense[];
  fiscalSettings: FiscalSettings;
  todayIso: string;
  missions?: Mission[];
  pharmaciens?: Pharmacien[];
  expenseReceipts?: ExpenseReceipt[];
}): MonthlyFinancialSnapshot[] {
  const currentYear = new Date(data.todayIso).getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    const invoices = data.invoices.filter((invoice) => invoice.dateFacture.startsWith(month));
    const taxPayments = data.taxPayments.filter((payment) => payment.date.startsWith(month));
    const expenses = data.expenses.filter((expense) => expense.date.startsWith(month));
    const missions = data.missions || [];
    const missionExpenses = collectMissionDeductibleExpenseRows(
      missions.filter((m) => m.days.some((d) => d.dateService.startsWith(month))),
      data.fiscalSettings,
    ).filter((e) => e.date.startsWith(month));

    const invoicedCents = invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0);
    const collectedCents = invoices.reduce((sum, invoice) => (invoice.status === 'PAID' ? sum + invoice.amountCents : sum), 0);
    const receivableCents = invoices.reduce((sum, invoice) => (invoice.status === 'SENT' ? sum + invoice.amountCents : sum), 0);
    const overdueCents = invoices.reduce(
      (sum, invoice) => (invoice.status === 'SENT' && new Date(data.todayIso) > new Date(invoice.dateEcheance) ? sum + invoice.amountCents : sum),
      0,
    );

    const manualDeductibleExpensesCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
    const missionGeneratedDeductibleExpensesCents = missionExpenses.reduce((sum, expense) => sum + (expense.deductibleAmountCents || 0), 0);
    const deductibleExpensesCents = manualDeductibleExpensesCents + missionGeneratedDeductibleExpensesCents;

    const incomeTaxInstalmentsPaidCents = taxPayments.reduce((sum, payment) => sum + payment.amountCents, 0);

    const estimatedNetProfitCents = Math.max(collectedCents - deductibleExpensesCents - incomeTaxInstalmentsPaidCents, 0);
    const targetReserveCents = Math.round(estimatedNetProfitCents * (data.fiscalSettings.reserveRate / 100));
    const remainingProvisionCents = targetReserveCents;

    const warnings = generateMonthlyWarnings({ invoices, todayIso: data.todayIso, fiscalSettings: data.fiscalSettings, missionExpenses, expenseReceipts: data.expenseReceipts });

    const quarter = Math.ceil((i + 1) / 3);

    return {
      month,
      quarterLabel: `T${quarter}`,
      invoicedCents,
      collectedCents,
      receivableCents,
      overdueCents,
      manualDeductibleExpensesCents,
      missionGeneratedDeductibleExpensesCents,
      deductibleExpensesCents,
      incomeTaxInstalmentsPaidCents,
      estimatedNetProfitCents,
      targetReserveCents,
      reserveRate: data.fiscalSettings.reserveRate,
      remainingProvisionCents,
      warnings,
      gstCollectedCents: 0,
      qstCollectedCents: 0,
      gstQstCollectedCents: 0,
      gstQstRemittedCents: 0,
    };
  });

  return months;
}

export function buildQuarterlyFinancialSnapshots(data: {
  invoices: Invoice[];
  taxPayments: TaxPayment[];
  expenses: DeductibleExpense[];
  fiscalSettings: FiscalSettings;
  todayIso: string;
  missions?: Mission[];
}): QuarterlyFinancialSnapshot[] {
  const months = buildMonthlyFinancialSnapshots(data);
  const year = new Date(data.todayIso).getFullYear();

  const quarters: QuarterlyFinancialSnapshot[] = [];
  let cumulativeInvoiced = 0;

  for (let q = 1; q <= 4; q++) {
    const quarterMonths = months.filter((m) => m.quarterLabel === `T${q}`);
    const smallSupplierThresholdCents = data.fiscalSettings.smallSupplierThresholdCents;
    const smallSupplierWarningRate = data.fiscalSettings.smallSupplierWarningRate;

    const quarterInvoicedCents = quarterMonths.reduce((sum, m) => sum + m.invoicedCents, 0);
    cumulativeInvoiced += quarterInvoicedCents;

    const invoicedCents = quarterInvoicedCents;
    const collectedCents = quarterMonths.reduce((sum, m) => sum + m.collectedCents, 0);
    const receivableCents = quarterMonths.reduce((sum, m) => sum + m.receivableCents, 0);
    const overdueCents = quarterMonths.reduce((sum, m) => sum + m.overdueCents, 0);
    const manualDeductibleExpensesCents = quarterMonths.reduce((sum, m) => sum + m.manualDeductibleExpensesCents, 0);
    const missionGeneratedDeductibleExpensesCents = quarterMonths.reduce((sum, m) => sum + m.missionGeneratedDeductibleExpensesCents, 0);
    const deductibleExpensesCents = quarterMonths.reduce((sum, m) => sum + m.deductibleExpensesCents, 0);
    const estimatedNetProfitCents = quarterMonths.reduce((sum, m) => sum + m.estimatedNetProfitCents, 0);
    const targetReserveCents = quarterMonths.reduce((sum, m) => sum + m.targetReserveCents, 0);
    const remainingProvisionCents = quarterMonths.reduce((sum, m) => sum + m.remainingProvisionCents, 0);
    const incomeTaxInstalmentsPaidCents = quarterMonths.reduce((sum, m) => sum + m.incomeTaxInstalmentsPaidCents, 0);

    const allQuarterWarnings: FinancialWarning[] = [];
    quarterMonths.forEach((m) => allQuarterWarnings.push(...m.warnings));

    const rollingFourQuartersTaxableSuppliesCents = cumulativeInvoiced;
    const smallSupplierStatus: QuarterlyFinancialSnapshot['smallSupplierStatus'] =
      rollingFourQuartersTaxableSuppliesCents === 0
        ? 'UNDER_THRESHOLD'
        : rollingFourQuartersTaxableSuppliesCents < smallSupplierThresholdCents * (smallSupplierWarningRate / 100)
          ? 'UNDER_THRESHOLD'
          : rollingFourQuartersTaxableSuppliesCents < smallSupplierThresholdCents
            ? 'NEAR_LIMIT'
            : 'OVER_LIMIT';

    const warnings = [...allQuarterWarnings];

    if (smallSupplierStatus === 'NEAR_LIMIT') {
      warnings.push({
        id: `small-supplier-near-limit-${q}`,
        level: 'warning',
        scope: 'quarterly',
        title: "Seuil d'approvisionnement",
        message: `Vous êtes à ${Math.round((rollingFourQuartersTaxableSuppliesCents / smallSupplierThresholdCents) * 100)} % du seuil.`,
      });
    }

    quarters.push({
      quarter: q,
      year,
      label: `T${q}`,
      invoicedCents,
      collectedCents,
      receivableCents,
      overdueCents,
      manualDeductibleExpensesCents,
      missionGeneratedDeductibleExpensesCents,
      deductibleExpensesCents,
      estimatedNetProfitCents,
      targetReserveCents,
      remainingProvisionCents,
      nextInstalmentDate: undefined,
      suggestedInstalmentCents: 0,
      incomeTaxInstalmentsPaidCents,
      instalmentGapCents: 0,
      warnings,
      smallSupplierStatus,
      rollingFourQuartersTaxableSuppliesCents,
    });
  }

  return quarters;
}

export function buildAnnualFinancialSnapshot(data: {
  invoices: Invoice[];
  taxPayments: TaxPayment[];
  expenses: DeductibleExpense[];
  fiscalSettings: FiscalSettings;
  todayIso: string;
  missions?: Mission[];
}): AnnualFinancialSnapshot {
  const monthlySnapshots = buildMonthlyFinancialSnapshots(data);
  const quarterlySnapshots = buildQuarterlyFinancialSnapshots(data);

  const invoicedCents = monthlySnapshots.reduce((sum, m) => sum + m.invoicedCents, 0);
  const collectedCents = monthlySnapshots.reduce((sum, m) => sum + m.collectedCents, 0);
  const receivableCents = monthlySnapshots.reduce((sum, m) => sum + m.receivableCents, 0);
  const overdueCents = monthlySnapshots.reduce((sum, m) => sum + m.overdueCents, 0);
  const manualDeductibleExpensesCents = monthlySnapshots.reduce((sum, m) => sum + m.manualDeductibleExpensesCents, 0);
  const missionGeneratedDeductibleExpensesCents = monthlySnapshots.reduce((sum, m) => sum + m.missionGeneratedDeductibleExpensesCents, 0);
  const deductibleExpensesCents = monthlySnapshots.reduce((sum, m) => sum + m.deductibleExpensesCents, 0);
  const incomeTaxInstalmentsPaidCents = monthlySnapshots.reduce((sum, m) => sum + m.incomeTaxInstalmentsPaidCents, 0);
  const estimatedNetProfitCents = monthlySnapshots.reduce((sum, m) => sum + m.estimatedNetProfitCents, 0);
  const targetReserveCents = monthlySnapshots.reduce((sum, m) => sum + m.targetReserveCents, 0);
  const remainingProvisionCents = monthlySnapshots.reduce((sum, m) => sum + m.remainingProvisionCents, 0);

  const recoveryRate = Math.round((collectedCents / invoicedCents) * 100) || 0;
  const averagePaymentDelayDays = 10;

  const warnings: FinancialWarning[] = [];

  if (!data.fiscalSettings.enableInstalmentTracking) {
    quarterlySnapshots.forEach((q) => {
      q.warnings.push({
        id: `instalment-tracking-disabled-${q.quarter}`,
        level: 'info',
        scope: 'quarterly',
        title: 'Suivi des acomptes désactivé',
        message: 'Le suivi des acomptes est désactivé dans les paramètres.',
      });
    });
  } else {
    const currentQuarter = Math.ceil((new Date(data.todayIso).getMonth() + 1) / 3);
    const dueQuarter = currentQuarter - 1 < 1 ? 4 : currentQuarter - 1;
    const dueQuarterIndex = dueQuarter - 1;

    if (dueQuarterIndex >= 0 && dueQuarterIndex < quarterlySnapshots.length) {
      const q = quarterlySnapshots[dueQuarterIndex];
      const qDueDate = new Date(`${q.year}-${String((q.quarter - 1) * 3 + 1).padStart(2, '0')}-01`);
      const now = new Date(data.todayIso);

      if (now > qDueDate && q.incomeTaxInstalmentsPaidCents === 0) {
        warnings.push({
          id: 'instalment-overdue',
          level: 'warning',
          scope: 'quarterly',
          title: 'Acompte en retard',
          message: `L'acompte pour le ${q.label} ${q.year} est en retard.`,
        });
      } else if (q.incomeTaxInstalmentsPaidCents === 0 && q.estimatedNetProfitCents > 0) {
        warnings.push({
          id: 'instalment-upcoming',
          level: 'info',
          scope: 'quarterly',
          title: 'Acompte à venir',
          message: `L'acompte pour le ${q.label} ${q.year} approche.`,
        });
      }
    }
  }

  const allQuarterWarnings: FinancialWarning[] = [];
  quarterlySnapshots.forEach((q) => allQuarterWarnings.push(...q.warnings));

  const finalWarnings = [...warnings, ...allQuarterWarnings];

  return {
    year: new Date(data.todayIso).getFullYear(),
    invoicedCents,
    collectedCents,
    receivableCents,
    overdueCents,
    manualDeductibleExpensesCents,
    missionGeneratedDeductibleExpensesCents,
    deductibleExpensesCents,
    estimatedNetProfitCents,
    targetReserveCents,
    remainingProvisionCents,
    quarters: quarterlySnapshots,
    months: monthlySnapshots,
    warnings: finalWarnings,
    gstQstRemittedCents: 0,
    gstQstRemainingCents: 0,
    incomeTaxInstalmentsPaidCents,
    rollingFourQuartersTaxableSuppliesCents: quarterlySnapshots[3]?.rollingFourQuartersTaxableSuppliesCents || 0,
    recoveryRate,
    averagePaymentDelayDays,
  };
}

export function buildFinancialMetrics(data: {
  invoices: Invoice[];
  taxPayments: TaxPayment[];
  expenses: DeductibleExpense[];
  fiscalSettings: FiscalSettings;
  todayIso: string;
  missions?: Mission[];
  pharmaciens?: Pharmacien[];
  expenseReceipts?: ExpenseReceipt[];
}): {
  annual: AnnualFinancialSnapshot;
  monthly: MonthlyFinancialSnapshot[];
  quarterly: QuarterlyFinancialSnapshot[];
} {
  return {
    annual: buildAnnualFinancialSnapshot(data),
    monthly: buildMonthlyFinancialSnapshots(data),
    quarterly: buildQuarterlyFinancialSnapshots(data),
  };
}

// ============================================================================
// Fonctions pour le tableau annuel des dépenses
// ============================================================================

/**
 * Type pour une ligne du tableau annuel des dépenses
 */
export type AnnualExpenseRow = {
  month: number; // 1-12
  monthLabel: string;
  status: 'PAST' | 'CURRENT' | 'FUTURE';
  manualDeductibleExpensesCents: number;
  missionGeneratedDeductibleExpensesCents: number;
  totalDeductibleExpensesCents: number;
  missingRecommendedReceiptsCount: number;
  missingRequiredReceiptsCount: number;
};

/**
 * Paramètres pour buildAnnualExpenseRows
 */
export interface BuildAnnualExpenseRowsParams {
  annual: AnnualFinancialSnapshot;
  missionExpenseRows: MissionDeductibleExpenseRow[];
  today: string; // YYYY-MM-DD
  year?: number;
}

/**
 * Construit les lignes du tableau annuel des dépenses
 * @param params - Paramètres incluant l'année financière, les dépenses missions, et la date courante
 * @returns Tableau de 12 lignes (une par mois)
 */
export function buildAnnualExpenseRows({
  annual,
  missionExpenseRows,
  today,
  year = annual.year,
}: BuildAnnualExpenseRowsParams): AnnualExpenseRow[] {
  const todayDate = new Date(today);
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth(); // 0-11
  
  const monthLabels = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1; // 1-12
    const monthLabel = monthLabels[index];
    
    // Déterminer le statut temporel
    let status: 'PAST' | 'CURRENT' | 'FUTURE' = 'FUTURE';
    if (year < currentYear) {
      status = 'PAST';
    } else if (year > currentYear) {
      status = 'FUTURE';
    } else {
      // Même année
      if (index < currentMonth) {
        status = 'PAST';
      } else if (index === currentMonth) {
        status = 'CURRENT';
      } else {
        status = 'FUTURE';
      }
    }

    // Calculer la date de début du mois (YYYY-MM-01)
    const monthStartDate = new Date(year, index, 1);
    const monthStart = `${year}-${String(index + 1).padStart(2, '0')}-01`;
    
    // Calculer la date de fin du mois (YYYY-MM-dd)
    const monthEndDate = new Date(year, index + 1, 0);
    const monthEnd = `${year}-${String(index + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;

    // Dépenses manuelles pour le mois
    const monthlySnapshot = annual.months?.find(m => m.month === monthStart);
    const manualDeductibleExpensesCents = monthlySnapshot?.manualDeductibleExpensesCents ?? 0;

    // Dépenses issues des missions pour le mois
    const missionGeneratedDeductibleExpensesCents = missionExpenseRows
      .filter(row => row.date >= monthStart && row.date <= monthEnd)
      .reduce((sum, row) => sum + (row.deductibleAmountCents ?? 0), 0);

    // Total des dépenses déductibles
    const totalDeductibleExpensesCents = manualDeductibleExpensesCents + missionGeneratedDeductibleExpensesCents;

    // Compter les justificatifs manquants
    // Pour les dépenses manuelles - on n'a pas accès aux dépenses individuelles ici
    // Pour l'instant, on retourne 0
    const manualExpensesWithoutReceipt = 0;

    // Pour les dépenses missions
    const missionExpensesWithoutReceipt = missionExpenseRows
      .filter(row => row.date >= monthStart && row.date <= monthEnd && !row.hasReceipt)
      .length;

    return {
      month,
      monthLabel,
      status,
      manualDeductibleExpensesCents,
      missionGeneratedDeductibleExpensesCents,
      totalDeductibleExpensesCents,
      missingRecommendedReceiptsCount: manualExpensesWithoutReceipt + missionExpensesWithoutReceipt,
      missingRequiredReceiptsCount: manualExpensesWithoutReceipt + missionExpensesWithoutReceipt,
    };
  });
}
