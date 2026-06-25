import type { Pharmacie, PharmacyDaySchedule, PharmacyFranchise, PharmacyWeeklySchedule, Weekday } from '../storage/schema';

export type PharmacyFranchiseDetection = {
  franchise: PharmacyFranchise;
  label: string;
  confidence: 'high' | 'medium' | 'low';
};

export const pharmacyFranchiseLabels: Record<PharmacyFranchise, string> = {
  jean_coutu: 'Jean Coutu',
  familiprix: 'Familiprix',
  uniprix: 'Uniprix',
  brunet: 'Brunet',
  pharmaprix: 'Pharmaprix',
  proxim: 'Proxim',
  acces_pharma: 'Accès Pharma',
  independent: 'Indépendante',
  other: 'Autre',
  unknown: 'Non renseignée',
};

export const pharmacyWeekdays: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const pharmacyWeekdayLabels: Record<Weekday, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

const franchisePatterns: Array<{
  franchise: PharmacyFranchise;
  confidence: PharmacyFranchiseDetection['confidence'];
  patterns: RegExp[];
}> = [
  { franchise: 'jean_coutu', confidence: 'high', patterns: [/\bpjc\b/i, /jean[\s-]?coutu/i] },
  { franchise: 'familiprix', confidence: 'high', patterns: [/familiprix/i] },
  { franchise: 'uniprix', confidence: 'high', patterns: [/uniprix/i] },
  { franchise: 'brunet', confidence: 'high', patterns: [/\bbrunet\b/i] },
  { franchise: 'pharmaprix', confidence: 'high', patterns: [/pharmaprix/i, /shoppers\s+drug\s+mart/i] },
  { franchise: 'proxim', confidence: 'high', patterns: [/\bproxim\b/i] },
  { franchise: 'acces_pharma', confidence: 'high', patterns: [/acc[eè]s\s+pharma/i, /acces\s+pharma/i, /walmart\s+pharmacy/i] },
];

export function detectPharmacyFranchise(pharmacyName: string): PharmacyFranchiseDetection {
  const name = pharmacyName.trim();
  if (!name) return { franchise: 'unknown', label: pharmacyFranchiseLabels.unknown, confidence: 'low' };

  const match = franchisePatterns.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(name)),
  );

  if (!match) return { franchise: 'unknown', label: pharmacyFranchiseLabels.unknown, confidence: 'low' };

  return {
    franchise: match.franchise,
    label: pharmacyFranchiseLabels[match.franchise],
    confidence: match.confidence,
  };
}

function normalizeHour(raw: string, minutesRaw?: string): string | null {
  const hour = Number(raw);
  const minutes = minutesRaw === undefined || minutesRaw === '' ? 0 : Number(minutesRaw);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function createClosedWeeklySchedule(
  metadata: Pick<PharmacyWeeklySchedule, 'source' | 'extractedFromNotes' | 'sourceLabel' | 'updatedAt'> = {},
): PharmacyWeeklySchedule {
  return {
    monday: { enabled: false },
    tuesday: { enabled: false },
    wednesday: { enabled: false },
    thursday: { enabled: false },
    friday: { enabled: false },
    saturday: { enabled: false },
    sunday: { enabled: false },
    ...metadata,
  };
}

function parseTimeRange(text: string): { startTime: string; endTime: string } | null {
  const timeRange = text.match(
    /\b(\d{1,2})(?:\s*(?::|h)\s*(\d{2})|\s*h)?\s*(?:-|–|—|à|a|au)\s*(\d{1,2})(?:\s*(?::|h)\s*(\d{2})|\s*h)?\b/i,
  );
  if (!timeRange) return null;

  const startTime = normalizeHour(timeRange[1], timeRange[2]);
  const endTime = normalizeHour(timeRange[3], timeRange[4]);
  if (!startTime || !endTime || startTime >= endTime) return null;
  return { startTime, endTime };
}

export function extractSanteQuebecWeeklyScheduleFromNotes(notes: string): PharmacyWeeklySchedule | null {
  const marker = notes.match(/horaire\s+sant[ée]\s+qu[ée]bec\s*:/i);
  if (!marker || marker.index === undefined) return null;

  const text = notes.slice(marker.index + marker[0].length);
  const schedule = createClosedWeeklySchedule({
    source: 'notes_migration',
    extractedFromNotes: true,
    sourceLabel: 'Horaire Santé Québec',
    updatedAt: new Date().toISOString(),
  });
  const foundDays = new Set<Weekday>();
  const dayEntryPattern = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*:\s*([^;\n]+)/gi;

  for (const match of text.matchAll(dayEntryPattern)) {
    const day = weekdayFromFrench(match[1]);
    const value = match[2].trim();
    if (!day) continue;
    if (foundDays.has(day)) return null;
    foundDays.add(day);

    if (/^(ferm[ée]?|closed)\b/i.test(value)) {
      schedule[day] = { enabled: false };
      continue;
    }

    const range = parseTimeRange(value);
    if (!range) return null;
    schedule[day] = { enabled: true, ...range };
  }

  return foundDays.size === pharmacyWeekdays.length ? schedule : null;
}

function weekdayFromFrench(value: string): Weekday | null {
  const normalized = value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/^(lun|lundi)$/.test(normalized)) return 'monday';
  if (/^(mar|mardi)$/.test(normalized)) return 'tuesday';
  if (/^(mer|mercredi)$/.test(normalized)) return 'wednesday';
  if (/^(jeu|jeudi)$/.test(normalized)) return 'thursday';
  if (/^(ven|vendredi)$/.test(normalized)) return 'friday';
  if (/^(sam|samedi)$/.test(normalized)) return 'saturday';
  if (/^(dim|dimanche)$/.test(normalized)) return 'sunday';
  return null;
}

function daysInRange(start: Weekday, end: Weekday): Weekday[] {
  const startIndex = pharmacyWeekdays.indexOf(start);
  const endIndex = pharmacyWeekdays.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) return [];
  return pharmacyWeekdays.slice(startIndex, endIndex + 1);
}

function setScheduleDay(
  schedule: PharmacyWeeklySchedule,
  assigned: Set<Weekday>,
  day: Weekday,
  next: PharmacyDaySchedule,
): boolean {
  if (assigned.has(day)) {
    const current = schedule[day];
    return current.enabled === next.enabled
      && current.startTime === next.startTime
      && current.endTime === next.endTime;
  }
  schedule[day] = next;
  assigned.add(day);
  return true;
}

export function extractWeeklyScheduleFromNotes(notes: string): PharmacyWeeklySchedule | null {
  const text = notes.trim();
  if (!text) return null;

  const schedule = createClosedWeeklySchedule({
    source: 'notes_migration',
    extractedFromNotes: true,
    updatedAt: new Date().toISOString(),
  });
  const assigned = new Set<Weekday>();
  let hasSchedule = false;

  const rangePattern = /\b(lun(?:di)?|mar(?:di)?|mer(?:credi)?|jeu(?:di)?|ven(?:dredi)?|sam(?:edi)?|dim(?:anche)?)\s*(?:-|–|—|à|a|au)\s*(lun(?:di)?|mar(?:di)?|mer(?:credi)?|jeu(?:di)?|ven(?:dredi)?|sam(?:edi)?|dim(?:anche)?)\b[^,;\n]*/gi;
  for (const match of text.matchAll(rangePattern)) {
    const start = weekdayFromFrench(match[1]);
    const end = weekdayFromFrench(match[2]);
    const range = parseTimeRange(match[0]);
    if (!start || !end || !range) continue;
    const days = daysInRange(start, end);
    if (!days.length) return null;
    for (const day of days) {
      if (!setScheduleDay(schedule, assigned, day, { enabled: true, ...range })) return null;
    }
    hasSchedule = true;
  }

  const dayPattern = /\b(lun(?:di)?|mar(?:di)?|mer(?:credi)?|jeu(?:di)?|ven(?:dredi)?|sam(?:edi)?|dim(?:anche)?)\b[^,;\n]*/gi;
  for (const match of text.matchAll(dayPattern)) {
    const day = weekdayFromFrench(match[1]);
    const range = parseTimeRange(match[0]);
    if (!day || !range) continue;
    if (!setScheduleDay(schedule, assigned, day, { enabled: true, ...range })) return null;
    hasSchedule = true;
  }

  const closedPattern = /\bferm[ée]?\s+(lun(?:di)?|mar(?:di)?|mer(?:credi)?|jeu(?:di)?|ven(?:dredi)?|sam(?:edi)?|dim(?:anche)?)\b/gi;
  for (const match of text.matchAll(closedPattern)) {
    const day = weekdayFromFrench(match[1]);
    if (!day) continue;
    if (!setScheduleDay(schedule, assigned, day, { enabled: false })) return null;
  }

  if (!hasSchedule) {
    const genericRange = parseTimeRange(text);
    if (!genericRange) return null;
    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] satisfies Weekday[]) {
      setScheduleDay(schedule, assigned, day, { enabled: true, ...genericRange });
    }
    hasSchedule = true;
  }

  return hasSchedule ? schedule : null;
}

export function createWeeklyScheduleFromRange(
  startTime?: string,
  endTime?: string,
  metadata: Pick<PharmacyWeeklySchedule, 'source' | 'extractedFromNotes' | 'sourceLabel' | 'updatedAt'> = {},
): PharmacyWeeklySchedule | undefined {
  if (!startTime || !endTime || startTime >= endTime) return undefined;
  const schedule = createClosedWeeklySchedule(metadata);
  for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] satisfies Weekday[]) {
    schedule[day] = { enabled: true, startTime, endTime };
  }
  return schedule;
}

export function normalizePharmacyWeeklySchedule(schedule?: Partial<PharmacyWeeklySchedule>): PharmacyWeeklySchedule | undefined {
  if (!schedule) return undefined;
  const normalized = createClosedWeeklySchedule({
    source: schedule.source ?? 'manual',
    extractedFromNotes: schedule.extractedFromNotes,
    sourceLabel: schedule.sourceLabel,
    updatedAt: schedule.updatedAt,
  });

  let hasEnabledDay = false;
  for (const day of pharmacyWeekdays) {
    const sourceDay = schedule[day];
    normalized[day] = {
      enabled: Boolean(sourceDay?.enabled && sourceDay.startTime && sourceDay.endTime && sourceDay.startTime < sourceDay.endTime),
      startTime: sourceDay?.enabled ? sourceDay.startTime : undefined,
      endTime: sourceDay?.enabled ? sourceDay.endTime : undefined,
    };
    hasEnabledDay ||= normalized[day].enabled;
  }

  return hasEnabledDay ? normalized : undefined;
}

export function getPharmacyFranchiseLabel(pharmacie?: Pick<Pharmacie, 'franchise' | 'franchiseLabel'>): string {
  if (!pharmacie) return pharmacyFranchiseLabels.unknown;
  return pharmacie.franchiseLabel?.trim() || pharmacyFranchiseLabels[pharmacie.franchise ?? 'unknown'];
}

export function getPharmacyScheduleForDate(schedule: PharmacyWeeklySchedule | undefined, dateIso: string): PharmacyDaySchedule | undefined {
  if (!schedule) return undefined;
  const index = new Date(`${dateIso}T00:00:00`).getDay();
  const day = pharmacyWeekdays[(index + 6) % 7];
  return schedule[day];
}

export function formatPharmacyWeeklySchedule(schedule?: PharmacyWeeklySchedule): string | undefined {
  if (!schedule) return undefined;
  const openDays = pharmacyWeekdays.filter((day) => schedule[day].enabled && schedule[day].startTime && schedule[day].endTime);
  if (!openDays.length) return undefined;
  const first = schedule[openDays[0]];
  const sameWeekdays = openDays.length === 5
    && openDays.every((day) => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day))
    && openDays.every((day) => schedule[day].startTime === first.startTime && schedule[day].endTime === first.endTime);
  if (sameWeekdays) return `Lun–ven ${first.startTime}–${first.endTime}`;
  return openDays
    .slice(0, 2)
    .map((day) => `${pharmacyWeekdayLabels[day].slice(0, 3)} ${schedule[day].startTime}–${schedule[day].endTime}`)
    .join(' · ');
}

export function formatPharmacyScheduleForDate(
  schedule: PharmacyWeeklySchedule | undefined,
  dateIso: string,
): string {
  const day = getPharmacyScheduleForDate(schedule, dateIso);
  const dayLabel = new Intl.DateTimeFormat('fr-CA', { weekday: 'long' }).format(new Date(`${dateIso}T00:00:00`));
  if (!day) return 'horaire non renseigné pour ce jour';
  if (!day.enabled) return 'pharmacie indiquée fermée ce jour';
  return `${dayLabel} ${day.startTime}–${day.endTime}`;
}
