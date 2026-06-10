import { z } from 'zod';

// Schéma pour une pharmacie
export const pharmacieSchema = z.object({
  id: z.string().min(1, 'L\'ID est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  province: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email('Email invalide').optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  defaultBreakMinutes: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

// Schéma pour la création d'une pharmacie
export const createPharmacieSchema = pharmacieSchema.omit({ id: true });

// Schéma pour la mise à jour d'une pharmacie
export const updatePharmacieSchema = createPharmacieSchema.partial();

// Middleware de validation
export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      const message = error.errors.map(e => `${e.path.join('.')} : ${e.message}`).join(', ');
      res.status(400).json({ error: 'VALIDATION_ERROR', message, details: error.errors });
    }
  };
}
