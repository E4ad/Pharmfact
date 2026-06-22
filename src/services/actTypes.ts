import type { ActType, Mission, TaxClassification } from '../storage/schema';

export type ActTypeDefinition = {
  value: ActType;
  label: string;
  defaultInvoiceLabel: string;
  suggestedTaxClassification: TaxClassification;
  fiscalWarning: string;
};

const fiscalWarning = 'À valider selon votre situation fiscale.';

export const actTypeCatalog: ActTypeDefinition[] = [
  {
    value: 'REMPLACEMENT_OFFICINE',
    label: 'Remplacement officine',
    defaultInvoiceLabel: 'Remplacement en officine',
    suggestedTaxClassification: 'TO_VALIDATE',
    fiscalWarning,
  },
  {
    value: 'PHARMACIEN_GMF',
    label: 'Pharmacien GMF',
    defaultInvoiceLabel: 'Services professionnels en GMF',
    suggestedTaxClassification: 'TO_VALIDATE',
    fiscalWarning,
  },
  {
    value: 'CLINIQUE',
    label: 'Clinique',
    defaultInvoiceLabel: 'Services professionnels en clinique',
    suggestedTaxClassification: 'TO_VALIDATE',
    fiscalWarning,
  },
  {
    value: 'TELEPHARMACIE',
    label: 'Télépharmacie',
    defaultInvoiceLabel: 'Services de télépharmacie',
    suggestedTaxClassification: 'TO_VALIDATE',
    fiscalWarning,
  },
  {
    value: 'CONSEIL_FORMATION',
    label: 'Conseil / formation',
    defaultInvoiceLabel: 'Conseil et formation',
    suggestedTaxClassification: 'TO_VALIDATE',
    fiscalWarning,
  },
  {
    value: 'AUTRE',
    label: 'Autre',
    defaultInvoiceLabel: 'Services professionnels',
    suggestedTaxClassification: 'TO_VALIDATE',
    fiscalWarning,
  },
];

export function getActTypeDefinition(value?: string): ActTypeDefinition {
  return actTypeCatalog.find((item) => item.value === value) ?? actTypeCatalog[0];
}

export function getMissionInvoiceLabel(mission: Pick<Mission, 'actType' | 'invoiceLabel'>): string {
  return mission.invoiceLabel?.trim() || getActTypeDefinition(mission.actType).defaultInvoiceLabel;
}

