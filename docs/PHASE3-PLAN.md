# Phase 3 — Plan Corrigé

> Date : 2026-06-14  
> Statut : Implémenté côté transition thème  
> Objectif : finaliser la transition vers le thème Phase 3 sans page blanche

## Objectif Phase 3

La Phase 3 consiste à rendre exploitable le nouveau thème prévu dans `src/app/theme.new.ts`, sans conserver deux systèmes concurrents.

## Décisions

1. `src/app/theme.ts` reste le point d’entrée public utilisé par l’application.
2. Le contenu utile de `theme.new.ts` est intégré dans `theme.ts`.
3. `theme.new.ts` est supprimé après intégration.
4. `src/design-system/theme/index.ts` fournit une factory MUI valide basée sur les tokens.
5. `src/design-system/theme/tokens.ts` est supprimé : il dupliquait des tokens et cassait les types.
6. Les contournements React/storage ajoutés pour masquer la page blanche sont retirés.

## Scope Implémenté

| Tâche | Statut |
| --- | --- |
| Étudier `theme.new.ts` | ✅ |
| Identifier les incompatibilités MUI | ✅ |
| Corriger les exports design-system | ✅ |
| Réécrire la factory `design-system/theme` | ✅ |
| Basculer les helpers Phase 3 dans `theme.ts` | ✅ |
| Supprimer `theme.new.ts` | ✅ |
| Supprimer `theme/tokens.ts` | ✅ |
| Retirer les contournements `Suspense` / storage | ✅ |
| Valider typecheck/tests/build | ✅ |

## Hors Scope

Ces sujets restent pour une phase suivante :

- refonte visuelle complète des composants ;
- Storybook ;
- export Figma/JSON ;
- thème compact ou haute visibilité ;
- refactor Rust `main.rs`.

## Architecture Cible

```text
src/
├── app/
│   └── theme.ts
└── design-system/
    ├── animation.ts
    ├── borderRadius.ts
    ├── colors.ts
    ├── index.ts
    ├── shadows.ts
    ├── spacing.ts
    ├── theme/
    │   └── index.ts
    ├── tokens.ts
    ├── typography.ts
    └── zIndex.ts
```

## API Thème

`src/app/theme.ts` expose :

```ts
getTheme(mode)
getSystemMode()
lightTheme
darkTheme
theme
createThemeFromDesignSystem(mode)
getEnhancedTheme(mode)
createDesignSystemTheme(mode, overrides)
createDSLightTheme(overrides)
createDSDarkTheme(overrides)
mergeThemes(base, ...overrides)
```

## Critères de Succès

- `npm run typecheck` passe.
- `npm run test` passe.
- `npm run build` passe.
- Localhost charge sans page blanche.
- Aucun `theme.new.ts` ne reste dans `src`.
- Aucun token MUI incompatible ne reste dans `src/design-system/theme`.

## Commandes de Validation

```bash
npm run typecheck
npm run test
npm run build
npm run dev
```
