import { daysBetween } from '../../services/missionCalculator';

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long' }).format(
    new Date(`${isoString}T00:00:00`),
  );
}

export function formatShortDate(isoString: string): string {
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short' }).format(
    new Date(`${isoString}T00:00:00`),
  );
}

export function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'short', timeStyle: 'medium' }).format(
    new Date(value),
  );
}

export function hoursLabel(hours: number): string {
  return `${hours.toFixed(2).replace('.', ',')} h`;
}

export function formatMissionDatesSummary(dates: string[]): string {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) return 'Dates à préciser';
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (sorted.length === 1) return formatter.format(new Date(`${sorted[0]}T00:00:00`));
  const first = sorted[0];
  const last = sorted.at(-1) ?? first;
  const consecutive = daysBetween(first, last).length === sorted.length;
  if (consecutive) {
    return `du ${new Intl.DateTimeFormat('fr-CA', { day: 'numeric' }).format(new Date(`${first}T00:00:00`))} au ${formatter.format(new Date(`${last}T00:00:00`))}`;
  }
  if (sorted.length <= 4) {
    const parts = sorted.map((d) =>
      new Intl.DateTimeFormat('fr-CA', { day: 'numeric' }).format(new Date(`${d}T00:00:00`)),
    );
    const monthYear = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(
      new Date(`${first}T00:00:00`),
    );
    return `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' et ' : ''}${parts.at(-1)} ${monthYear}`;
  }
  return `${sorted.length} jours sélectionnés`;
}
