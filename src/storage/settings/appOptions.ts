import type { TaxStatus } from '../schema';

export type AppOptions = {
  missionDefaults: {
    defaultMissionType: string;
    defaultStartTime: string;
    defaultEndTime: string;
    defaultBreakMinutes: number;
    mealAutoEnabled: boolean;
    mealThresholdHours: number;
    mealDefaultCents: number;
    mileageRateCents: number;
  };

  invoiceDefaults: {
    invoiceDueDays: number;
    paymentTerms?: string;
  };

  pdfCalendar: {
    calendarIcsEnabled: boolean;
    calendarReminderMinutes?: number | null;
    pdfFooterEnabled: boolean;
    calendarEventTitle: string;
    calendarReminder: 'NONE' | 'ONE_HOUR' | 'DAY_BEFORE';
  };
};

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