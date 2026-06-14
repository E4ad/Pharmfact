# Analyse des Erreurs Phase 3 — Transition `theme.new.ts`

> Date : 2026-06-14  
> Statut : Corrigé  
> Contexte : page blanche localhost après introduction du thème Phase 3

## Résumé

La page blanche ne venait pas d’un problème React isolé. Elle venait d’une transition incomplète vers `src/app/theme.new.ts` :

- deux architectures de tokens coexistaient ;
- `src/app/theme.new.ts` était inclus dans le build sans être la source de vérité ;
- `src/design-system/theme/tokens.ts` utilisait des noms de tokens qui ne correspondaient pas aux tokens stables ;
- la factory `src/design-system/theme/index.ts` produisait des options MUI invalides ;
- des contournements `Suspense` / `try-catch` autour de hooks React avaient été ajoutés alors qu’ils ne corrigeaient pas la cause.

## Erreurs Observées

### 1. `borderRadiusScale is not defined`

Cause directe :

```ts
const borderRadius = borderRadiusScale;
```

dans `src/design-system/theme/tokens.ts`, alors que `borderRadiusScale` n’était pas importé ou n’était pas exporté par le chemin réellement utilisé.

Correction retenue :

- suppression de `src/design-system/theme/tokens.ts` ;
- réécriture de `src/design-system/theme/index.ts` pour consommer directement les tokens racine stables.

### 2. Exports et tokens concurrents

Le repo contenait en parallèle :

- `src/design-system/colors.ts`
- `src/design-system/tokens/colors.ts`
- `src/design-system/tokens.ts`
- `src/design-system/tokens/index.ts`

Cela introduisait des incohérences entre anciennes et nouvelles formes de tokens.

Correction retenue :

- `src/design-system/tokens.ts` ré-exporte les tokens racine stables ;
- `src/design-system/theme/index.ts` utilise `../tokens` comme façade stable ;
- `src/app/theme.ts` reste le point d’entrée applicatif.

### 3. Options MUI invalides

Problèmes détectés :

- `shadows` n’avait pas les 25 entrées attendues par MUI ;
- `spacing` était fourni comme objet au lieu d’une option MUI valide ;
- `transitions.duration` utilisait des strings (`"150ms"`) alors que MUI attend des nombres ;
- certains z-index attendus (`snackbar`, `dialog`) ne correspondaient pas aux tokens disponibles.

Correction retenue :

- génération d’un tableau `shadows` de 25 entrées ;
- suppression de l’objet `spacing` invalide dans la factory ;
- conversion des durées avec `Number.parseInt(...)` ;
- mapping z-index vers les clés MUI (`modal`, `snackbar`, `tooltip`, etc.).

### 4. Contournements React incorrects

Des changements avaient ajouté :

- `Suspense` autour de l’app ;
- `try/catch` autour de `useAppState()`;
- préchargement de `localStore` dans `main.tsx`.

Ces changements masquaient le symptôme mais ne corrigeaient pas la cause. En plus, appeler un hook dans un `try/catch` conditionnel est une mauvaise direction pour React.

Correction retenue :

- retrait de ces contournements ;
- retour à l’initialisation normale ;
- correction du thème et des exports à la racine.

## Correction Appliquée

| Fichier | Action |
| --- | --- |
| `src/app/theme.ts` | Devient le thème Phase 3 applicatif ; expose aussi les factories design-system |
| `src/app/theme.new.ts` | Supprimé pour éviter deux sources de vérité |
| `src/design-system/theme/index.ts` | Réécrit en factory MUI valide |
| `src/design-system/theme/tokens.ts` | Supprimé |
| `src/design-system/tokens.ts` | Restauré comme façade stable vers les tokens racine |
| `src/app/App.tsx` | Suppression du contournement Suspense/storage |
| `src/main.tsx` | Suppression du préchargement storage inutile |

## Validation

Commandes exécutées :

```bash
npm run typecheck
npm run test
npm run build
```

Résultat :

- TypeScript : ✅
- Vitest : ✅
- Build Vite : ✅
- Localhost `5173` : ✅ `/`, `src/main.tsx`, `src/app/theme.ts`, `src/design-system/theme/index.ts` répondent `200 OK`.

## Décision Finale

La bonne correction n’était pas d’ajouter un import manquant uniquement. Le problème était structurel : la Phase 3 introduisait un deuxième design system partiel.

Décision :

- `src/app/theme.ts` est la seule source de vérité applicative.
- `src/design-system/theme/index.ts` est une factory optionnelle utilisable par tests/outillage.
- Les tokens racine restent l’API stable.
- Aucun fichier `theme.new.ts` ne reste dans `src`.

## À Surveiller

- Ne pas réintroduire de fichiers TypeScript brouillons dans `src`, car `tsconfig.app.json` inclut tout `src`.
- Si un nouveau thème expérimental est nécessaire, le placer hors `src` ou l’exclure explicitement.
- Toute extension MUI non standard doit passer par une augmentation de types avant usage.
