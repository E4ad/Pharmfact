# Phase 3 — Exécution Réelle

> Date : 2026-06-14  
> Statut : Exécuté  
> Sujet : transition vers `theme.new.ts`

## Étapes Exécutées

### 1. Audit

Fichiers étudiés :

- `src/app/theme.new.ts`
- `src/app/theme.ts`
- `src/design-system/theme/index.ts`
- `src/design-system/theme/tokens.ts`
- `src/design-system/tokens.ts`
- `src/app/App.tsx`
- `src/main.tsx`

Constat :

- `theme.new.ts` contenait des ajouts utiles, mais ne pouvait pas rester comme fichier parallèle.
- `theme/tokens.ts` était la source principale des erreurs.
- `theme/index.ts` était trop couplé à `theme/tokens.ts`.

### 2. Correction Design System

Actions :

- réécriture de `src/design-system/theme/index.ts` ;
- suppression de `src/design-system/theme/tokens.ts` ;
- restauration de `src/design-system/tokens.ts` comme façade vers les tokens racine.

Résultat :

- factory MUI valide ;
- shadows MUI au bon format ;
- durations MUI numériques ;
- z-index mappés correctement.

### 3. Transition `theme.new.ts`

Actions :

- intégration des exports utiles de `theme.new.ts` dans `src/app/theme.ts` ;
- suppression de `src/app/theme.new.ts`.

Résultat :

- un seul thème applicatif ;
- compatibilité avec les imports existants ;
- factories Phase 3 disponibles.

### 4. Nettoyage React/Storage

Actions :

- suppression du `Suspense` ajouté autour de l’app ;
- suppression du `try/catch` autour de `useAppState()`;
- suppression du préchargement `localStore` dans `main.tsx`.

Raison :

- ces changements ne corrigeaient pas le thème ;
- ils risquaient de masquer de vraies erreurs ;
- ils n’étaient pas nécessaires une fois la factory corrigée.

## Validation

```bash
npm run typecheck
npm run test
npm run build
```

Résultat :

- TypeScript : ✅
- Tests : ✅
- Build : ✅

Validation locale :

- `http://127.0.0.1:5173/` : ✅ `200 OK`
- `http://127.0.0.1:5173/src/main.tsx` : ✅ `200 OK`
- `http://127.0.0.1:5173/src/app/theme.ts` : ✅ `200 OK`
- `http://127.0.0.1:5173/src/design-system/theme/index.ts` : ✅ `200 OK`

## Résultat

La transition vers `theme.new.ts` est terminée dans le sens correct : son contenu utile a été absorbé par `theme.ts`, et le fichier parallèle a été supprimé.

## Reste à Faire

- Faire une revue visuelle manuelle light/dark.
- Commiter les changements.
- Décider si les docs `PHASE3-IMPLEMENTATION.md` doivent rester détaillées ou être réduites.
