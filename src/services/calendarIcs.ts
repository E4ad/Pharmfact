import type { Mission, Pharmacien, Pharmacie } from '../storage/schema';

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function compactDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

export function buildMissionIcs(mission: Mission, pharmacien?: Pharmacien, pharmacie?: Pharmacie): string {
  const fallbackDay = { dateService: mission.dateDebut, startTime: '09:00', endTime: '17:00' };
  const firstDay = mission.days[0] ?? fallbackDay;
  const lastDay = mission.days[mission.days.length - 1] ?? firstDay;
  const summary = `Mission pharmacie${pharmacie ? ` - ${pharmacie.nom}` : ''}`;
  const description = [
    pharmacien ? `Pharmacien: ${pharmacien.nom}` : '',
    `Heures: ${mission.totalHours} h`,
    `Montant: ${(mission.totalCents / 100).toFixed(2)} CAD`,
    mission.notes ? `Notes: ${mission.notes}` : '',
  ].filter(Boolean).join('\n');
  const location = pharmacie ? `${pharmacie.adresse}, ${pharmacie.ville} ${pharmacie.codePostal}` : '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mission App//Mission Management//FR',
    'BEGIN:VEVENT',
    `UID:${mission.id}@mission-app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${compactDateTime(firstDay.dateService, firstDay.startTime || '09:00')}`,
    `DTEND:${compactDateTime(lastDay.dateService, lastDay.endTime || '17:00')}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    'END:VEVENT',
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
