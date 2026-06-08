import { useMemo } from 'react';
import { calculateMissionFinancialPreview, type MissionFinancialDay } from '../services/missionFinancialPreview';

export function useMissionFinancialPreview(values: { days: MissionFinancialDay[]; tauxHoraire: number }) {
  return useMemo(() => calculateMissionFinancialPreview({ days: values.days, hourlyRate: values.tauxHoraire }), [values.days, values.tauxHoraire]);
}
