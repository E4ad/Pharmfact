# Accessibilité

Les fondations design ne doivent pas dégrader la phase 1 WCAG.

## Exigences

- Focus visible conservé sur boutons, icon buttons, toggle buttons et champs.
- Contraste texte normal ≥ 4.5:1.
- Contraste texte large ≥ 3:1.
- Les états ne reposent jamais uniquement sur la couleur.
- Les éléments désactivés peuvent utiliser une opacité réduite.

## À vérifier avant merge

- `npm run typecheck`
- `npm run test`
- Navigation clavier sur les pages principales.
- Lisibilité light/dark mode.
