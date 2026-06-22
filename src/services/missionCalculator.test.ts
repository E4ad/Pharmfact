import { describe, expect, it } from 'vitest';
import { calculateDayHours, calculateMission, regenerateDays } from './missionCalculator';

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

  it('keeps excluded multi-day dates removed when regenerating', () => {
    const result = regenerateDays({
      pharmacienId: 'ph_1',
      pharmacieId: 'pha_1',
      actType: 'REMPLACEMENT_OFFICINE',
      dateDebut: '2026-06-05',
      dateFin: '2026-06-07',
      isMultiDay: true,
      excludedDates: ['2026-06-06'],
      defaultStartTime: '08:00',
      defaultEndTime: '17:00',
      defaultUnpaidBreakMinutes: 60,
      tauxHoraire: 80,
      distanceReferenceKm: 0,
      kmUnitRate: 0.61,
      days: [],
      notes: '',
    }, {
      mealDefaults: { enabled: false, thresholdHours: 8, amountCents: 0 },
    });

    expect(result.days.map((day) => day.dateService)).toEqual(['2026-06-05', '2026-06-07']);
  });
});
