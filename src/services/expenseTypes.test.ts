import { describe, expect, it } from 'vitest';
import { expenseTypeConfig, missionQuickExpenseTypes, legacyTypeKey, createMissionExpenseDraft, normalizeMissionExpense, deductibleAmountCents } from './expenseTypes';

describe('expenseTypes', () => {
  it('returns default config for known type keys', () => {
    const meal = expenseTypeConfig('MEAL');
    expect(meal.key).toBe('MEAL');
    expect(meal.deductibleRate).toBe(0.5);
    expect(meal.receiptRecommended).toBe(true);
  });

  it('falls back to OTHER_NON_DEDUCTIBLE for unknown keys', () => {
    const config = expenseTypeConfig('UNKNOWN');
    expect(config.key).toBe('OTHER_NON_DEDUCTIBLE');
    expect(config.deductibleRate).toBe(0);
  });

  it('filters quick add expense types', () => {
    const quick = missionQuickExpenseTypes();
    expect(quick.some((t) => t.key === 'PARKING')).toBe(true);
    expect(quick.some((t) => t.key === 'MEAL')).toBe(false);
  });

  it('maps legacy type keys', () => {
    expect(legacyTypeKey('REPAS')).toBe('MEAL');
    expect(legacyTypeKey('KM')).toBe('MILEAGE');
    expect(legacyTypeKey('OTHER')).toBe('OTHER_NON_DEDUCTIBLE');
  });

  it('normalizes mission expense with legacy fields', () => {
    const normalized = normalizeMissionExpense({ id: 'e1', type: 'REPAS', amount: 12.5, amountCents: 1250 } as any, 'mis1', 'day1');

    expect(normalized.typeKey).toBe('MEAL');
    expect(normalized.amountCents).toBe(1250);
    expect(normalized.missionId).toBe('mis1');
    expect(normalized.missionDayId).toBe('day1');
  });

  it('creates mission expense draft from type config', () => {
    const draft = createMissionExpenseDraft({ id: 'e1', typeKey: 'PARKING', amountCents: 1500, missionId: 'mis1', missionDayId: 'day1' });

    expect(draft.typeKey).toBe('PARKING');
    expect(draft.amountCents).toBe(1500);
    expect(draft.deductibleCategory).toBe('PARKING');
    expect(draft.source).toBe('MISSION_EXPENSE');
  });

  it('computes deductible amount cents', () => {
    expect(deductibleAmountCents({ amountCents: 2000, deductibleRate: 0.5, createsDeductibleExpense: true })).toBe(1000);
    expect(deductibleAmountCents({ amountCents: 2000, deductibleRate: 1, createsDeductibleExpense: false })).toBe(0);
  });
});
