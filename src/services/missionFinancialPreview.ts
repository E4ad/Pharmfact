export type MissionFinancialExpense = {
  amount?: number;
  amountCents?: number;
};

export type MissionFinancialDay = {
  paidHours: number;
  expenses: MissionFinancialExpense[];
};

export type MissionFinancialInput = {
  days: MissionFinancialDay[];
  hourlyRate: number;
};

export type MissionFinancialPreview = {
  hours: number;
  subtotal: number;
  expenses: number;
  total: number;
};

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calculateMissionFinancialPreview(input: MissionFinancialInput): MissionFinancialPreview {
  const hours = roundMoney(input.days.reduce((sum, day) => sum + (Number(day.paidHours) || 0), 0));
  const subtotal = roundMoney(hours * (Number(input.hourlyRate) || 0));
  const expenses = roundMoney(input.days.reduce((sum, day) => sum + day.expenses.reduce((feeSum, fee) => feeSum + (fee.amountCents !== undefined ? fee.amountCents / 100 : Number(fee.amount) || 0), 0), 0));
  return {
    hours,
    subtotal,
    expenses,
    total: roundMoney(subtotal + expenses),
  };
}
