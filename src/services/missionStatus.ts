import type { Mission, MissionStatus } from '../storage/schema';

export const missionStatusLabels: Record<MissionStatus, string> = {
  DRAFT: 'Brouillon',
  CONFIRMED: 'À venir',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  ARCHIVED: 'Archivée',
  CANCELLED: 'Annulée',
};

export function missionStatusTone(status: MissionStatus): 'default' | 'primary' | 'warning' | 'success' | 'error' {
  if (status === 'CONFIRMED') return 'primary';
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'error';
  return 'default';
}

export function nextMissionStatuses(status: MissionStatus): MissionStatus[] {
  switch (status) {
    case 'DRAFT':
      return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED':
      return ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    case 'IN_PROGRESS':
      return ['COMPLETED', 'CANCELLED'];
    case 'COMPLETED':
      return ['ARCHIVED'];
    default:
      return [];
  }
}

export function missionBucket(mission: Mission, todayIso: string): 'upcoming' | 'inProgress' | 'completed' | 'archived' {
  if (mission.status === 'ARCHIVED' || mission.status === 'CANCELLED') return 'archived';
  if (mission.status === 'IN_PROGRESS') return 'inProgress';
  if (mission.status === 'COMPLETED') return 'completed';
  if (mission.dateFin < todayIso && mission.status === 'CONFIRMED') return 'completed';
  return 'upcoming';
}
