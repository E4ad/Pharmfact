# Phase 5 — Plan révisé après correction critique

Date : 14 juin 2026  
Statut : Lot 4 implémenté  
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

- ✅ Créer ou standardiser un `PageHeader`.
- ✅ Créer ou standardiser un `PageSection`.
- ✅ Créer ou standardiser une surface de carte réutilisable.
- ✅ Appliquer ces patterns à `MissionsPage`, `InvoicesPage`, `FinancialPage` et `OptionsPage`.

Composants livrés :

- `src/components/PageHeader.tsx`
- `src/components/PageSection.tsx`
- `src/components/SurfaceCard.tsx`

Pages migrées :

- `src/features/missions/MissionsPage.tsx`
- `src/features/invoices/InvoicesPage.tsx`
- `src/features/financial/FinancialPage.tsx`
- `src/features/options/OptionsPage.tsx`

### Lot 2 — Composants existants

- ✅ Standardiser `StatusChip`.
- ✅ Standardiser `ConfirmDialog`.
- ✅ Standardiser `MetricCard`, `ActionCard`, `OptionActionCard` et `EmptyState`.
- ✅ Supprimer les styles ad hoc lorsque le thème couvre déjà le besoin.

Composants migrés :

- `src/components/StatusChip.tsx`
- `src/components/ConfirmDialog.tsx`
- `src/components/MetricCard.tsx`
- `src/components/ActionCard.tsx`
- `src/components/OptionActionCard.tsx`
- `src/components/EmptyState.tsx`

### Lot 3 — Composants financiers

- ✅ Standardiser `MoneyValue`.
- ✅ Standardiser `FinancialActionCard` — suppression des hex fixes, tons dérivés du thème.
- ✅ Standardiser `FinancialMetricCard` — suppression des hex fixes, tons dérivés du thème.
- ✅ Standardiser `FinancialPeriodCard` — migration vers SurfaceCard.

Composants migrés :

- `src/components/MoneyValue.tsx`
- `src/features/financial/components/FinancialActionCard.tsx`
- `src/features/financial/components/FinancialMetricCard.tsx`
- `src/features/financial/components/FinancialPeriodCard.tsx`

### Lot 4 — Écrans non migrés

- ✅ `ActivityPage` — PageHeader ajouté, HomeActionCard migré vers SurfaceCard.
- ✅ `MissionFormPage` — PageHeader ajouté, en-tête manuel remplacé.
- ✅ `OnboardingPage` — Toutes les Card migrées vers SurfaceCard.
- ✅ `PharmacienNewPage` — PageHeader ajouté, Card migrée vers SurfaceCard.
- ✅ `PharmacienFormModal` — Modal Dialog, pas de Card à migrer.
- ✅ `PharmacieAddPage` — PageHeader ajouté, Card migrée vers SurfaceCard.
- ✅ `PharmacieFormModal` — Modal Dialog, pas de Card à migrer.
- ✅ `SettingsPage` — PageHeader ajouté, toutes les Card migrées vers SurfaceCard, PageSection ajouté.

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

Passer au Lot 4 : migrer les écrans non couverts (`ActivityPage`, `MissionFormPage`, `OnboardingPage`, formulaires pharmaciens/pharmacies et `SettingsPage`) vers les patterns de layout et composants standardisés.
