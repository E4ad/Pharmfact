import type { MissionDay } from '../storage/schema';

export type MissionCalculationInput = {
  days: Array<Pick<MissionDay, 'startTime' | 'endTime' | 'unpaidBreakMinutes'>>;
  hourlyRateCents: number;
  mealFeeCents: number;
  mileageKm: number;
  mileageRateCents: number;
};

export type MissionCalculation = {
  dayHours: number[];
  totalHours: number;
  subtotalCents: number;
  mealTotalCents: number;
  mileageTotalCents: number;
  totalCents: number;
};

function minutesFromTime(value: string): number | null {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function calculateDayHours(startTime: string, endTime: string, unpaidBreakMinutes: number): number {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  if (start === null || end === null || end <= start) return 0;
  const workedMinutes = Math.max(end - start - Math.max(unpaidBreakMinutes || 0, 0), 0);
  return Math.round((workedMinutes / 60) * 100) / 100;
}

export function calculateMission(input: MissionCalculationInput): MissionCalculation {
  const dayHours = input.days.map((day) => calculateDayHours(day.startTime, day.endTime, day.unpaidBreakMinutes));
  const totalHours = Math.round(dayHours.reduce((sum, hours) => sum + hours, 0) * 100) / 100;
  const subtotalCents = Math.round(totalHours * input.hourlyRateCents);
  const mealTotalCents = Math.max(input.mealFeeCents, 0) * input.days.length;
  const mileageTotalCents = Math.round(Math.max(input.mileageKm, 0) * Math.max(input.mileageRateCents, 0));
  return {
    dayHours,
    totalHours,
    subtotalCents,
    mealTotalCents,
    mileageTotalCents,
    totalCents: subtotalCents + mealTotalCents + mileageTotalCents,
  };
}
