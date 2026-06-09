import type { AppState, DeductibleExpense, ExpenseReceipt, Invoice, Mission, Pharmacien, Pharmacie, TaxPayment } from '../../storage/schema';

export function createPharmacien(overrides: Partial<Pharmacien> = {}): Pharmacien {
  return {
    id: 'ph_1',
    nom: 'Pharmacien Test',
    adresse: '',
    rue: '',
    numero: '',
    ville: 'Québec',
    codePostal: 'G1R 1S8',
    lat: 46.8,
    lng: -71.2,
    telephone: '418-555-0000',
    email: 'ph@test.com',
    hourlyRateCents: 8000,
    distanceKmDomicile: 0,
    defaultMissionType: 'REMPLACEMENT_OFFICINE',
    defaultStartTime: '08:00',
    defaultEndTime: '17:00',
    defaultBreakMinutes: 60,
    mealAutoEnabled: true,
    mealThresholdHours: 8,
    mealDefaultCents: 2000,
    mileageRateCents: 61,
    taxStatus: 'SMALL_SUPPLIER',
    ...overrides,
  };
}

export function createPharmacie(overrides: Partial<Pharmacie> = {}): Pharmacie {
  return {
    id: 'pha_1',
    displayLabel: undefined,
    nom: 'Pharmacie Test',
    adresse: '123 Rue Test',
    rue: 'Rue Test',
    numero: '123',
    ville: 'Québec',
    codePostal: 'G1R 1S8',
    lat: 46.8,
    lng: -71.2,
    telephone: '418-555-0000',
    email: 'pha@test.com',
    defaultBreakMinutes: 60,
    ...overrides,
  };
}

export function createMission(overrides: Partial<Mission> = {}): Mission {
  const baseDay = {
    id: 'day_1',
    dateService: '2026-06-10',
    startTime: '08:00',
    endTime: '17:00',
    unpaidBreakMinutes: 60,
    description: '',
    hours: 8,
    expenses: [],
  };

  return {
    id: 'mis_1',
    missionCode: 'MIS-001',
    pharmacienId: 'ph_1',
    pharmacieId: 'pha_1',
    invoiceId: undefined,
    status: 'COMPLETED',
    dateDebut: '2026-06-10',
    dateFin: '2026-06-10',
    hourlyRateCents: 8000,
    mealFeeCents: 0,
    mileageKm: 0,
    mileageRateCents: 61,
    totalHours: 8,
    subtotalCents: 0,
    mealTotalCents: 0,
    mileageTotalCents: 0,
    totalCents: 0,
    notes: '',
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [baseDay],
    ...overrides,
  } as Mission;
}

export function createExpense(overrides: Partial<DeductibleExpense> = {}): DeductibleExpense {
  return {
    id: 'exp_1',
    date: '2026-06-10',
    category: 'OTHER',
    amountCents: 1000,
    description: '',
    receiptFileName: undefined,
    receiptUrl: undefined,
    ...overrides,
  } as DeductibleExpense;
}

export function createInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv_1',
    numero: 'FAC-2026-0001',
    pharmacienId: 'ph_1',
    pharmacieId: 'pha_1',
    missionId: 'mis_1',
    dateFacture: '2026-06-10',
    dateEcheance: '2026-07-10',
    status: 'GENERATED',
    amountCents: 10000,
    hours: 8,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Invoice;
}

export function createTaxPayment(overrides: Partial<TaxPayment> = {}): TaxPayment {
  return {
    id: 'tax_1',
    date: '2026-04-01',
    period: 'T1 2026',
    authority: 'REVENU_QUEBEC',
    type: 'INCOME_TAX_INSTALMENT',
    amountCents: 5000,
    reference: '',
    notes: '',
    ...overrides,
  } as TaxPayment;
}

export function createReceipt(overrides: Partial<ExpenseReceipt> = {}): ExpenseReceipt {
  return {
    id: 'rcpt_1',
    expenseId: 'exp_1',
    missionId: 'mis_1',
    missionDayId: 'day_1',
    fileName: 'recu.jpg',
    fileType: 'image/jpeg',
    fileSizeBytes: 1000,
    storageUrl: 'receipts/mis_1/exp_1/rcpt_1-recu.jpg',
    uploadedAt: new Date().toISOString(),
    ocrStatus: 'NOT_PROCESSED',
    ...overrides,
  } as ExpenseReceipt;
}

export function createBinaryFile(mimeType = 'image/jpeg', size = 500): { buffer: ArrayBuffer; type: string; name: string } {
  const buffer = new ArrayBuffer(size);
  return { buffer, type: mimeType, name: 'test.bin' };
}

export function buildE2EState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 2,
    activePharmacienId: 'ph_1',
    pharmaciens: [createPharmacien()],
    pharmacies: [createPharmacie()],
    missions: [createMission()],
    invoices: [createInvoice()],
    taxPayments: [],
    deductibleExpenses: [],
    expenseReceipts: [],
    fiscalSettings: {
      reserveRate: 30,
      defaultTaxStatus: 'SMALL_SUPPLIER',
      enableInstalmentTracking: true,
    },
    distanceReferences: [],
    appOptions: {
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
      invoiceDefaults: { invoiceDueDays: 30, paymentTerms: 'Net' },
      pdfCalendar: { calendarIcsEnabled: true },
    },
    uiSettings: { themeMode: 'system', lastVisitedAt: new Date().toISOString() },
    localDataSettings: { autoBackupEnabled: true },
    ui: {},
    ...overrides,
  } as AppState;
}
