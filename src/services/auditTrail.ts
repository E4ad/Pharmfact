import { createId } from './ids';
import type { AppState, AuditTrailEntry } from '../storage/schema';

export type AuditTrailInput = Omit<AuditTrailEntry, 'id' | 'eventDate'> & {
  eventDate?: string;
};

type CollectionKey =
  | 'missions'
  | 'invoices'
  | 'pharmacies'
  | 'pharmaciens'
  | 'taxPayments'
  | 'deductibleExpenses'
  | 'expenseReceipts';

const collectionLabels: Record<CollectionKey, string> = {
  missions: 'mission',
  invoices: 'facture',
  pharmacies: 'pharmacie',
  pharmaciens: 'pharmacien',
  taxPayments: 'acompte',
  deductibleExpenses: 'dépense',
  expenseReceipts: 'justificatif',
};

function normalize(value: unknown): string {
  return JSON.stringify(value, (_, nested) => {
    if (nested instanceof Date) return nested.toISOString();
    return nested;
  });
}

function collectionSignature<T extends { id: string }>(items: T[]): Map<string, string> {
  return new Map(items.map((item) => [item.id, normalize(item)]));
}

function summarizeCollectionChanges(
  previous: AppState,
  next: AppState,
): Array<{ key: CollectionKey; added: number; updated: number; removed: number }> {
  const keys: CollectionKey[] = [
    'missions',
    'invoices',
    'pharmacies',
    'pharmaciens',
    'taxPayments',
    'deductibleExpenses',
    'expenseReceipts',
  ];

  return keys
    .map((key) => {
      const before = collectionSignature((previous[key] ?? []) as Array<{ id: string }>);
      const after = collectionSignature((next[key] ?? []) as Array<{ id: string }>);
      const added = [...after.keys()].filter((id) => !before.has(id)).length;
      const removed = [...before.keys()].filter((id) => !after.has(id)).length;
      const updated = [...after.entries()].filter(
        ([id, signature]) => before.has(id) && before.get(id) !== signature,
      ).length;
      return { key, added, updated, removed };
    })
    .filter((item) => item.added || item.updated || item.removed);
}

export function buildAuditTrailEntry(previous: AppState, next: AppState): AuditTrailInput | null {
  const changes = summarizeCollectionChanges(previous, next);
  const configSections = [
    'appOptions',
    'fiscalSettings',
    'uiSettings',
    'localDataSettings',
    'ui.missionFilters',
  ] as const;
  const configChanges = configSections.filter((section) => {
    if (section === 'ui.missionFilters') {
      return normalize(previous.ui.missionFilters) !== normalize(next.ui.missionFilters);
    }
    if (section === 'appOptions')
      return normalize(previous.appOptions) !== normalize(next.appOptions);
    if (section === 'fiscalSettings')
      return normalize(previous.fiscalSettings) !== normalize(next.fiscalSettings);
    if (section === 'uiSettings')
      return normalize(previous.uiSettings) !== normalize(next.uiSettings);
    return normalize(previous.localDataSettings) !== normalize(next.localDataSettings);
  });

  if (!changes.length && !configChanges.length) return null;

  const primary = changes[0];
  const secondary = changes.slice(1, 3);
  const label = primary
    ? primary.added && !primary.updated && !primary.removed
      ? `${primary.added} ${collectionLabels[primary.key]}${primary.added > 1 ? 's' : ''} ajoutée${primary.added > 1 ? 's' : ''}`
      : primary.removed && !primary.added && !primary.updated
        ? `${primary.removed} ${collectionLabels[primary.key]}${primary.removed > 1 ? 's' : ''} supprimée${primary.removed > 1 ? 's' : ''}`
        : `${collectionLabels[primary.key]}s mises à jour`
    : 'Paramètres mis à jour';

  const detail = [
    ...changes.map((change) => {
      const parts: string[] = [];
      if (change.added) parts.push(`+${change.added}`);
      if (change.updated) parts.push(`~${change.updated}`);
      if (change.removed) parts.push(`-${change.removed}`);
      return `${collectionLabels[change.key]}s ${parts.join(' ')}`;
    }),
    ...(configChanges.length ? [`config: ${configChanges.join(', ')}`] : []),
  ].join(' · ');

  return {
    eventType: 'STATE_UPDATED',
    scope:
      primary?.key === 'missions'
        ? 'missions'
        : primary?.key === 'invoices'
          ? 'invoices'
          : primary?.key === 'pharmacies' || primary?.key === 'pharmaciens'
            ? 'references'
            : 'data',
    label,
    detail: secondary.length
      ? `${detail} · ${secondary.map((item) => collectionLabels[item.key]).join(', ')}`
      : detail,
  };
}

export function createAuditTrailEntry(input: AuditTrailInput): AuditTrailEntry {
  return {
    id: createId('audit'),
    eventDate: input.eventDate ?? new Date().toISOString(),
    eventType: input.eventType,
    scope: input.scope,
    label: input.label,
    detail: input.detail,
  };
}

export function appendAuditTrail(state: AppState, input: AuditTrailInput | null): AppState {
  if (!input) return state;
  const auditTrail = [createAuditTrailEntry(input), ...(state.ui.auditTrail ?? [])].slice(0, 50);
  return {
    ...state,
    ui: {
      ...state.ui,
      auditTrail,
    },
  };
}

export function buildBackupAuditTrailEntry(
  action: 'BACKUP_IMPORTED' | 'STATE_RESET',
  detail: string,
): AuditTrailInput {
  return {
    eventType: action,
    scope: 'backup',
    label: action === 'BACKUP_IMPORTED' ? 'Sauvegarde restaurée' : 'Données réinitialisées',
    detail,
    eventDate: new Date().toISOString(),
  };
}

export function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
