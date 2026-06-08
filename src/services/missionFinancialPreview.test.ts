import { describe, expect, it } from 'vitest';
import { calculateMissionFinancialPreview } from './missionFinancialPreview';

describe('missionFinancialPreview', () => {
  it('calculates hours, subtotal, expenses, and total', () => {
    const preview = calculateMissionFinancialPreview({
      hourlyRate: 80,
      days: [
        { paidHours: 8, expenses: [{ amount: 20 }, { amount: 14.64 }] },
        { paidHours: 7.5, expenses: [{ amount: 12 }] },
      ],
    });

    expect(preview).toEqual({
      hours: 15.5,
      subtotal: 1240,
      expenses: 46.64,
      total: 1286.64,
    });
  });

  it('updates when expenses are removed or changed', () => {
    const preview = calculateMissionFinancialPreview({
      hourlyRate: 78,
      days: [{ paidHours: 8.25, expenses: [{ amount: 15.01 }] }],
    });

    expect(preview.subtotal).toBe(643.5);
    expect(preview.expenses).toBe(15.01);
    expect(preview.total).toBe(658.51);
  });
});
