import { describe, expect, it } from 'vitest';
import { calculateDayHours, calculateMission } from './missionCalculator';

describe('missionCalculator', () => {
  it('subtracts unpaid break minutes from worked time', () => {
    expect(calculateDayHours('09:00', '17:30', 60)).toBe(7.5);
  });

  it('calculates hourly, meal, mileage, and total amounts in cents', () => {
    const result = calculateMission({
      days: [{ startTime: '09:00', endTime: '17:00', unpaidBreakMinutes: 60 }],
      hourlyRateCents: 8000,
      mealFeeCents: 2200,
      mileageKm: 30,
      mileageRateCents: 61,
    });

    expect(result.totalHours).toBe(7);
    expect(result.subtotalCents).toBe(56_000);
    expect(result.mealTotalCents).toBe(2_200);
    expect(result.mileageTotalCents).toBe(1_830);
    expect(result.totalCents).toBe(60_030);
  });
});
