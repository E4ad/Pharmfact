# Pharmfact v1.0.0-pre

## Statut

Pré-release macOS pour validation fonctionnelle avant distribution stable.

## Artefact

- macOS Apple Silicon: `Pharmfact_1.0.0_aarch64.dmg`
- Emplacement local apres build: `src-tauri/target/release/bundle/macos/Pharmfact_1.0.0_aarch64.dmg`

## Installation

1. Télécharger le fichier `.dmg`.
2. Ouvrir le fichier.
3. Glisser `Pharmfact.app` dans `Applications`.
4. Lancer l'application depuis `Applications`.

Si macOS bloque l'ouverture car l'application n'est pas notarisee, utiliser clic droit sur `Pharmfact.app`, puis `Ouvrir`.

En cas de blocage silencieux apres telechargement, ouvrir Terminal et executer:

```bash
xattr -dr com.apple.quarantine /Applications/Pharmfact.app
open /Applications/Pharmfact.app
```

## Changements principaux

- Generation PDF locale pour les factures, sans serveur externe obligatoire.
- Export calendrier `.ics` avec un evenement par jour pour les missions multi-jours.
- Pilotage des missions compacte avec actions PDF et calendrier.
- Modal mission reorganisee: resume, lieu, pharmacie, horaires, financier, actions et historique.
- Autocompletion d'adresse Quebec avec calcul et cache de distance aller-retour.
- Packaging macOS corrige avec generation `.app` puis `.dmg`.

## Validation effectuee

- `npm run typecheck`
- `npm run tauri:build`
- Generation confirmee de `Pharmfact.app`
- Generation confirmee de `Pharmfact_1.0.0_aarch64.dmg`

## Limites connues

- Build actuel cible Apple Silicon (`aarch64`).
- Application signee ad-hoc, mais non signee Developer ID et non notarisee pour le moment.
- Le `.dmg` utilise un packaging simple: application plus lien `Applications`.
- Les services d'adresse et de distance peuvent dependre de la disponibilite des fournisseurs publics configures.

## Commandes utiles

```bash
npm run tauri:build
```

Pour regenerer seulement le `.dmg` depuis une application deja compilee:

```bash
npm run package:dmg
```
