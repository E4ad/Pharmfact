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
  const pharmacyName = pharmacie ? pharmacieDisplayName(pharmacie) : 'Pharmacie';
  const summary = `Remplacement — ${pharmacyName}`;
  const location = pharmacie ? `${pharmacie.adresse}, ${pharmacie.ville} ${pharmacie.codePostal}` : '';
  const events = missionDays.flatMap((day, index) => {
    const description = [
      'Mission PharmFact',
      `Pharmacie : ${pharmacyName}`,
      `Horaire : ${day.startTime || '09:00'}–${day.endTime || '17:00'}`,
      `Pause : ${day.unpaidBreakMinutes} min`,
      pharmacien ? `Pharmacien : ${pharmacien.nom}` : '',
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
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(summary)}`,
      'END:VALARM',
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

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function buildMissionIcsFilename(mission: Mission, pharmacie?: Pharmacie): string {
  const pharmacySlug = slugify(pharmacie ? pharmacieDisplayName(pharmacie) : 'mission');
  const sortedDates = [...new Set((mission.days.length ? mission.days.map((day) => day.dateService) : [mission.dateDebut]))].sort();
  const first = sortedDates[0] ?? mission.dateDebut;
  const last = sortedDates.at(-1) ?? first;
  const month = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' })
    .format(new Date(`${first}T00:00:00`))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  if (sortedDates.length <= 1) {
    return `${pharmacySlug}-${first}.ics`;
  }

  const consecutive = sortedDates.every((date, index) => {
    if (index === 0) return true;
    const previous = new Date(`${sortedDates[index - 1]}T00:00:00`);
    previous.setDate(previous.getDate() + 1);
    return previous.toISOString().slice(0, 10) === date;
  });

  if (consecutive) {
    return `${pharmacySlug}-${first.slice(8, 10)}-${last.slice(8, 10)}-${month}.ics`;
  }

  return `${pharmacySlug}-${sortedDates.length}-jours-${month}.ics`;
}
