# Composants

## Famille visuelle

Les composants interactifs partagent les mêmes décisions :

- Boutons : `componentBorderRadius.button.default`, focus visible, hover/active.
- Inputs : `componentBorderRadius.input`, bordure tokenisée, focus primaire.
- Chips/badges : `componentBorderRadius.full`.
- Cards/dialogs : rayon large, bordure fine et shadow d’élévation.

## États interactifs

Tout nouveau composant interactif doit couvrir :

- Rest
- Hover
- Active/pressed
- Focus visible
- Disabled
- Loading si action asynchrone

## Élévation

- Card : `componentShadows.card`
- Menu/dropdown : `componentShadows.dropdown`
- Dialog/modal : `componentShadows.modal`
- Tooltip : `componentShadows.tooltip`
