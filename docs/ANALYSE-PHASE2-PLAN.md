# Analyse & Implémentation Phase 2 — Fondations Design System

> Date : 2026-06-14  
> Statut : Implémenté  
> Commit d’implémentation : `b3ffd135` — `Ajoute fondations design system`

## Résumé

La Phase 2 a été implémentée sous forme de fondations design system pragmatiques :

- Tokens TypeScript centralisés dans `src/design-system`.
- Intégration directe dans le thème MUI existant.
- Documentation exploitable dans `docs/design-system`.
- Tests de non-régression pour les tokens et le thème.

Les parties Storybook/Figma du plan initial n’ont pas été ajoutées volontairement : elles nécessitent un chantier outillage séparé et ne sont pas nécessaires pour stabiliser les fondations applicatives.

## Décision Critique

Le plan initial proposait une intégration MUI trop large avec des extensions de palette non typées (`tertiary`, `border`, `elevated`) et une structure `shadows` incompatible avec MUI.

Implémentation retenue :

- Garder les tokens indépendants de MUI.
- Consommer les tokens dans `src/app/theme.ts`.
- Ne pas ajouter de module augmentation tant qu’un besoin applicatif concret ne l’exige pas.
- Préserver le rendu light/dark existant et les corrections WCAG de la Phase 1.

## Livrables

### Design Tokens

| Domaine | Fichier | Statut |
| --- | --- | --- |
| Couleurs | `src/design-system/colors.ts` | ✅ |
| Typographie | `src/design-system/typography.ts` | ✅ |
| Espacements | `src/design-system/spacing.ts` | ✅ |
| Border radius | `src/design-system/borderRadius.ts` | ✅ |
| Ombres | `src/design-system/shadows.ts` | ✅ |
| Z-index | `src/design-system/zIndex.ts` | ✅ |
| Animations | `src/design-system/animation.ts` | ✅ |
| Export central | `src/design-system/index.ts` | ✅ |

### Intégration MUI

| Élément | Fichier | Statut |
| --- | --- | --- |
| Palette light/dark depuis tokens | `src/app/theme.ts` | ✅ |
| Typographie modulaire | `src/app/theme.ts` | ✅ |
| Radius de composants | `src/app/theme.ts` | ✅ |
| États boutons hover/active/focus/disabled | `src/app/theme.ts` | ✅ |
| Cards/dialogs/menus/tooltips/chips | `src/app/theme.ts` | ✅ |

### Documentation

| Document | Statut |
| --- | --- |
| `docs/design-system/README.md` | ✅ |
| `docs/design-system/colors.md` | ✅ |
| `docs/design-system/typography.md` | ✅ |
| `docs/design-system/spacing.md` | ✅ |
| `docs/design-system/components.md` | ✅ |
| `docs/design-system/accessibility.md` | ✅ |

### Tests

| Test | Couverture |
| --- | --- |
| `src/design-system/tokens.test.ts` | Couleur marque, base typo, spacing, radius, couleurs stables |
| `src/app/theme.test.ts` | Palette thème, dark mode, radius global |

## Structure Implémentée

```text
src/
├── app/
│   ├── theme.ts
│   └── theme.test.ts
└── design-system/
    ├── animation.ts
    ├── borderRadius.ts
    ├── colors.ts
    ├── index.ts
    ├── shadows.ts
    ├── spacing.ts
    ├── tokens.test.ts
    ├── tokens.ts
    ├── typography.ts
    └── zIndex.ts

docs/
└── design-system/
    ├── README.md
    ├── accessibility.md
    ├── colors.md
    ├── components.md
    ├── spacing.md
    └── typography.md
```

## Tokens Principaux

### Couleur Marque

Le bleu Pharmfact reste stable :

```ts
brandColors.primary[600] // #2563eb
```

### Typographie

Échelle modulaire 1.25 :

```ts
typographyScale.base // 16
typographyScale.lg   // 20
typographyScale.xl   // 25
typographyScale['2xl'] // 31
```

### Spacing

Base 4px :

```ts
spacingScalePx['2xs'] // 4
spacingScalePx.md     // 16
spacingScalePx['3xl'] // 48
```

### Radius

```ts
componentBorderRadius.input  // 6
componentBorderRadius.button.default // 12
componentBorderRadius.card   // 18
componentBorderRadius.chip   // 9999
```

## Ce Qui A Été Écarté

### Storybook

Non implémenté dans cette phase.

Raison :

- Ajoute une configuration outillage distincte.
- Aucun besoin bloquant pour livrer les tokens.
- Peut être ajouté ensuite avec des stories basées sur les tokens existants.

### Figma

Non implémenté dans le dépôt.

Raison :

- Figma n’est pas une dépendance code.
- Les tokens TypeScript peuvent être exportés plus tard vers JSON si l’équipe en a besoin.

### Palette MUI Étendue

Non implémentée.

Raison :

- Les clés non standard exigeraient une augmentation de types MUI.
- Le gain immédiat ne justifie pas la complexité.
- Les tokens restent importables directement quand un composant a besoin d’une valeur hors palette MUI.

## Validation

Commandes exécutées :

```bash
npm run typecheck
npm run test
```

Résultat :

- TypeScript : ✅
- Vitest : ✅ 21 fichiers, 134 tests passés

## Checklist Finale Phase 2

### Design Tokens

- [x] `src/design-system/tokens.ts` créé.
- [x] `colors.ts` avec marque, neutres, sémantique, light/dark.
- [x] `typography.ts` avec échelle modulaire.
- [x] `spacing.ts` avec base 4px.
- [x] `borderRadius.ts` avec échelle cohérente.
- [x] `shadows.ts` avec light/dark.
- [x] `zIndex.ts` avec couches applicatives.
- [x] `animation.ts` avec durées/easings/transitions.

### Intégration

- [x] Thème light mode branché sur tokens.
- [x] Thème dark mode conservé et aligné sur tokens stables.
- [x] Focus visible préservé.
- [x] Composants MUI principaux alignés.
- [x] Aucun ajout de dépendance.

### Documentation

- [x] Vue d’ensemble.
- [x] Couleurs.
- [x] Typographie.
- [x] Espacements.
- [x] Composants.
- [x] Accessibilité.

### Tests

- [x] Tests tokens.
- [x] Tests thème.
- [x] Typecheck.
- [x] Suite Vitest.

## Prochaines Étapes Recommandées

1. Remplacer progressivement les valeurs visuelles ad hoc dans les composants par les tokens.
2. Ajouter un export JSON des tokens si Storybook/Figma devient prioritaire.
3. Auditer `ConfirmDialog`, `StatusChip` et les formulaires dans une phase “composants standardisés”.
4. Ajouter des captures visuelles ou tests E2E si l’équipe veut verrouiller les régressions UI.

## Conclusion

La Phase 2 est terminée côté fondations. Le design system est maintenant assez stable pour servir de base aux phases suivantes sans bloquer l’application sur un chantier outillage prématuré.
