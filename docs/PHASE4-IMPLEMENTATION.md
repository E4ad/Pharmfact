# Phase 4 — UX Polish et Recovery

Date : 14 juin 2026

## Objectif

Implémenter une couche UX fiable pour les opérations longues, les confirmations d’action et les erreurs récupérables, sans introduire de dépendance externe ni fragiliser le thème Phase 3.

## Décisions d’architecture

- Les notifications sont centralisées dans `src/components/NotificationSystem.tsx`.
- Une seule notification est affichée à la fois, les suivantes sont mises en file.
- Les erreurs persistent jusqu’à fermeture manuelle.
- Les succès se ferment automatiquement après un délai raisonnable.
- Les actions destructives ou à impact métier utilisent un undo explicite quand c’est sûr.
- Les animations restent non bloquantes et respectent `prefers-reduced-motion`.
- Les boutons ne changent pas de dimensions ni de position au hover/active.

## Implémentation

### Notifications globales

Fichiers :

- `src/components/NotificationSystem.tsx`
- `src/app/App.tsx`

Fonctions :

- `NotificationProvider`
- `useNotifications()`
- `notify({ severity, message, action, onUndo, persist })`

Comportement :

- `role="alert"` pour les erreurs.
- `role="status"` et `aria-live="polite"` pour les succès/informations.
- Placement bottom-right.
- Bouton de fermeture clavier-accessible.

### Undo / Recovery

Fichiers :

- `src/services/undoManager.ts`
- `src/services/undoManager.test.ts`

Pages migrées :

- `src/features/missions/MissionsPage.tsx`
- `src/features/invoices/InvoicesPage.tsx`

Actions avec undo :

- Changement de statut de mission.
- Génération de facture depuis une mission.
- Changement de statut de facture.

Principe :

- L’état précédent est capturé avant mutation.
- L’undo restaure l’objet métier précédent ou supprime la facture générée.
- La pile est limitée à 10 actions.

### Loading states

Fichiers :

- `src/components/LoadingButton.tsx`
- `src/components/SkeletonTable.tsx`

Utilisation actuelle :

- Génération/téléchargement PDF dans les missions.
- Génération/téléchargement PDF dans les factures.

Règles :

- `aria-busy` sur les boutons en chargement.
- Bouton désactivé pendant l’opération pour éviter les doubles clics.
- Skeleton utilitaire prêt pour les futures vues async de tableaux.

### Micro-interactions

Fichiers :

- `src/components/FadeIn.tsx`
- `src/styles/globals.css`
- `src/app/theme.ts`

Comportement :

- Fade-in court sur les surfaces principales.
- Désactivation effective des animations/transitions en `prefers-reduced-motion`.
- Suppression des translations de bouton au hover/active pour respecter la stabilité de layout.

### Pages migrées

- `src/features/missions/MissionsPage.tsx`
- `src/features/invoices/InvoicesPage.tsx`
- `src/features/financial/FinancialPage.tsx`
- `src/features/options/OptionsPage.tsx`

Les anciens `Snackbar` locaux sont supprimés de ces pages. Le seul `Snackbar` applicatif restant est celui du système global.

## Vérification selon pratiques industrie

Checklist appliquée :

- TypeScript strict : `npm run typecheck` — OK.
- Tests unitaires : `npm run test` — OK, 22 fichiers / 136 tests.
- Build production : `npm run build` — OK.
- Vérification d’absence de toasts locaux sur les pages migrées : `rg "setToast|Snackbar" src/features src/components` — OK, seul `NotificationSystem` conserve `Snackbar`.
- ESLint ciblé sur les nouveaux fichiers Phase 4 : aucune erreur, mais la configuration actuelle ignore ces fichiers avec `File ignored because no matching configuration was supplied`.
- ESLint global : non conforme avant cette phase. La commande `npm run lint` échoue sur la configuration existante (`server/*.js` hors `parserOptions.project`, règles React JSX legacy, globals DOM non déclarés, nombreuses dettes préexistantes). Ce point est documenté comme dette d’outillage, pas comme régression Phase 4.
- Accessibilité notification :
  - erreurs persistantes,
  - annonces ARIA différenciées,
  - fermeture clavier,
  - action undo accessible.
- Motion :
  - animations courtes,
  - non bloquantes,
  - pas de layout shift volontaire,
  - `prefers-reduced-motion` respecté.

## Limites assumées

- Pas de Storybook ajouté dans cette phase pour éviter de modifier l’outillage.
- Le skeleton table est livré comme primitive, mais les pages actuelles sont majoritairement alimentées par état local synchrone.
- Les suppressions permanentes restent protégées par confirmation existante plutôt que converties en undo.

## Résultat attendu

- Moins de duplication UI.
- Retours utilisateur plus cohérents.
- Actions critiques récupérables.
- Chargements PDF plus explicites.
- Base prête pour Phase 5 sans dette de notification locale.
