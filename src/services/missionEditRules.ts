import type { Invoice } from '../storage/schema';

export type MissionEditAction = 'save' | 'save_regenerate' | 'save_internal' | 'create_corrected_version';

export type InvoiceEditImpact = {
  level: 'info' | 'warning' | 'danger';
  message: string;
  canSilentlyRegenerate: boolean;
  requiresExplicitRegeneration: boolean;
  requiresCorrectedVersion: boolean;
  recommendedAction: MissionEditAction;
};

export type MissionEditActionDefinition = {
  action: MissionEditAction;
  label: string;
  primary?: boolean;
};

export function getInvoiceEditImpact(invoice?: Invoice): InvoiceEditImpact {
  if (!invoice) {
    return {
      level: 'info',
      message: 'Cette mission n’a pas encore de facture.',
      canSilentlyRegenerate: false,
      requiresExplicitRegeneration: false,
      requiresCorrectedVersion: false,
      recommendedAction: 'save',
    };
  }

  if (invoice.status === 'GENERATED' || invoice.status === 'draft') {
    return {
      level: 'warning',
      message: 'Cette mission possède déjà une facture générée. Les modifications peuvent recalculer la facture liée.',
      canSilentlyRegenerate: true,
      requiresExplicitRegeneration: false,
      requiresCorrectedVersion: false,
      recommendedAction: 'save_regenerate',
    };
  }

  if (invoice.status === 'SENT' || invoice.status === 'sent') {
    return {
      level: 'danger',
      message: 'Attention : cette facture a déjà été envoyée au paiement. Toute modification peut nécessiter de transmettre un nouveau PDF au client.',
      canSilentlyRegenerate: false,
      requiresExplicitRegeneration: true,
      requiresCorrectedVersion: false,
      recommendedAction: 'save_regenerate',
    };
  }

  if (invoice.status === 'PAID' || invoice.paymentStatus === 'paid') {
    return {
      level: 'danger',
      message: 'Attention : cette facture est payée. La correction doit créer une nouvelle version plutôt que remplacer le document réglé.',
      canSilentlyRegenerate: false,
      requiresExplicitRegeneration: true,
      requiresCorrectedVersion: true,
      recommendedAction: 'create_corrected_version',
    };
  }

  if (invoice.status === 'ARCHIVED' || invoice.status === 'archived') {
    return {
      level: 'warning',
      message: 'Cette facture est archivée. Les corrections doivent créer une version corrigée ou rester internes selon le besoin métier.',
      canSilentlyRegenerate: false,
      requiresExplicitRegeneration: true,
      requiresCorrectedVersion: true,
      recommendedAction: 'create_corrected_version',
    };
  }

  return {
    level: 'warning',
    message: 'Cette facture est annulée. Les modifications ne rééditeront pas automatiquement le document annulé.',
    canSilentlyRegenerate: false,
    requiresExplicitRegeneration: false,
    requiresCorrectedVersion: false,
    recommendedAction: 'save_internal',
  };
}

export function getAvailableEditActions(invoice?: Invoice): MissionEditActionDefinition[] {
  if (!invoice) {
    return [{ action: 'save', label: 'Sauvegarder les modifications', primary: true }];
  }

  if (invoice.status === 'GENERATED' || invoice.status === 'draft') {
    return [
      { action: 'save', label: 'Sauvegarder' },
      { action: 'save_regenerate', label: 'Sauvegarder et rééditer facture', primary: true },
    ];
  }

  if (invoice.status === 'SENT' || invoice.status === 'sent') {
    return [
      { action: 'save', label: 'Sauvegarder sans rééditer' },
      { action: 'save_regenerate', label: 'Sauvegarder et télécharger le nouveau PDF', primary: true },
    ];
  }

  if (invoice.status === 'PAID' || invoice.paymentStatus === 'paid') {
    return [
      { action: 'create_corrected_version', label: 'Créer une version corrigée', primary: true },
      { action: 'save_internal', label: 'Sauvegarder correction interne' },
    ];
  }

  if (invoice.status === 'ARCHIVED' || invoice.status === 'archived') {
    return [
      { action: 'create_corrected_version', label: 'Créer une version corrigée', primary: true },
      { action: 'save_internal', label: 'Sauvegarder correction interne' },
    ];
  }

  return [{ action: 'save_internal', label: 'Sauvegarder correction interne', primary: true }];
}
