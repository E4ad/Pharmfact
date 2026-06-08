import type { DeductibleExpenseCategory, MissionExpense } from '../storage/schema';

export type ExpenseTypeConfig = {
  key: string;
  label: string;
  icon?: string;
  defaultBillable: boolean;
  defaultCreatesDeductibleExpense: boolean;
  deductibleCategory: DeductibleExpenseCategory;
  deductibleRate: number;
  showInMissionQuickAdd: boolean;
  receiptRecommended: boolean;
  receiptRequired?: boolean;
};

export const DEFAULT_EXPENSE_TYPES: ExpenseTypeConfig[] = [
  { key: 'MEAL', label: 'Repas', icon: '🍔', defaultBillable: true, defaultCreatesDeductibleExpense: true, deductibleCategory: 'MEAL', deductibleRate: 0.5, showInMissionQuickAdd: false, receiptRecommended: true },
  { key: 'MILEAGE', label: 'Kilométrage', icon: '🚗', defaultBillable: true, defaultCreatesDeductibleExpense: true, deductibleCategory: 'MILEAGE', deductibleRate: 1, showInMissionQuickAdd: false, receiptRecommended: false },
  { key: 'PARKING', label: 'Stationnement', icon: 'P', defaultBillable: true, defaultCreatesDeductibleExpense: true, deductibleCategory: 'PARKING', deductibleRate: 1, showInMissionQuickAdd: true, receiptRecommended: true },
  { key: 'TOLL', label: 'Péage', icon: 'T', defaultBillable: true, defaultCreatesDeductibleExpense: true, deductibleCategory: 'TOLL', deductibleRate: 1, showInMissionQuickAdd: true, receiptRecommended: true },
  { key: 'LODGING', label: 'Hôtel', icon: 'H', defaultBillable: true, defaultCreatesDeductibleExpense: true, deductibleCategory: 'LODGING', deductibleRate: 1, showInMissionQuickAdd: true, receiptRecommended: true, receiptRequired: true },
  { key: 'TRANSPORT', label: 'Transport', icon: 'Taxi', defaultBillable: true, defaultCreatesDeductibleExpense: true, deductibleCategory: 'TRANSPORT', deductibleRate: 1, showInMissionQuickAdd: true, receiptRecommended: true },
  { key: 'SUPPLIES', label: 'Fourniture', icon: 'Box', defaultBillable: true, defaultCreatesDeductibleExpense: true, deductibleCategory: 'SUPPLIES', deductibleRate: 1, showInMissionQuickAdd: true, receiptRecommended: true },
  { key: 'OTHER_NON_DEDUCTIBLE', label: 'Autre non déductible', icon: 'ND', defaultBillable: true, defaultCreatesDeductibleExpense: false, deductibleCategory: 'NON_DEDUCTIBLE', deductibleRate: 0, showInMissionQuickAdd: true, receiptRecommended: false },
];

export function expenseTypeConfig(typeKey: string): ExpenseTypeConfig {
  return DEFAULT_EXPENSE_TYPES.find((item) => item.key === typeKey) ?? DEFAULT_EXPENSE_TYPES[DEFAULT_EXPENSE_TYPES.length - 1];
}

export function missionQuickExpenseTypes(): ExpenseTypeConfig[] {
  return DEFAULT_EXPENSE_TYPES.filter((item) => item.showInMissionQuickAdd);
}

export function legacyTypeKey(type?: string): string {
  if (type === 'REPAS') return 'MEAL';
  if (type === 'KM') return 'MILEAGE';
  return 'OTHER_NON_DEDUCTIBLE';
}

export function createMissionExpenseDraft(params: { id: string; typeKey: string; amountCents?: number; missionId?: string; missionDayId?: string; distanceKm?: number; unitRateCents?: number; overrides?: Partial<MissionExpense> }): MissionExpense {
  const config = expenseTypeConfig(params.typeKey);
  const amountCents = params.amountCents ?? 0;
  return {
    id: params.id,
    type: params.typeKey === 'MEAL' ? 'REPAS' : params.typeKey === 'MILEAGE' ? 'KM' : 'AUTRE',
    typeKey: config.key,
    label: config.label,
    amountCents,
    amount: Math.round(amountCents) / 100,
    billable: config.defaultBillable,
    createsDeductibleExpense: config.defaultCreatesDeductibleExpense,
    deductibleCategory: config.deductibleCategory,
    deductibleRate: config.deductibleRate,
    distanceKm: params.distanceKm,
    unitRateCents: params.unitRateCents,
    unitRate: params.unitRateCents !== undefined ? params.unitRateCents / 100 : undefined,
    quantity: params.distanceKm,
    receiptIds: [],
    source: 'MISSION_EXPENSE',
    missionId: params.missionId,
    missionDayId: params.missionDayId,
    ...params.overrides,
  };
}

export function normalizeMissionExpense(expense: Partial<MissionExpense> & { id: string }, missionId?: string, missionDayId?: string): MissionExpense {
  const typeKey = expense.typeKey ?? legacyTypeKey(expense.type);
  const config = expenseTypeConfig(typeKey);
  const amountCents = expense.amountCents ?? Math.round((expense.amount ?? 0) * 100);
  const unitRateCents = expense.unitRateCents ?? (expense.unitRate !== undefined ? Math.round(expense.unitRate * 100) : undefined);
  return {
    id: expense.id,
    type: expense.type ?? (typeKey === 'MEAL' ? 'REPAS' : typeKey === 'MILEAGE' ? 'KM' : 'AUTRE'),
    typeKey,
    label: expense.label ?? config.label,
    amountCents,
    amount: Math.round(amountCents) / 100,
    notes: expense.notes,
    billable: expense.billable ?? config.defaultBillable,
    createsDeductibleExpense: expense.createsDeductibleExpense ?? config.defaultCreatesDeductibleExpense,
    deductibleCategory: expense.deductibleCategory ?? config.deductibleCategory,
    deductibleRate: expense.deductibleRate ?? config.deductibleRate,
    distanceKm: expense.distanceKm,
    unitRateCents,
    unitRate: unitRateCents !== undefined ? unitRateCents / 100 : expense.unitRate,
    quantity: expense.quantity ?? expense.distanceKm,
    receiptIds: expense.receiptIds ?? [],
    source: 'MISSION_EXPENSE',
    missionId: expense.missionId ?? missionId,
    missionDayId: expense.missionDayId ?? missionDayId,
    isAutoGenerated: expense.isAutoGenerated,
    isLocked: expense.isLocked,
  };
}

export function deductibleAmountCents(expense: Pick<MissionExpense, 'amountCents' | 'deductibleRate' | 'createsDeductibleExpense'>): number {
  if (!expense.createsDeductibleExpense) return 0;
  return Math.round(expense.amountCents * expense.deductibleRate);
}
