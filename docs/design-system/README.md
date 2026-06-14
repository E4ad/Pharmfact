# Pharmfact Design System

Version initiale des fondations UI de Pharmfact.

## Objectifs

- Centraliser les décisions visuelles dans `src/design-system`.
- Garder une intégration MUI simple, typée et compatible avec le thème existant.
- Préserver les acquis WCAG 2.2 AA de la phase 1.

## Tokens disponibles

- `colors.ts` : marque, sémantique, neutres, light/dark.
- `typography.ts` : échelle modulaire 1.25, familles, poids, line-height.
- `spacing.ts` : échelle 4px et espacements par contexte.
- `borderRadius.ts` : rayons par rôle de composant.
- `shadows.ts` : élévation light/dark.
- `zIndex.ts` : couches applicatives.
- `animation.ts` : durées, easings et transitions.

## Utilisation

```ts
import { brandColors, spacingScale, typographyTokens } from '../design-system';
```

Le thème global consomme ces tokens dans `src/app/theme.ts`. Éviter les valeurs visuelles arbitraires dans les nouveaux composants.

## Règles

- Une couleur sémantique garde toujours le même sens.
- Boutons, inputs, chips et cards dérivent des mêmes rayons et transitions.
- Le focus visible reste obligatoire sur tout élément interactif.
- Les tokens peuvent évoluer, mais pas être contournés par des hardcodes dispersés.
