# Phase 3 — Implémentation

> Date : 2026-06-14  
> Statut : Implémenté et validé  
> Portée : transition thème Phase 3

## Résumé

La Phase 3 a finalisé l’intégration du thème prévu dans `src/app/theme.new.ts`.

La stratégie retenue n’est pas de garder `theme.new.ts`, mais de faire de `src/app/theme.ts` la source de vérité unique.

## Fichiers Modifiés

| Fichier | Changement |
| --- | --- |
| `src/app/theme.ts` | Ajout des exports/factories Phase 3 |
| `src/app/theme.new.ts` | Supprimé |
| `src/design-system/theme/index.ts` | Réécrit en factory MUI valide |
| `src/design-system/theme/tokens.ts` | Supprimé |
| `src/design-system/tokens.ts` | Rebranché sur les tokens racine |
| `src/app/App.tsx` | Nettoyage import inutilisé |
| `src/main.tsx` | Nettoyage du préchargement storage inutile |

## API Disponible

Depuis `src/app/theme.ts` :

```ts
getTheme(mode)
getSystemMode()
createThemeFromDesignSystem(mode)
getEnhancedTheme(mode)
createDesignSystemTheme(mode, overrides)
createDSLightTheme(overrides)
createDSDarkTheme(overrides)
mergeThemes(base, ...overrides)
```

Depuis `src/design-system/theme/index.ts` :

```ts
createDesignSystemTheme(mode, overrides)
createLightTheme(overrides)
createDarkTheme(overrides)
mergeThemes(base, ...overrides)
```

## Implémentation Technique

### Factory MUI

`src/design-system/theme/index.ts` construit un `ThemeOptions` valide :

- palette light/dark ;
- typographie basée sur `typographyTokens` ;
- shape basée sur `componentBorderRadius.container` ;
- tableau `shadows` compatible MUI avec 25 entrées ;
- z-index mappés vers les clés MUI ;
- transitions avec durées numériques.

### Thème Applicatif

`src/app/theme.ts` conserve :

- `lightTheme` ;
- `darkTheme` ;
- `getTheme(mode)` ;
- `theme` par défaut.

Il expose en plus les helpers Phase 3 pour usage futur.

### Suppressions

Supprimés volontairement :

- `src/app/theme.new.ts` : source parallèle dangereuse ;
- `src/design-system/theme/tokens.ts` : duplications et incompatibilités ;
- contournements `Suspense` / storage ajoutés pour masquer la page blanche.

## Validation

Commandes exécutées :

```bash
npm run typecheck
npm run test
npm run build
```

Résultat :

- ✅ TypeScript
- ✅ Tests unitaires
- ✅ Build Vite
- ✅ Localhost sans page blanche

## Risques Résiduels

- Une revue visuelle light/dark reste nécessaire.
- Les anciens docs générés automatiquement peuvent encore mentionner une structure `tokens/` qui n’est plus la cible.
- Les composants métier ne sont pas encore migrés individuellement vers les nouvelles factories.

## Conclusion

La Phase 3 est terminée pour la transition thème. Le repo n’a plus deux thèmes concurrents dans `src`, et la factory design-system est typée et compatible MUI.
