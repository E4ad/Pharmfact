import type { AppState, Invoice, Pharmacien, Pharmacie } from '../storage/schema';
import { validateAppStateWithDetails } from '../storage/validation';

export type DataHealthIssueSeverity = 'info' | 'warning' | 'error';

export type DataHealthIssue = {
  id: string;
  severity: DataHealthIssueSeverity;
  title: string;
  detail: string;
  actionLabel?: string;
  href?: string;
};

export type DataHealthSummary = {
  overallStatus: 'healthy' | 'watch' | 'critical';
  backupEnabled: boolean;
  duplicatePharmacies: number;
  duplicatePharmaciens: number;
  duplicateInvoiceNumbers: number;
  orphanMissions: number;
  orphanInvoices: number;
  validationWarnings: number;
  validationErrors: number;
  issues: DataHealthIssue[];
};

function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizePostalCode(value?: string): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

function pharmacyKey(
  pharmacy: Pick<Pharmacie, 'nom' | 'displayLabel' | 'adresse' | 'ville' | 'codePostal'>,
): string {
  return [
    normalizeText(pharmacy.displayLabel || pharmacy.nom),
    normalizeText(pharmacy.adresse),
    normalizeText(pharmacy.ville),
    normalizePostalCode(pharmacy.codePostal),
  ]
    .filter(Boolean)
    .join('|');
}

function pharmacistKey(pharmacien: Pick<Pharmacien, 'nom' | 'email' | 'codePostal'>): string {
  return [
    normalizeText(pharmacien.nom),
    normalizeText(pharmacien.email),
    normalizePostalCode(pharmacien.codePostal),
  ]
    .filter(Boolean)
    .join('|');
}

function countDuplicates<T>(items: T[], keyOf: (item: T) => string): number {
  const seen = new Set<string>();
  const duplicateKeys = new Set<string>();

  items.forEach((item) => {
    const key = keyOf(item);
    if (!key) return;
    if (seen.has(key)) duplicateKeys.add(key);
    else seen.add(key);
  });

  return duplicateKeys.size;
}

function invoiceMissionIds(invoice: Pick<Invoice, 'missionIds' | 'missionId'>): string[] {
  return invoice.missionIds?.length
    ? invoice.missionIds
    : invoice.missionId
      ? [invoice.missionId]
      : [];
}

function countOrphanMissions(state: AppState): number {
  const invoiceIds = new Set(state.invoices.map((invoice) => invoice.id));
  return state.missions.filter((mission) => mission.invoiceId && !invoiceIds.has(mission.invoiceId))
    .length;
}

function countOrphanInvoices(state: AppState): number {
  const missionIds = new Set(state.missions.map((mission) => mission.id));
  return state.invoices.filter((invoice) =>
    invoiceMissionIds(invoice).some((id) => !missionIds.has(id)),
  ).length;
}

export function buildDataHealthSummary(state: AppState): DataHealthSummary {
  const validation = validateAppStateWithDetails(state);
  const duplicatePharmacies = countDuplicates(state.pharmacies, pharmacyKey);
  const duplicatePharmaciens = countDuplicates(state.pharmaciens, pharmacistKey);
  const duplicateInvoiceNumbers = countDuplicates(state.invoices, (invoice) =>
    normalizeText(invoice.numero),
  );
  const orphanMissions = countOrphanMissions(state);
  const orphanInvoices = countOrphanInvoices(state);
  const backupEnabled = state.localDataSettings?.autoBackupEnabled ?? true;

  const issues: DataHealthIssue[] = [];

  if (!backupEnabled) {
    issues.push({
      id: 'auto-backup-disabled',
      severity: 'warning',
      title: 'Sauvegarde automatique désactivée',
      detail:
        'Les changements restent enregistrés localement, mais la récupération après incident est moins robuste.',
      actionLabel: 'Ouvrir les données locales',
      href: '/options?panel=data',
    });
  }

  if (duplicatePharmacies > 0) {
    issues.push({
      id: 'duplicate-pharmacies',
      severity: 'warning',
      title: 'Pharmacies potentiellement dupliquées',
      detail: `${duplicatePharmacies} groupe(s) de pharmacies présentent le même nom ou la même adresse.`,
      actionLabel: 'Vérifier les références',
      href: '/pharmacies',
    });
  }

  if (duplicatePharmaciens > 0) {
    issues.push({
      id: 'duplicate-pharmaciens',
      severity: 'warning',
      title: 'Pharmaciens potentiellement dupliqués',
      detail: `${duplicatePharmaciens} groupe(s) de pharmaciens semblent correspondre à la même identité.`,
      actionLabel: 'Vérifier les références',
      href: '/options?panel=references',
    });
  }

  if (duplicateInvoiceNumbers > 0) {
    issues.push({
      id: 'duplicate-invoices',
      severity: 'error',
      title: 'Numéros de facture dupliqués',
      detail: `${duplicateInvoiceNumbers} numéro(s) apparaissent plus d’une fois.`,
      actionLabel: 'Ouvrir les factures',
      href: '/invoices',
    });
  }

  if (orphanMissions > 0) {
    issues.push({
      id: 'orphan-missions',
      severity: 'warning',
      title: 'Missions liées à une facture manquante',
      detail: `${orphanMissions} mission(s) référencent une facture absente ou supprimée.`,
      actionLabel: 'Voir les missions',
      href: '/missions',
    });
  }

  if (orphanInvoices > 0) {
    issues.push({
      id: 'orphan-invoices',
      severity: 'warning',
      title: 'Factures liées à des missions manquantes',
      detail: `${orphanInvoices} facture(s) référencent une mission absente ou supprimée.`,
      actionLabel: 'Ouvrir les factures',
      href: '/invoices',
    });
  }

  validation.warnings.slice(0, 4).forEach((warning, index) => {
    issues.push({
      id: `validation-warning-${index}`,
      severity: 'warning',
      title: 'Avertissement de validation',
      detail: warning.path ? `${warning.path}: ${warning.message}` : warning.message,
      actionLabel: 'Corriger',
      href: '/options?panel=data',
    });
  });

  validation.errors.slice(0, 4).forEach((error, index) => {
    issues.push({
      id: `validation-error-${index}`,
      severity: 'error',
      title: 'Erreur de validation',
      detail: error.path ? `${error.path}: ${error.message}` : error.message,
      actionLabel: 'Corriger',
      href: '/options?panel=data',
    });
  });

  const overallStatus: DataHealthSummary['overallStatus'] =
    validation.errors.length || duplicateInvoiceNumbers > 0 || orphanInvoices > 0
      ? 'critical'
      : validation.warnings.length ||
          duplicatePharmacies > 0 ||
          duplicatePharmaciens > 0 ||
          orphanMissions > 0 ||
          !backupEnabled
        ? 'watch'
        : 'healthy';

  return {
    overallStatus,
    backupEnabled,
    duplicatePharmacies,
    duplicatePharmaciens,
    duplicateInvoiceNumbers,
    orphanMissions,
    orphanInvoices,
    validationWarnings: validation.warnings.length,
    validationErrors: validation.errors.length,
    issues,
  };
}
