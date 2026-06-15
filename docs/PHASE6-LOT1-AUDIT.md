# Phase 6 — Lot 1 : Audit d'Accessibilité WCAG 2.2 Level AA

**Date de début** : 14 juin 2026  
**Statut** : En cours  
**Responsable** : Mistral Vibe  
**Priorité** : Haute

---

## 🎯 Objectif

Réaliser un **audit complet d'accessibilité** conformément aux critères **WCAG 2.2 Level AA** sur l'ensemble de l'application Pharmfact, afin d'identifier, documenter et prioriser les problèmes à corriger.

---

## 📋 Périmètre de l'audit

### 1. Composants du Design System (Priorité 1)

| Composant | Fichier | Statut | Problèmes identifiés |
|-----------|--------|--------|---------------------|
| PageHeader | `src/components/PageHeader.tsx` | ⏳ À auditer | - |
| PageSection | `src/components/PageSection.tsx` | ⏳ À auditer | - |
| SurfaceCard | `src/components/SurfaceCard.tsx` | ⏳ À auditer | - |
| StatusChip | `src/components/StatusChip.tsx` | ⏳ À auditer | - |
| ConfirmDialog | `src/components/ConfirmDialog.tsx` | ⏳ À auditer | - |
| ActionCard | `src/components/ActionCard.tsx` | ⏳ À auditer | - |
| OptionActionCard | `src/components/OptionActionCard.tsx` | ⏳ À auditer | - |
| MetricCard | `src/components/MetricCard.tsx` | ⏳ À auditer | - |
| EmptyState | `src/components/EmptyState.tsx` | ⏳ À auditer | - |
| MoneyValue | `src/components/MoneyValue.tsx` | ⏳ À auditer | - |

### 2. Pages principales migrées en Phase 5

- `src/features/settings/SettingsPage.tsx`
- `src/features/activity/ActivityPage.tsx`
- `src/features/missions/MissionFormPage.tsx`
- `src/features/missions/MissionsPage.tsx`
- `src/features/pharmaciens/PharmacienNewPage.tsx`
- `src/features/pharmacies/PharmacieAddPage.tsx`
- `src/features/onboarding/OnboardingPage.tsx`
- `src/features/financial/FinancialPage.tsx`
- `src/features/options/OptionsPage.tsx`
- `src/features/invoices/InvoicesPage.tsx`

### 3. Formulaires

Tous les formulaires de l'application, notamment :
- Formulaires de mission
- Formulaires de facturation
- Formulaires de pharmacie/pharmacien
- Paramètres

### 4. Tableaux

- Tableaux de missions
- Tableaux de factures
- Tableaux financiers

### 5. Modals & Dialogs

- ConfirmDialog
- PharmacieFormModal
- PharmacienFormModal
- Toutes les modals de settings

---

## ✅ Critères WCAG 2.2 Level AA à vérifier

### 1. Contraste des couleurs (1.4.3, 1.4.6)

- [ ] **Texte standard** : Ratio minimum de **4.5:1** entre le texte et son arrière-plan
- [ ] **Texte grand** (≥ 18.66px ou 14px gras) : Ratio minimum de **3:1**
- [ ] **Éléments interactifs** : Contraste suffisant pour les boutons, liens, icônes
- [ ] **États de focus** : Contraste visible pour les indicateurs de focus

**Outils recommandés** :
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Chrome DevTools - Color Picker](https://developer.chrome.com/docs/devtools/css/reference/#color-picker)

### 2. Navigation clavier (2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7)

- [ ] **Tous les éléments interactifs** sont accessibles via le clavier (Tab, Shift+Tab)
- [ ] **Ordre de tabulation** logique et cohérent
- [ ] **Focus visible** : Indicateurs de focus visibles pour tous les éléments interactifs
- [ ] **Piège au clavier** : Aucun piège (tous les modals/menus peuvent être fermés au clavier)
- [ ] **Raccourcis clavier** : Pas de conflit avec les raccourcis navigateur

### 3. Structure et sémantique (1.3.1, 1.3.2, 4.1.2)

- [ ] **Balises HTML sémantiques** : Utilisation appropriée de `<button>`, `<nav>`, `<main>`, etc.
- [ ] **Hiérarchie des titres** : `<h1>` à `<h6>` utilisée correctement
- [ ] **Labels** : Tous les champs de formulaire ont un `<label>` ou `aria-label`
- [ ] **Groupes de champs** : `fieldset`/`legend` pour les groupes de radio/checkbox
- [ ] **Langue** : Attribut `lang` défini sur la balise `<html>`

### 4. Alternatives textuelles (1.1.1)

- [ ] **Images** : Tous les `<img>` ont un `alt` approprié
- [ ] **Icônes** : Les icônes décoratives ont `aria-hidden="true"`
- [ ] **Icônes interactives** : Les icônes cliquables ont un `aria-label` ou un texte visible
- [ ] **SVG** : Accessibles via `aria-label`, `aria-labelledby`, ou `<title>`

### 5. Formulaires (3.3.1, 3.3.2, 3.3.3)

- [ ] **Messages d'erreur** : Identifiés clairement et associés au champ concerné
- [ ] **Suggestions de correction** : Fournies lorsque possible
- [ ] **Validation côté client** : Erreurs affichées avant soumission
- [ ] **Instructions** : Fournies avant ou pendant la saisie

### 6. Adaptabilité (1.3.4, 1.4.4, 1.4.10, 1.4.12)

- [ ] **Zoom** : Le contenu reste lisible à 200% de zoom
- [ ] **Orientation** : Fonctionne en portrait et paysage (sauf si restriction nécessaire)
- [ ] **Reflow** : Contenu lisible à 320px de largeur sans scroll horizontal
- [ ] **Espacement** : Aucune perte de fonctionnalité avec un espacement de texte personnalisé

### 7. Temps et interruptions (2.2.1, 2.2.2)

- [ ] **Limites de temps** : Possibilité de prolonger ou désactiver
- [ ] **Interruptions** : Possibilité de reporter ou ignorer

---

## 🔍 Méthodologie d'audit

### Étape 1 : Audit automatique

Utiliser les outils suivants pour identifier les problèmes évidents :

1. **axe DevTools** (extension Chrome)
   - Lancer un scan complet de l'application
   - Exporter le rapport

2. **Lighthouse** (intégré à Chrome DevTools)
   - Audit d'accessibilité
   - Vérifier le score (≥ 90/100)

3. **WAVE** (Web Accessibility Evaluation Tool)
   - [https://wave.webaim.org/](https://wave.webaim.org/)

### Étape 2 : Audit manuel

Pour chaque composant et page :

1. **Navigation clavier**
   - Tab à travers tous les éléments interactifs
   - Vérifier que le focus est toujours visible
   - Vérifier que l'ordre est logique

2. **Lecteur d'écran** (NVDA ou VoiceOver)
   - Vérifier que tout le contenu est lisible
   - Vérifier que les labels sont annoncés correctement
   - Vérifier que la structure est compréhensible

3. **Contraste des couleurs**
   - Vérifier manuellement avec les outils de contraste
   - Noter les combinaisons problématiques

4. **Tests utilisateurs**
   - Recueillir des retours d'utilisateurs avec différents handicaps

### Étape 3 : Documentation

Pour chaque problème identifié :
- **Localisation** : Fichier et ligne
- **Critère WCAG** : Référence du critère violé
- **Sévérité** : Bloquant / Majeur / Mineur
- **Description** : Description du problème
- **Solution proposée** : Comment corriger
- **Priorité** : Haute / Moyenne / Basse

---

## 📊 Rapport d'audit

*À remplir au fur et à mesure de l'audit*

### Résumé

| Catégorie | Problèmes trouvés | Résolus | En cours |
|-----------|-------------------|---------|----------|
| Contraste | 0 | 0 | 0 |
| Clavier | 0 | 0 | 0 |
| Sémantique | 0 | 0 | 0 |
| Alternatives | 0 | 0 | 0 |
| Formulaires | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** |

### Problèmes identifiés

*Format :*
```markdown
#### [ID] - [Catégorie] - [Composant/Page]
- **Critère WCAG** : [ex: 1.4.3]
- **Sévérité** : [Bloquant/Majeur/Mineur]
- **Description** : [Description détaillée]
- **Localisation** : [Fichier:ligne]
- **Solution** : [Solution proposée]
- **Priorité** : [Haute/Moyenne/Basse]
- **Statut** : [⏳ À corriger / ✅ Corrigé / ❌ Non applicable]
```

---

## 🎯 Prochaines étapes

1. **Lancer l'audit automatique** avec axe DevTools et Lighthouse
2. **Commencer par les composants du Design System** (liste ci-dessus)
3. **Documenter chaque problème** dans la section "Problèmes identifiés"
4. **Prioriser les corrections** par impact utilisateur
5. **Créer des tickets** pour chaque correction nécessaire

---

## 📚 Ressources utiles

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11Y Project](https://www.a11yproject.com/)
- [Accessible Rich Internet Applications (WAI-ARIA)](https://www.w3.org/WAI/standards-guidelines/aria/)

---

## 📝 Historique

| Date | Action | par |
|------|--------|-----|
| 14/06/2026 | Création du document | Mistral Vibe |

---

*Document généré par Mistral Vibe*  
*Version: 1.0 - 2026-06-14*
