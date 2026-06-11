import { describe, expect, it } from 'vitest';
import { buildMissionIcs, downloadIcs } from './calendarIcs';
import type { Mission, Pharmacien, Pharmacie } from '../storage/schema';

const baseMission = {
  id: 'mis1',
  missionCode: 'M-001',
  pharmacienId: 'ph1',
  pharmacieId: 'pha1',
  status: 'CONFIRMED',
  dateDebut: '2026-06-10',
  dateFin: '2026-06-11',
  hourlyRateCents: 0,
  mealFeeCents: 0,
  mileageKm: 0,
  mileageRateCents: 0,
  days: [
    { id: 'day1', dateService: '2026-06-10', startTime: '08:00', endTime: '12:00', description: 'Matin', unpaidBreakMinutes: 0, hours: 4 } as any,
    { id: 'day2', dateService: '2026-06-11', startTime: '13:00', endTime: '17:00', description: 'Après-midi', unpaidBreakMinutes: 0, hours: 4 } as any,
  ],
  totalHours: 8,
  subtotalCents: 0,
  mealTotalCents: 0,
  mileageTotalCents: 0,
  totalCents: 80000,
  notes: 'Remplacement',
  events: [],
  createdAt: '',
  updatedAt: '',
} satisfies Mission;

const basePharmacien = {
  id: 'ph1',
  nom: 'Amélie Tremblay',
  adresse: '',
  ville: '',
  codePostal: '',
  telephone: '',
  email: '',
  hourlyRateCents: 0,
  distanceKmDomicile: 0,
  taxStatus: 'SMALL_SUPPLIER',
} satisfies Partial<Pharmacien> as Pharmacien;

const basePharmacie = {
  id: 'pha1',
  nom: 'Pharmacie Verte',
  adresse: '123 Main',
  ville: 'Québec',
  codePostal: 'G1R 1S8',
} satisfies Partial<Pharmacie> as Pharmacie;

describe('calendarIcs', () => {
  it('builds valid ICS string with pharmacy info', () => {
    const ics = buildMissionIcs(baseMission, basePharmacien, basePharmacie);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('UID:mis1-day1@mission-app');
    expect(ics).toContain('Pharmacie Verte');
    expect(ics).toContain('Amélie Tremblay');
    expect(ics).not.toContain('Louis Gagnon');
  });

  it('creates one calendar event per mission day', () => {
    const mission = {
      ...baseMission,
      days: [
        { ...baseMission.days[0], dateService: '2026-06-10', startTime: '09:00', endTime: '18:00', hours: 8 },
        { ...baseMission.days[1], dateService: '2026-06-11', startTime: '09:00', endTime: '18:00', hours: 8 },
      ],
    };
    const ics = buildMissionIcs(mission, basePharmacien, basePharmacie);

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('UID:mis1-day1@mission-app');
    expect(ics).toContain('UID:mis1-day2@mission-app');
    expect(ics).toContain('DTSTART:20260610T090000');
    expect(ics).toContain('DTEND:20260610T180000');
    expect(ics).toContain('DTSTART:20260611T090000');
    expect(ics).toContain('DTEND:20260611T180000');
  });

  it('falls back when no days are provided', () => {
    const mission = { ...baseMission, days: [] };
    const ics = buildMissionIcs(mission, basePharmacien, basePharmacie);

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('DTSTART:20260610T090000');
    expect(ics).toContain('DTEND:20260610T170000');
  });

  it('escapes special ICS characters', () => {
    const mission = {
      ...baseMission,
      notes: 'Note with, comma and; semicolon',
      days: [{ ...baseMission.days[0], dateService: '2026-06-10', startTime: '09:00', endTime: '17:00' }],
    };
    const ics = buildMissionIcs(mission, basePharmacien, basePharmacie);

    expect(ics).toContain('\\,');
    expect(ics).toContain('\\;');
  });

  it('generates compact date-time format', () => {
    const mission = {
      ...baseMission,
      days: [
        { id: 'day1', dateService: '2026-12-31', startTime: '08:30', endTime: '17:45', description: '', unpaidBreakMinutes: 0, hours: 0 } as any,
      ],
    };
    const ics = buildMissionIcs(mission);

    expect(ics).toContain('DTSTART:20261231T083000');
    expect(ics).toContain('DTEND:20261231T174500');
  });
});
