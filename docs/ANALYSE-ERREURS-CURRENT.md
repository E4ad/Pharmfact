# Analyse des erreurs — État après correction

Date : 14 juin 2026  
Statut : corrigé

## Erreur analysée

Erreur rapportée :

```text
Uncaught ReferenceError: borderRadiusScale is not defined
```

## Analyse critique

La cause documentée dans le plan initial était partiellement correcte :

- Oui, il existait deux jeux de tokens.
- Oui, `tokens.ts` et `tokens/index.ts` créaient une ambiguïté.
- Non, il ne fallait pas considérer que la Phase 3 devait rester “réorganisée” avec deux arbres actifs.

La correction durable consiste à conserver uniquement le dossier `tokens/` comme source de vérité.

## État actuel attendu

Structure cible :

```text
src/design-system/
├── index.ts
├── theme/
│   └── index.ts
├── tokens/
│   ├── animation.ts
│   ├── borderRadius.ts
│   ├── colors.ts
│   ├── index.ts
│   ├── shadows.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── zIndex.ts
└── tokens.test.ts
```

Imports explicites :

- `src/design-system/index.ts` exporte depuis `./tokens/index`.
- `src/design-system/theme/index.ts` importe depuis `../tokens/index`.

## Critères de validation

- Typecheck sans erreur.
- Build sans erreur.
- Tests sans erreur.
- Dev server charge `/` sans page blanche.
- Aucun fichier `src/design-system/{animation,borderRadius,colors,shadows,spacing,typography,zIndex}.ts`.
- Aucun fichier `src/design-system/tokens.ts`.

## Remarque

Cette correction est technique. Elle ne change pas l’apparence de l’interface. Le changement UX visible doit être traité dans la vraie Phase 5 : layouts, densité, surfaces, hiérarchie et navigation.
