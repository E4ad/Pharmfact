import type { Mission, MissionDay, Pharmacien, Pharmacie } from '../storage/schema';
import { pharmacieDisplayName } from '../storage/selectors';

const CALENDAR_TIMEZONE = 'America/Toronto';

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function compactDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function compactTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function easternTimeZoneDefinition(): string[] {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${CALENDAR_TIMEZONE}`,
    'X-LIC-LOCATION:America/Toronto',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
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
  const summary = `Mission pharmacie${pharmacie ? ` - ${pharmacieDisplayName(pharmacie)}` : ''}`;
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
      `DTSTART;TZID=${CALENDAR_TIMEZONE}:${compactDateTime(day.dateService, day.startTime || '09:00')}`,
      `DTEND;TZID=${CALENDAR_TIMEZONE}:${compactDateTime(day.dateService, day.endTime || '17:00')}`,
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
    `X-WR-TIMEZONE:${CALENDAR_TIMEZONE}`,
    ...easternTimeZoneDefinition(),
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
