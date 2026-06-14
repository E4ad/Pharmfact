import { z } from 'zod';
import { APP_SCHEMA_VERSION, type AppState } from './schema';

export type ValidationWarning = {
  path: string;
  message: string;
};

export type ValidationError = {
  path: string;
  message: string;
};

export type AppStateValidationResult = {
  success: boolean;
  state?: AppState;
  warnings: ValidationWarning[];
  errors: ValidationError[];
};

const entitySchema = z.object({ id: z.string().min(1) }).passthrough();
const looseObjectSchema = z.record(z.string(), z.unknown());

const appStateSchema = z.object({
  version: z.number().int().min(1).max(APP_SCHEMA_VERSION),
  activePharmacienId: z.string().nullable(),
  pharmaciens: z.array(entitySchema),
  pharmacies: z.array(entitySchema),
  missions: z.array(entitySchema),
  invoices: z.array(entitySchema),
  taxPayments: z.array(z.unknown()),
  deductibleExpenses: z.array(z.unknown()),
  expenseReceipts: z.array(z.unknown()),
  fiscalSettings: looseObjectSchema,
  distanceReferences: z.array(z.unknown()),
  opqPharmacistRegistry: looseObjectSchema,
  appOptions: looseObjectSchema,
  uiSettings: looseObjectSchema,
  localDataSettings: looseObjectSchema,
  ui: looseObjectSchema,
}).passthrough();

function pushDomainWarnings(state: AppState, warnings: ValidationWarning[]): void {
  state.pharmaciens.forEach((pharmacien, index) => {
    if (!pharmacien.nom?.trim()) {
      warnings.push({ path: `pharmaciens[${index}].nom`, message: 'Nom du pharmacien manquant.' });
    }
    if (pharmacien.hourlyRateCents < 0) {
      warnings.push({ path: `pharmaciens[${index}].hourlyRateCents`, message: 'Taux horaire négatif détecté.' });
    }
  });

  state.pharmacies.forEach((pharmacie, index) => {
    if (!pharmacie.nom?.trim()) {
      warnings.push({ path: `pharmacies[${index}].nom`, message: 'Nom de pharmacie manquant.' });
    }
  });

  state.missions.forEach((mission, index) => {
    if (!mission.missionCode?.trim()) {
      warnings.push({ path: `missions[${index}].missionCode`, message: 'Code mission manquant.' });
    }
    if (mission.dateDebut > mission.dateFin) {
      warnings.push({ path: `missions[${index}].dates`, message: 'Date de début postérieure à la date de fin.' });
    }
  });

  state.invoices.forEach((invoice, index) => {
    if (!invoice.numero?.trim()) {
      warnings.push({ path: `invoices[${index}].numero`, message: 'Numéro de facture manquant.' });
    }
    if (invoice.amountCents < 0) {
      warnings.push({ path: `invoices[${index}].amountCents`, message: 'Montant de facture négatif détecté.' });
    }
  });
}

export function validateAppStateWithDetails(state: AppState): AppStateValidationResult {
  const parsed = appStateSchema.safeParse(state);

  if (!parsed.success) {
    return {
      success: false,
      warnings: [],
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const warnings: ValidationWarning[] = [];
  pushDomainWarnings(state, warnings);

  return {
    success: true,
    state,
    warnings,
    errors: [],
  };
}
