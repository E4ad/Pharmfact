/**
 * Utilitaires de formatage de dates
 */

/**
 * Formate une date ISO (YYYY-MM-DD) en format lisible (JJ MMM YYYY)
 * @param dateIso - Date au format YYYY-MM-DD
 * @returns Date formatée (ex: "15 janv. 2024")
 */
export function formatDate(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateIso;
  }
}

/**
 * Formate une date ISO en format complet (Jour de la semaine, JJ MMMM YYYY)
 * @param dateIso - Date au format YYYY-MM-DD
 * @returns Date formatée (ex: "lundi 15 janvier 2024")
 */
export function formatLongDate(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateIso;
  }
}

/**
 * Formate une date ISO en format pour les entrées de tableau (MMM YYYY)
 * @param dateIso - Date au format YYYY-MM-DD
 * @returns Date formatée (ex: "janv. 2024")
 */
export function formatMonthYear(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat('fr-CA', {
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateIso;
  }
}

/**
 * Retourne la date actuelle au format YYYY-MM-DD
 */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default {
  formatDate,
  formatLongDate,
  formatMonthYear,
  todayIsoDate,
};
