import type { Invoice } from '../storage/schema';

export type MissionEditAction = 'save' | 'save_regenerate' | 'save_internal' | 'create_corrected_version';

export type InvoiceEditImpact = {
  level: 'info' | 'warning' | 'danger';
  message: string;
  canSilentlyRegenerate: boolean;
  requiresExplicitRegeneration: boolean;
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
    };
  }

  if (invoice.status === 'GENERATED') {
    return {
      level: 'warning',
      message: 'Cette mission possède déjà une facture générée. Les modifications peuvent recalculer la facture liée.',
      canSilentlyRegenerate: true,
      requiresExplicitRegeneration: false,
    };
  }

  if (invoice.status === 'SENT') {
    return {
      level: 'danger',
      message: 'Attention : cette facture a déjà été envoyée au paiement. Toute modification peut nécessiter de transmettre un nouveau PDF au client.',
      canSilentlyRegenerate: false,
      requiresExplicitRegeneration: true,
    };
  }

  if (invoice.status === 'PAID') {
    return {
      level: 'danger',
      message: 'Attention : cette facture est marquée comme payée. La mission peut être modifiée pour correction interne, mais la facture payée ne devrait pas être remplacée sans validation.',
      canSilentlyRegenerate: false,
      requiresExplicitRegeneration: true,
    };
  }

  if (invoice.status === 'ARCHIVED') {
    return {
      level: 'warning',
      message: 'Cette facture est archivée. Les corrections doivent rester internes sauf restauration explicite de la facture.',
      canSilentlyRegenerate: false,
      requiresExplicitRegeneration: true,
    };
  }

  return {
    level: 'warning',
    message: 'Cette facture est annulée. Les modifications ne rééditeront pas automatiquement le document annulé.',
    canSilentlyRegenerate: false,
    requiresExplicitRegeneration: false,
  };
}

export function getAvailableEditActions(invoice?: Invoice): MissionEditActionDefinition[] {
  if (!invoice) {
    return [{ action: 'save', label: 'Sauvegarder les modifications', primary: true }];
  }

  if (invoice.status === 'GENERATED') {
    return [
      { action: 'save', label: 'Sauvegarder' },
      { action: 'save_regenerate', label: 'Sauvegarder et rééditer facture', primary: true },
    ];
  }

  if (invoice.status === 'SENT') {
    return [
      { action: 'save', label: 'Sauvegarder sans rééditer' },
      { action: 'save_regenerate', label: 'Générer nouveau PDF', primary: true },
    ];
  }

  if (invoice.status === 'PAID') {
    return [
      { action: 'save_internal', label: 'Sauvegarder correction interne', primary: true },
      { action: 'create_corrected_version', label: 'Créer une version corrigée' },
    ];
  }

  return [{ action: 'save_internal', label: 'Sauvegarder correction interne', primary: true }];
}
