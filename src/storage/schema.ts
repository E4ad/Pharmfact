export const APP_STORAGE_KEY = 'mission-app:v1';
export const APP_SCHEMA_VERSION = 4;

export type TaxStatus = 'SMALL_SUPPLIER' | 'REGISTERED';

export type MissionStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type InvoiceStatus =
  | 'draft'
  | 'ready_to_send'
  | 'sent'
  | 'replaced'
  | 'archived'
  | 'GENERATED'
  | 'SENT'
  | 'PAID'
  | 'VOIDED'
  | 'ARCHIVED';

export type PaymentStatus =
  | 'to_collect'
  | 'partial'
  | 'paid';

export type PaymentMethod =
  | 'transfer'
  | 'cheque'
  | 'direct_deposit'
  | 'interac'
  | 'cash'
  | 'other'
  | 'VIREMENT'
  | 'CHEQUE'
  | 'INTERAC'
  | 'COMPTANT'
  | 'AUTRE';

export type InvoicePayment = {
  id: string;
  amount: number;
  receivedAt: string;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type InvoiceVersionInfo = {
  baseNumber: string;
  version: number;
  replacesInvoiceId?: string;
  replacedByInvoiceId?: string;
  isActiveVersion: boolean;
};

export type InvoiceCorrectionState = {
  missionChangedAfterDraft?: boolean;
  pdfNeedsRegeneration?: boolean;
  correctionRequired?: boolean;
};

export type InvoiceOverpaymentState = {
  amount: number;
  manuallyHandled: boolean;
  handledAt?: string;
  note?: string;
};

export type ActType =
  | 'REMPLACEMENT_OFFICINE'
  | 'PHARMACIEN_GMF'
  | 'CLINIQUE'
  | 'TELEPHARMACIE'
  | 'CONSEIL_FORMATION'
  | 'AUTRE';

export type TaxClassification =
  | 'TAXABLE_SUPPLY'
  | 'EXEMPT_SUPPLY'
  | 'ZERO_RATED_SUPPLY'
  | 'OUT_OF_SCOPE'
  | 'TO_VALIDATE';

export type MissionEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED';

export type Pharmacien = {
  id: string;
  nom: string;
  opqLicenseNumber?: string;
  opqRegistryId?: string;
  opqStatusLabel?: string;
  opqVerifiedAt?: string;
  adresse: string;
  rue?: string;
  numero?: string;
  ville: string;
  codePostal: string;
  lat?: number;
  lng?: number;
  geocodedAt?: string;
  geocodedAddressHash?: string;
  telephone: string;
  email: string;
  hourlyRateCents: number;
  distanceKmDomicile: number;
  defaultMissionType?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultBreakMinutes?: number;
  mealAutoEnabled?: boolean;
  mealThresholdHours?: number;
  mealDefaultCents?: number;
  mileageRateCents?: number;
  taxStatus: TaxStatus;
  gstNumber?: string;
  qstNumber?: string;
  favoritePharmacieId?: string;
  invoiceDueDays?: number;
  paymentTerms?: string;
  isDefaultProfile?: boolean;
};

export type Pharmacie = {
  id: string;
  displayLabel?: string;
  nom: string;
  adresse: string;
  rue?: string;
  numero?: string;
  ville: string;
  codePostal: string;
  lat?: number;
  lng?: number;
  geocodedAt?: string;
  geocodedAddressHash?: string;
  telephone: string;
  email: string;
  billingContactName?: string;
  billingEmail?: string;
  billingPhone?: string;
  usualHourlyRateCents?: number;
  paymentTerms?: string;
  distanceKm?: number;
  defaultBreakMinutes: number;
  defaultMissionType?: string;
  franchise?: PharmacyFranchise;
  franchiseLabel?: string;
  weeklySchedule?: PharmacyWeeklySchedule;
  isFavorite?: boolean;
  favoriteRank?: number;
  lastUsedAt?: string;
  notes?: string;
};

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type PharmacyFranchise =
  | 'jean_coutu'
  | 'familiprix'
  | 'uniprix'
  | 'brunet'
  | 'pharmaprix'
  | 'proxim'
  | 'acces_pharma'
  | 'independent'
  | 'other'
  | 'unknown';

export type PharmacyDaySchedule = {
  enabled: boolean;
  startTime?: string;
  endTime?: string;
};

export type PharmacyWeeklySchedule = Record<Weekday, PharmacyDaySchedule> & {
  source?: 'manual' | 'notes_migration' | 'unknown';
  extractedFromNotes?: boolean;
  sourceLabel?: string;
  updatedAt?: string;
};

export type DistanceReference = {
  id: string;
  pharmacienId: string;
  pharmacieId: string;
  distanceKm: number;
  distanceAllerKm?: number;
  fromAddressHash: string;
  toAddressHash: string;
  provider?: 'osrm' | 'manual';
  computedAt: string;
  errorReason?: string;
  source: 'route' | 'manual' | 'cached';
  updatedAt: string;
  /** @deprecated Use fromAddressHash. Preserved for legacy migration compatibility. */
  pharmacienAddressKey?: string;
  /** @deprecated Use toAddressHash. Preserved for legacy migration compatibility. */
  pharmacieAddressKey?: string;
};

export type OpqPharmacistRegistryEntry = {
  id: string;
  fullName: string;
  licenseNumber?: string | null;
  studentLicenseNumber?: string | null;
  city?: string | null;
  isStudent: boolean;
};

export type OpqPharmacistRegistry = {
  entries: OpqPharmacistRegistryEntry[];
  updatedAt?: string;
  sourceUrl: string;
};

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

export type DeductibleExpenseCategory =
  | 'MEAL'
  | 'MILEAGE'
  | 'PARKING'
  | 'TOLL'
  | 'LODGING'
  | 'TRANSPORT'
  | 'SUPPLIES'
  | 'OTHER'
  | 'NON_DEDUCTIBLE';

export type MissionExpense = {
  id: string;
  type?: 'REPAS' | 'KM' | 'AUTRE';
  typeKey: string;
  label: string;
  amountCents: number;
  amount?: number;
  notes?: string;
  billable: boolean;
  createsDeductibleExpense: boolean;
  deductibleCategory: DeductibleExpenseCategory;
  deductibleRate: number;
  distanceKm?: number;
  unitRateCents?: number;
  unitRate?: number;
  quantity?: number;
  receiptIds?: string[];
  source: 'MISSION_EXPENSE';
  missionId?: string;
  missionDayId?: string;
  isAutoGenerated?: boolean;
  isLocked?: boolean;
};

export type ExpenseReceipt = {
  id: string;
  expenseId: string;
  missionId: string;
  missionDayId?: string;
  fileName: string;
  fileType: 'image/jpeg' | 'image/png' | 'application/pdf';
  fileSizeBytes: number;
  storageUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  ocrStatus?: 'NOT_PROCESSED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  extractedAmountCents?: number;
  extractedDate?: string;
  extractedMerchant?: string;
  notes?: string;
};

export type MissionDay = {
  id: string;
  dateService: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes: number;
  description: string;
  hours: number;
  expenses?: MissionExpense[];
};

export type MissionEvent = {
  id: string;
  eventType: MissionEventType;
  label: string;
  eventDate: string;
};

export type Mission = {
  id: string;
  missionCode: string;
  pharmacienId: string;
  pharmacieId: string;
  status: MissionStatus;
  actType?: ActType | string;
  invoiceLabel?: string;
  suggestedTaxClassification?: TaxClassification;
  taxClassificationOverride?: TaxClassification;
  dateDebut: string;
  dateFin: string;
  excludedDates?: string[];
  days: MissionDay[];
  hourlyRateCents: number;
  mealFeeCents: number;
  mileageKm: number;
  mileageRateCents: number;
  totalHours: number;
  subtotalCents: number;
  mealTotalCents: number;
  mileageTotalCents: number;
  totalCents: number;
  notes?: string;
  invoiceId?: string;
  events: MissionEvent[];
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  numero: string;
  missionIds?: string[];
  missionId?: string;
  correctedFromInvoiceId?: string;
  pharmacienId: string;
  pharmacieId: string;
  dateFacture: string;
  dateEcheance: string;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  hours: number;
  amountCents: number;
  paidAmountCents?: number;
  balanceDue?: number;
  paymentTerms?: string;
  smallSupplierMention?: string;
  sentAt?: string;
  paidAt?: string;
  archivedAt?: string;
  pdfGeneratedAt?: string;
  pdfPath?: string;
  payments?: InvoicePayment[];
  versionInfo?: InvoiceVersionInfo;
  correctionState?: InvoiceCorrectionState;
  previousPaidAmount?: number;
  remainingBalanceFromCorrection?: number;
  overpayment?: InvoiceOverpaymentState;
  createdAt: string;
  updatedAt?: string;
};

export type DeductibleExpense = {
  id: string;
  date: string;
  label: string;
  category:
    | 'TRAVEL'
    | 'MEAL'
    | 'PARKING'
    | 'SOFTWARE'
    | 'PHONE_INTERNET'
    | 'PROFESSIONAL_FEES'
    | 'INSURANCE'
    | 'ACCOUNTING'
    | 'TRAINING'
    | 'OFFICE'
    | 'OTHER';
  amountCents: number;
  taxDeductible: boolean;
  missionId?: string;
  receiptId?: string;
  hasReceipt?: boolean;
  notes?: string;
};

export type TaxPayment = {
  id: string;
  date: string;
  period: string;
  authority: 'CRA' | 'REVENU_QUEBEC';
  type: 'INCOME_TAX_INSTALMENT' | 'GST_QST_REMITTANCE' | 'OTHER';
  amountCents: number;
  reference?: string;
  notes?: string;
};

export type FiscalSettings = {
  reserveRate: number;
  fiscalYearStartMonth: number;
  currentFiscalYear: number;
  smallSupplierThresholdCents: number;
  smallSupplierWarningRate: number;
  instalmentDates: string[];
  quebecNetTaxOwingThresholdCents: number;
  federalNetTaxOwingThresholdCents: number;
  federalDefaultNetTaxOwingThresholdCents: number;
  mileageRateCents?: number;
  currentYear: number;
  defaultTaxStatus: TaxStatus;
  includeMissionDeductibleExpenses: boolean;
  trackExpenseReceipts: boolean;
  warnMissingExpenseReceipts: boolean;
  showMonthlyView: boolean;
  showQuarterlyView: boolean;
  showAnnualView: boolean;
  enableInstalmentTracking: boolean;
  enableSmallSupplierTracking: boolean;
  enableExpenseTracking: boolean;
  mealDeductibleRate?: number;
  mileageDeductibleRate?: number;
  parkingDeductibleRate?: number;
  tollDeductibleRate?: number;
  lodgingDeductibleRate?: number;
  transportDeductibleRate?: number;
  suppliesDeductibleRate?: number;
  otherNonDeductibleRate?: number;
};

export type RuntimeShadowIntensity = 'none' | 'soft' | 'elevated';

export type RuntimeDesignTokenOverrides = {
  surfaceRadius?: number;
  controlRadius?: number;
  iconRadius?: number;
  borderWidth?: number;
  primaryHue?: number;
  shadowIntensity?: RuntimeShadowIntensity;
};

export type UiSettings = {
  themeMode: 'light' | 'dark' | 'system';
  primaryColor?: string;
  secondaryColor?: string;
  designTokenOverrides?: RuntimeDesignTokenOverrides;
};

export type AuditTrailEntry = {
  id: string;
  eventType: 'STATE_UPDATED' | 'BACKUP_IMPORTED' | 'STATE_RESET';
  scope: 'missions' | 'invoices' | 'references' | 'data' | 'backup';
  label: string;
  detail: string;
  eventDate: string;
};

export type LocalDataSettings = {
  autoBackupEnabled: boolean;
};

export type AppState = {
  version: 2 | 3 | 4;
  activePharmacienId: string | null;
  pharmaciens: Pharmacien[];
  pharmacies: Pharmacie[];
  missions: Mission[];
  invoices: Invoice[];
  taxPayments: TaxPayment[];
  deductibleExpenses: DeductibleExpense[];
  expenseReceipts: ExpenseReceipt[];
  fiscalSettings: FiscalSettings;
  distanceReferences: DistanceReference[];
  opqPharmacistRegistry: OpqPharmacistRegistry;
  appOptions: AppOptions;
  uiSettings: UiSettings;
  localDataSettings: LocalDataSettings;
  ui: {
    missionFilters: Record<string, unknown>;
    lastVisitedAt?: string;
    auditTrail?: AuditTrailEntry[];
  };
};
