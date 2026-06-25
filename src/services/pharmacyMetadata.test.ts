import { describe, expect, it } from 'vitest';
import {
  detectPharmacyFranchise,
  extractSanteQuebecWeeklyScheduleFromNotes,
  extractWeeklyScheduleFromNotes,
  formatPharmacyWeeklySchedule,
} from './pharmacyMetadata';

describe('detectPharmacyFranchise', () => {
  it.each([
    ['PJC 092 - Martin Chao', 'jean_coutu', 'Jean Coutu'],
    ['Jean Coutu Beaubien', 'jean_coutu', 'Jean Coutu'],
    ['Familiprix Santé', 'familiprix', 'Familiprix'],
    ['Uniprix', 'uniprix', 'Uniprix'],
    ['Brunet Montréal', 'brunet', 'Brunet'],
    ['Pharmaprix', 'pharmaprix', 'Pharmaprix'],
    ['Accès Pharma Walmart', 'acces_pharma', 'Accès Pharma'],
  ])('recognizes %s', (name, franchise, label) => {
    expect(detectPharmacyFranchise(name)).toMatchObject({
      franchise,
      label,
      confidence: 'high',
    });
  });

  it('returns unknown for an unrecognized pharmacy name', () => {
    expect(detectPharmacyFranchise('Clinique locale indépendante')).toMatchObject({
      franchise: 'unknown',
      label: 'Non renseignée',
      confidence: 'low',
    });
  });
});

describe('extractWeeklyScheduleFromNotes', () => {
  it('extracts a clear weekday hour range and ignores pause from notes', () => {
    const schedule = extractWeeklyScheduleFromNotes('Lundi au vendredi 8h-17h, pause 60 min');

    expect(schedule?.monday).toEqual({ enabled: true, startTime: '08:00', endTime: '17:00' });
    expect(schedule?.friday).toEqual({ enabled: true, startTime: '08:00', endTime: '17:00' });
    expect(schedule?.saturday).toEqual({ enabled: false });
    expect(JSON.stringify(schedule)).not.toContain('unpaidBreakMinutes');
  });

  it('extracts a generic clear range to weekdays without importing pause', () => {
    const schedule = extractWeeklyScheduleFromNotes('Horaire 08:00 à 20:00 pause 30');

    expect(schedule?.monday).toEqual({ enabled: true, startTime: '08:00', endTime: '20:00' });
    expect(schedule?.sunday).toEqual({ enabled: false });
    expect(JSON.stringify(schedule)).not.toContain('pause');
  });

  it('returns null when only a pause is present', () => {
    expect(extractWeeklyScheduleFromNotes('pause 60 min')).toBeNull();
  });

  it('returns null for ambiguous notes', () => {
    expect(extractWeeklyScheduleFromNotes('Horaire variable selon la succursale')).toBeNull();
  });

  it('returns null for empty notes', () => {
    expect(extractWeeklyScheduleFromNotes('')).toBeNull();
  });
});

describe('extractSanteQuebecWeeklyScheduleFromNotes', () => {
  const fullSanteQuebecNotes = 'Horaire Santé Québec : Lundi: 9 h à 21 h; Mardi: 9 h à 21 h; Mercredi: 9 h à 21 h; Jeudi: 9 h à 21 h; Vendredi: 9 h à 21 h; Samedi: 9 h à 18 h; Dimanche: 9 h à 18 h';

  it('extracts the complete Santé Québec weekly schedule', () => {
    const schedule = extractSanteQuebecWeeklyScheduleFromNotes(fullSanteQuebecNotes);

    expect(schedule?.monday).toEqual({ enabled: true, startTime: '09:00', endTime: '21:00' });
    expect(schedule?.tuesday).toEqual({ enabled: true, startTime: '09:00', endTime: '21:00' });
    expect(schedule?.wednesday).toEqual({ enabled: true, startTime: '09:00', endTime: '21:00' });
    expect(schedule?.thursday).toEqual({ enabled: true, startTime: '09:00', endTime: '21:00' });
    expect(schedule?.friday).toEqual({ enabled: true, startTime: '09:00', endTime: '21:00' });
    expect(schedule?.saturday).toEqual({ enabled: true, startTime: '09:00', endTime: '18:00' });
    expect(schedule?.sunday).toEqual({ enabled: true, startTime: '09:00', endTime: '18:00' });
    expect(schedule?.source).toBe('notes_migration');
    expect(schedule?.sourceLabel).toBe('Horaire Santé Québec');
    expect(schedule?.extractedFromNotes).toBe(true);
    expect(JSON.stringify(schedule)).not.toContain('pause');
    expect(JSON.stringify(schedule)).not.toContain('unpaidBreakMinutes');
  });

  it.each([
    ['9h-21h', '09:00', '21:00'],
    ['09 h à 21 h', '09:00', '21:00'],
    ['09:00 à 21:00', '09:00', '21:00'],
    ['08:30 à 17:30', '08:30', '17:30'],
  ])('recognizes %s', (range, startTime, endTime) => {
    const notes = `Horaire Santé Québec : Lundi: ${range}; Mardi: ${range}; Mercredi: ${range}; Jeudi: ${range}; Vendredi: ${range}; Samedi: ${range}; Dimanche: ${range}`;

    const schedule = extractSanteQuebecWeeklyScheduleFromNotes(notes);

    expect(schedule?.monday).toEqual({ enabled: true, startTime, endTime });
    expect(schedule?.sunday).toEqual({ enabled: true, startTime, endTime });
  });

  it('recognizes closed Sunday', () => {
    const notes = 'Horaire Santé Québec : Lundi: 9 h à 21 h; Mardi: 9 h à 21 h; Mercredi: 9 h à 21 h; Jeudi: 9 h à 21 h; Vendredi: 9 h à 21 h; Samedi: 9 h à 18 h; Dimanche: fermé';

    const schedule = extractSanteQuebecWeeklyScheduleFromNotes(notes);

    expect(schedule?.sunday).toEqual({ enabled: false });
  });

  it('returns null if a Santé Québec day is missing', () => {
    const notes = 'Horaire Santé Québec : Lundi: 9 h à 21 h; Mardi: 9 h à 21 h';

    expect(extractSanteQuebecWeeklyScheduleFromNotes(notes)).toBeNull();
  });

  it('returns null for ambiguous Santé Québec text', () => {
    const notes = 'Horaire Santé Québec : Lundi: variable; Mardi: variable; Mercredi: variable; Jeudi: variable; Vendredi: variable; Samedi: variable; Dimanche: variable';

    expect(extractSanteQuebecWeeklyScheduleFromNotes(notes)).toBeNull();
  });
});

describe('formatPharmacyWeeklySchedule', () => {
  it('formats the structured schedule for compact display', () => {
    const schedule = extractWeeklyScheduleFromNotes('Lun-ven 08:00-17:00');
    expect(formatPharmacyWeeklySchedule(schedule ?? undefined)).toBe('Lun–ven 08:00–17:00');
  });
});
