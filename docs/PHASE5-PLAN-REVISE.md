# Phase 5 — Plan révisé après correction critique

Date : 14 juin 2026  
Statut : prêt à planifier  
Prérequis : correction Design System appliquée

## Décision critique

La Phase 5 ne doit pas continuer à ajouter de l’architecture invisible. Les Phases 2 à 4 ont surtout amélioré la base technique : tokens, thème, notifications, loading states, recovery. L’impact perçu reste limité si les écrans conservent les mêmes surfaces, densités, espacements et hiérarchies.

La Phase 5 doit donc viser une amélioration UX visible.

## État de départ validé

- Le dossier `src/design-system/tokens/` est l’unique source de vérité.
- Les fichiers racine dupliqués dans `src/design-system/*.ts` ont été supprimés.
- Les imports ambigus utilisent maintenant `./tokens/index` ou `../tokens/index`.
- `npm run typecheck`, `npm run build` et `npm run test` passent.
- Le serveur Vite répond sur `/`.

## Objectif Phase 5

Rendre le design system perceptible dans l’application :

- Hiérarchie visuelle plus nette.
- Espacement et densité cohérents.
- Surfaces de cartes plus lisibles.
- Actions primaires et secondaires mieux différenciées.
- Formulaires et tableaux plus faciles à scanner.

## Périmètre recommandé

### Lot 1 — Fondations visibles

- Créer ou standardiser un `PageHeader`.
- Créer ou standardiser un `PageSection`.
- Créer ou standardiser une surface de carte réutilisable.
- Appliquer ces patterns à `MissionsPage`, `InvoicesPage`, `FinancialPage` et `OptionsPage`.

### Lot 2 — Composants existants

- Standardiser `StatusChip`.
- Standardiser `ConfirmDialog`.
- Standardiser `MetricCard`, `ActionCard`, `OptionActionCard` et `EmptyState`.
- Supprimer les styles ad hoc lorsque le thème couvre déjà le besoin.

### Lot 3 — Écrans non migrés

- `ActivityPage`
- `MissionFormPage`
- `OnboardingPage`
- `PharmacienNewPage`
- `PharmacienFormModal`
- `PharmacieAddPage`
- `PharmacieFormModal`
- `SettingsPage`

## Critères d’acceptation

- Les quatre pages principales ne doivent plus avoir exactement la même perception visuelle qu’avant.
- Les titres, sections, cartes et actions doivent suivre une hiérarchie commune.
- Les styles inline de layout doivent diminuer, pas augmenter.
- Les composants réutilisables doivent consommer le thème ou les tokens, pas des valeurs arbitraires.
- Le mode clair et le mode sombre restent fonctionnels.
- L’accessibilité Phase 1 ne régresse pas.
- `npm run typecheck`, `npm run build` et `npm run test` passent.

## Hors périmètre

- Refonte complète de navigation.
- Storybook complet.
- Figma.
- Changement de librairie UI.
- Nouvelle palette de marque.

## Risques

- Changer uniquement les tokens ne suffit pas : l’UX peut rester visuellement identique.
- Trop standardiser en une seule passe peut créer de grosses regressions.
- Les pages financières ont beaucoup de composants spécialisés ; elles doivent être migrées par petits lots.

## Prochaine étape recommandée

Commencer par le lot 1 sur les quatre pages principales. C’est le chemin le plus court pour rendre les Phases 2 à 4 visibles à l’utilisateur.
