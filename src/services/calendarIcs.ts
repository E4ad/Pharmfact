import type { Mission, MissionDay, Pharmacien, Pharmacie } from '../storage/schema';

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function compactDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function compactTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function sanitizeUidPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function fallbackMissionDay(mission: Mission): MissionDay {
  return {
    id: 'jour-1',
    dateService: mission.dateDebut,
    startTime: '09:00',
    endTime: '17:00',
    unpaidBreakMinutes: 0,
    description: '',
    hours: mission.totalHours,
  };
}

export function buildMissionIcs(mission: Mission, pharmacien?: Pharmacien, pharmacie?: Pharmacie): string {
  const missionDays = mission.days.length > 0 ? mission.days : [fallbackMissionDay(mission)];
  const dtStamp = compactTimestamp(new Date());
  const summary = `Mission pharmacie${pharmacie ? ` - ${pharmacie.nom}` : ''}`;
  const location = pharmacie ? `${pharmacie.adresse}, ${pharmacie.ville} ${pharmacie.codePostal}` : '';
  const events = missionDays.flatMap((day, index) => {
    const description = [
      pharmacien ? `Pharmacien: ${pharmacien.nom}` : '',
      day.description ? `Mission: ${day.description}` : '',
      `Heures: ${day.hours} h`,
      `Montant: ${(mission.totalCents / 100).toFixed(2)} CAD`,
      mission.notes ? `Notes: ${mission.notes}` : '',
    ].filter(Boolean).join('\n');

    return [
      'BEGIN:VEVENT',
      `UID:${sanitizeUidPart(mission.id)}-${sanitizeUidPart(day.id || `jour-${index + 1}`)}@mission-app`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${compactDateTime(day.dateService, day.startTime || '09:00')}`,
      `DTEND:${compactDateTime(day.dateService, day.endTime || '17:00')}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `LOCATION:${escapeIcs(location)}`,
      'END:VEVENT',
    ];
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mission App//Mission Management//FR',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
