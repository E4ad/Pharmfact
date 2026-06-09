export type { AppOptions } from '../schema';
import type { AppOptions } from '../schema';

export function createDefaultAppOptions(): AppOptions {
  return {
    missionDefaults: {
      defaultMissionType: 'REMPLACEMENT_OFFICINE',
      defaultStartTime: '08:00',
      defaultEndTime: '17:00',
      defaultBreakMinutes: 60,
      mealAutoEnabled: true,
      mealThresholdHours: 8,
      mealDefaultCents: 2000,
      mileageRateCents: 61,
    },
    invoiceDefaults: {
      invoiceDueDays: 30,
      paymentTerms: 'Paiement par virement dans les 30 jours.',
    },
    pdfCalendar: {
      calendarIcsEnabled: true,
      calendarReminderMinutes: null,
      pdfFooterEnabled: true,
      calendarEventTitle: 'Mission pharmacie',
      calendarReminder: 'NONE',
    },
  };
}
