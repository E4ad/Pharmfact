# Plan de correction des erreurs — Design System

Date : 14 juin 2026  
Statut : implémenté  
Priorité : critique

## Diagnostic critique

Le plan initial identifiait correctement une dette structurelle : deux sources de tokens coexistaient dans `src/design-system/`.

Structure avant correction :

- `src/design-system/*.ts`
- `src/design-system/tokens/*.ts`
- `src/design-system/tokens.ts`
- `src/design-system/tokens/index.ts`

Le problème n’était pas seulement la duplication. Le vrai risque était la résolution implicite :

- `export * from './tokens'` pouvait pointer vers `tokens.ts`.
- `../tokens` pouvait pointer vers `tokens.ts`.
- `tokens.ts` réexportait les fichiers racine.
- Le dossier `tokens/` contenait une deuxième copie identique.

Le code compilait, mais la structure restait fragile pour Vite, le cache dev-server et les futures évolutions.

## Correction retenue

Une seule source de vérité est conservée :

```text
src/design-system/tokens/
├── animation.ts
├── borderRadius.ts
├── colors.ts
├── index.ts
├── shadows.ts
├── spacing.ts
├── typography.ts
└── zIndex.ts
```

## Changements appliqués

### Fichiers supprimés

- `src/design-system/animation.ts`
- `src/design-system/borderRadius.ts`
- `src/design-system/colors.ts`
- `src/design-system/shadows.ts`
- `src/design-system/spacing.ts`
- `src/design-system/typography.ts`
- `src/design-system/zIndex.ts`
- `src/design-system/tokens.ts`

### Fichiers modifiés

- `src/design-system/index.ts`
  - Avant : `export * from './tokens'`
  - Après : `export * from './tokens/index'`

- `src/design-system/theme/index.ts`
  - Avant : `from '../tokens'`
  - Après : `from '../tokens/index'`

## Pourquoi cette correction est préférable

- Elle supprime l’ambiguïté `tokens.ts` vs `tokens/index.ts`.
- Elle évite deux sources de vérité.
- Elle rend les exports explicites.
- Elle garde les imports publics stables via `src/design-system/index.ts`.
- Elle réduit le risque de régression runtime au prochain changement de thème.

## Ce qui n’a pas été fait

- Pas de réinstallation `npm install` : inutile, aucune dépendance n’a changé.
- Pas de suppression manuelle hors Git : les suppressions sont versionnées.
- Pas de refonte Phase 5 visible : cette correction débloque la Phase 5, elle ne constitue pas une refonte UX.

## Validation attendue

- `npm run typecheck`
- `npm run build`
- `npm run test`
- Dev server sans page blanche
- Aucun import direct vers les anciens fichiers racine

## Statut

Correction implémentée. La suite de la Phase 5 peut maintenant cibler les changements visibles d’UX sans dette structurelle dans les exports du design system.
