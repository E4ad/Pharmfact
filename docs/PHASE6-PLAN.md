# Phase 6 — Accessibilité & Validation

Date : 14 juin 2026  
Statut : En cours  
Prérequis : Phase 5 complétée

## Contexte

La **Phase 5** a permis de rendre le Design System perceptible dans toute l'application en :
- ✅ Standardisant toutes les pages avec PageHeader, PageSection, SurfaceCard
- ✅ Migrant tous les composants vers les tokens du Design System
- ✅ Améliorant la hiérarchie visuelle et la cohérence UI

**Résultat :** L'application a maintenant une base UX solide et cohérente.

La **Phase 6** doit maintenant se concentrer sur deux axes complémentaires :
1. **Accessibilité** : Garantir que l'application est conforme aux standards WCAG 2.2 AA
2. **Validation** : S'assurer que les améliorations sont effectives et ne régressent pas

## Objectif Phase 6

**Rendre l'application accessible et valider les améliorations UX :**

- Accessibilité WCAG 2.2 Level AA pour tous les composants
- Validation utilisateur des améliorations de la Phase 5
- Correction des régressions potentielles
- Documentation complète du Design System

## Périmètre

### Lot 1 — Audit d'accessibilité

- [x] **Audit complet WCAG** de tous les composants et pages
- [ ] **Créer un rapport d'accessibilité** avec les problèmes identifiés
- [ ] **Prioriser** les corrections par impact utilisateur
- [ ] **Documenter** les solutions proposées

Composants à auditer :
- Tous les composants du Design System (PageHeader, PageSection, SurfaceCard, StatusChip, etc.)
- Toutes les pages migrées en Phase 5
- Tous les formulaires
- Tous les tableaux
- Toutes les modals/dialogs

### Lot 2 — Corrections d'accessibilité

- [ ] **Contraste des couleurs** : Vérifier que tous les textes ont un ratio ≥ 4.5:1
- [ ] **Navigation clavier** : Tous les éléments interactifs accessibles via clavier
- [ ] **Focus visible** : Tous les focus states sont visibles
- [ ] **Labels et ARIA** : Tous les composants ont les labels/aria-labels appropriés
- [ ] **Erreurs accessibles** : Toutes les erreurs sont communiquées de manière accessible
- [ ] **Alternatives textuelles** : Toutes les icônes ont des alternatives

### Lot 3 — Validation UX

- [ ] **Tests utilisateurs** sur les pages principales
- [ ] **Validation visuelle** de la cohérence du Design System
- [ ] **Validation fonctionnelle** des notifications, loading states, undo
- [ ] **Validation thème** : light/dark mode fonctionne partout
- [ ] **Validation responsive** : toutes les pages s'adaptent correctement

### Lot 4 — Documentation

- [ ] **Documenter le Design System** (tokens, composants, patterns)
- [ ] **Créer des guidelines** d'utilisation des composants
- [ ] **Documenter les patterns** de layout (PageHeader + PageSection + SurfaceCard)
- [ ] **Mettre à jour le README** avec les nouvelles conventions

## Critères d'acceptation

- [ ] **Accessibilité** : Conformité WCAG 2.2 Level AA validée
- [ ] **Cohérence** : Aucune régression visuelle ou fonctionnelle
- [ ] **Documentation** : Tous les composants du Design System sont documentés
- [ ] **Validation** : Tests utilisateurs positifs sur les améliorations Phase 5
- [ ] `npm run typecheck` : OK
- [ ] `npm run build` : OK
- [ ] `npm run test` : OK

## Hors périmètre

- Refonte complète de l'application
- Ajout de nouvelles fonctionnalités métier
- Migration vers un autre framework UI
- Changement de librairie de testing

## Risques

- **Régressions accessibilité** : Les corrections pourraient introduire de nouvelles régressions
- **Complexité WCAG** : Certaines corrections d'accessibilité peuvent être complexes
- **Validation subjective** : Les tests utilisateurs peuvent révéler des préférences subjectives

## Prochaine étape

**Lot 1 en cours** : Audit d'accessibilité complet de l'application
- Commencer par les composants du Design System (PageHeader, SurfaceCard, StatusChip, ConfirmDialog, ActionCard, OptionActionCard, MetricCard, EmptyState, MoneyValue)

---

*Document créé par Mistral Vibe*
*Version: 1.0 - 2026-06-14*
