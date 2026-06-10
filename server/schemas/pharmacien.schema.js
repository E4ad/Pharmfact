import { z } from 'zod';

// Schéma pour un pharmacien
export const pharmacienSchema = z.object({
  id: z.string().min(1, 'L\'ID est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().optional(),
  email: z.string().email('Email invalide').optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  province: z.string().optional(),
  nas: z.string().optional(),
  hourlyRateCents: z.number().int().nonnegative('Le taux horaire doit être positif').optional(),
  favoritePharmacieId: z.string().optional(),
  numPermis: z.string().optional(),
  notes: z.string().optional(),
});

// Schéma pour la création d'un pharmacien
export const createPharmacienSchema = pharmacienSchema.omit({ id: true });

// Schéma pour la mise à jour d'un pharmacien
export const updatePharmacienSchema = createPharmacienSchema.partial();
