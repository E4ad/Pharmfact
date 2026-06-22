export type MetricCategory = 'kpi' | 'action' | 'object' | 'diagnostic';

export type MetricInteractionMode = 'navigate' | 'filter' | 'modal' | 'action' | 'detail';

export type MetricOwnerPage = 'Accueil' | 'Missions' | 'Factures' | 'Finance' | 'Pharmacies' | 'Options';

export type MetricDefinition = {
  id: string;
  label: string;
  category: MetricCategory;
  ownerPage: MetricOwnerPage;
  ownerHref: string;
  definition: string;
  interactionMode: MetricInteractionMode;
  isActionable: boolean;
};

export const metricDefinitions = {
  missionsUpcoming7d: {
    id: 'missionsUpcoming7d',
    label: 'Missions à venir - 7 jours',
    category: 'kpi',
    ownerPage: 'Missions',
    ownerHref: '/missions?filter=upcoming_7d',
    definition: 'Missions dont la date de début tombe entre aujourd’hui et J+7, inclus.',
    interactionMode: 'filter',
    isActionable: true,
  },
  missionsEstimated7d: {
    id: 'missionsEstimated7d',
    label: 'Montant estimé - 7 jours',
    category: 'kpi',
    ownerPage: 'Missions',
    ownerHref: '/missions?filter=estimated_7d',
    definition: 'Total hors taxes des missions planifiées ou en cours sur la fenêtre glissante de 7 jours.',
    interactionMode: 'filter',
    isActionable: true,
  },
  missionsToInvoice: {
    id: 'missionsToInvoice',
    label: 'Missions à facturer',
    category: 'kpi',
    ownerPage: 'Missions',
    ownerHref: '/missions?filter=to_invoice',
    definition: 'Missions terminées et validées qui n’ont pas encore généré de facture.',
    interactionMode: 'filter',
    isActionable: true,
  },
  invoicesToSend: {
    id: 'invoicesToSend',
    label: 'À envoyer',
    category: 'kpi',
    ownerPage: 'Factures',
    ownerHref: '/invoices?filter=to_send',
    definition: 'Factures générées qui n’ont pas encore quitté le statut brouillon.',
    interactionMode: 'filter',
    isActionable: true,
  },
  invoicesToCollect: {
    id: 'invoicesToCollect',
    label: 'À encaisser',
    category: 'kpi',
    ownerPage: 'Factures',
    ownerHref: '/invoices?filter=receivable',
    definition: 'Factures émises ou envoyées, non payées et non annulées.',
    interactionMode: 'filter',
    isActionable: true,
  },
  invoicesOverdue: {
    id: 'invoicesOverdue',
    label: 'Échues',
    category: 'kpi',
    ownerPage: 'Factures',
    ownerHref: '/invoices?filter=overdue',
    definition: 'Factures non payées dont la date d’échéance est dépassée.',
    interactionMode: 'filter',
    isActionable: true,
  },
  invoicesToVerify: {
    id: 'invoicesToVerify',
    label: 'À vérifier',
    category: 'diagnostic',
    ownerPage: 'Factures',
    ownerHref: '/invoices?filter=attention',
    definition: 'Factures ou missions qui présentent une incohérence détectée.',
    interactionMode: 'detail',
    isActionable: true,
  },
  financeSmallSupplier: {
    id: 'financeSmallSupplier',
    label: 'Petit fournisseur',
    category: 'diagnostic',
    ownerPage: 'Finance',
    ownerHref: '/financial',
    definition: 'Cumul taxable surveillé sur la fenêtre de référence du petit fournisseur.',
    interactionMode: 'detail',
    isActionable: false,
  },
  diagnosticsDataHealth: {
    id: 'diagnosticsDataHealth',
    label: 'Santé des données',
    category: 'diagnostic',
    ownerPage: 'Options',
    ownerHref: '/options?panel=data',
    definition: 'Doublons, liens orphelins et erreurs de validation locales.',
    interactionMode: 'detail',
    isActionable: true,
  },
  pharmaciesUnpaidInvoices: {
    id: 'pharmaciesUnpaidInvoices',
    label: 'Impayées',
    category: 'object',
    ownerPage: 'Pharmacies',
    ownerHref: '/pharmacies',
    definition: 'Factures en circulation pour une pharmacie donnée.',
    interactionMode: 'modal',
    isActionable: false,
  },
} as const satisfies Record<string, MetricDefinition>;

export type MetricId = keyof typeof metricDefinitions;

export function getMetricDefinition(metricId: MetricId | string): MetricDefinition | undefined {
  return metricDefinitions[metricId as MetricId];
}
