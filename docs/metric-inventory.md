# Inventaire des métriques Pharmfact

Périmètre: métriques visibles sous forme de cartes, compteurs, badges et indicateurs de synthèse dans l’interface actuelle.

## Accueil

| Métrique | Affichage | Interaction | Ouvre quoi | Forme d’ouverture |
| --- | --- | --- | --- | --- |
| Créer une mission | Bouton principal | Clic sur le bouton | `/mission/new` | Navigation plein écran, même onglet |
| Missions à facturer | Tuile de priorité | Clic sur la tuile entière | `/missions?filter=to_invoice` | Navigation plein écran, même onglet |
| Factures à envoyer | Tuile de priorité | Clic sur la tuile entière | `/invoices?filter=to_send` | Navigation plein écran, même onglet |
| À encaisser | Tuile de priorité | Clic sur la tuile entière | `/invoices?filter=receivable` | Navigation plein écran, même onglet |
| Retards | Tuile de priorité | Clic sur la tuile entière | `/invoices?filter=overdue` | Navigation plein écran, même onglet |
| Missions à venir - 7 jours | Carte informative | Aucune action directe | Aucune | Aucune ouverture |
| Montant estimé - 7 jours | Carte informative | Aucune action directe | Aucune | Aucune ouverture |
| Heures prévues - 7 jours | Carte informative | Aucune action directe | Aucune | Aucune ouverture |
| Prochaine mission | Carte informative | Aucune action directe | Aucune | Aucune ouverture |
| Actions rapides | Carte de navigation | Clic sur la carte | Vers la page correspondante | Navigation plein écran, même onglet |
| Données locales à vérifier | Bannière d’alerte | Bouton `Corriger` ou `Activer` | `/options?panel=data` | Navigation plein écran, même onglet |

## Missions

| Métrique | Affichage | Interaction | Ouvre quoi | Forme d’ouverture |
| --- | --- | --- | --- | --- |
| Missions à venir - 7 jours | Tuile `MetricCard` | Bouton `Filtrer` | Filtre la liste courante | Action locale + changement d’URL |
| Montant estimé - 7 jours | Tuile `MetricCard` | Bouton `Filtrer` | Filtre la liste courante | Action locale + changement d’URL |
| Missions à facturer | Tuile `MetricCard` | Bouton `Filtrer` | Filtre la liste courante | Action locale + changement d’URL |
| Liste des missions à facturer | Carte de groupe opérationnel | Bouton `Générer facture groupée` | Crée une facture groupée | Mutation locale + mise à jour immédiate de l’écran |
| PDF d’une mission facturée | Icône PDF dans la ligne | Clic sur l’icône PDF | Génération et téléchargement du PDF | Téléchargement de fichier dans le navigateur |
| Calendrier d’une mission | Icône calendrier dans la ligne | Clic sur l’icône calendrier | Fichier ICS | Téléchargement de fichier dans le navigateur |

## Factures

| Métrique | Affichage | Interaction | Ouvre quoi | Forme d’ouverture |
| --- | --- | --- | --- | --- |
| À envoyer | Tuile `MetricCard` | Bouton `Filtrer` | Filtre la file courante | Action locale + changement d’URL |
| À encaisser | Tuile `MetricCard` | Bouton `Filtrer` | Filtre la file courante | Action locale + changement d’URL |
| Échues | Tuile `MetricCard` | Bouton `Filtrer` | Filtre la file courante | Action locale + changement d’URL |
| À vérifier | Tuile `MetricCard` | Bouton `Filtrer` | Filtre la file courante | Action locale + changement d’URL |
| Ligne de facture | Ligne de tableau | Clic sur la ligne | Détail de facture | Dialog/modal centré dans la page |
| PDF de facture | Bouton `PDF` dans la ligne | Clic sur le bouton | PDF de facture | Téléchargement de fichier dans le navigateur |
| Marquage d’état | Boutons `Envoyer`, `Payer`, `Archiver` | Clic sur bouton | Mise à jour de statut | Mutation locale + toast + undo possible |
| Factures corrigées / versions corrigées | Onglets/queues | Clic sur le filtre | Liste filtrée | Changement de vue dans la même page |

## Finance

| Métrique | Affichage | Interaction | Ouvre quoi | Forme d’ouverture |
| --- | --- | --- | --- | --- |
| Missions à facturer | Tuile `MetricCard` | Bouton `Filtrer` | `/missions?filter=to_invoice` | Navigation plein écran, même onglet |
| À envoyer | Tuile `MetricCard` | Bouton `Filtrer` | `/invoices?filter=to_send` | Navigation plein écran, même onglet |
| À encaisser | Tuile `MetricCard` | Bouton `Filtrer` | `/invoices?filter=receivable` | Navigation plein écran, même onglet |
| À vérifier | Tuile `MetricCard` | Bouton `Filtrer` | `/invoices?filter=attention` | Navigation plein écran, même onglet |
| Encaissé | `FinancialMetricCard` mensuel / trimestriel / annuel | Aucune action directe | Aucune | Aucune ouverture |
| Bénéfice net estimé | `FinancialMetricCard` mensuel / trimestriel / annuel | Aucune action directe | Aucune | Aucune ouverture |
| Réserve recommandée / Réserve | `FinancialMetricCard` mensuel / trimestriel / annuel | Aucune action directe | Aucune | Aucune ouverture |
| Reste à prévoir / Reste | `FinancialMetricCard` mensuel / trimestriel / annuel | Aucune action directe | Aucune | Aucune ouverture |
| À encaisser | Carte de période mensuelle `FinancialPeriodCard` | Sélecteur de période et export JSON | Change de mois / trimestre / année affiché | Navigation interne dans la même page + téléchargement JSON |
| Petit fournisseur | Carte de détail | Aucune action directe | Aucune | Aucune ouverture |
| Acomptes provisionnels | Carte de synthèse | Bouton `Ajouter un acompte` | Ouvre le tiroir de saisie | Tiroir latéral dans la même page |
| Dépenses déductibles | Carte de synthèse | Bouton `Ajouter une dépense` | Ouvre le tiroir de saisie | Tiroir latéral dans la même page |
| Dépenses issues des missions | Carte de synthèse | Bouton `Voir détail` | Ouvre le tiroir de détail | Tiroir latéral dans la même page |
| Factures à encaisser | Carte de synthèse | Bouton `Voir les factures` | Ouvre le tiroir `Receivables` | Tiroir latéral dans la même page |
| TPS/TVQ | Carte d’action | Clic sur la carte | Ouvre le tiroir TPS/TVQ | Tiroir latéral dans la même page |

## Pharmacies

| Métrique | Affichage | Interaction | Ouvre quoi | Forme d’ouverture |
| --- | --- | --- | --- | --- |
| Taux habituel | Valeur dans le tableau | Aucune action directe | Aucune | Aucune ouverture |
| Total facturé | Valeur dans le tableau | Aucune action directe | Aucune | Aucune ouverture |
| Dernier remplacement | Valeur dans le tableau | Aucune action directe | Aucune | Aucune ouverture |
| Impayées | Compteur + montant dans le tableau | Bouton de ligne | `/invoices?filter=receivable&pharmacieId=:id` | Navigation plein écran, même onglet |
| Modifier la pharmacie | Bouton de ligne | Clic sur le bouton | Formulaire pharmacie | Navigation plein écran, même onglet |

## Options

| Métrique | Affichage | Interaction | Ouvre quoi | Forme d’ouverture |
| --- | --- | --- | --- | --- |
| Santé des données | Carte de synthèse | Aucun bouton métrique, uniquement la section | Aucune | Aucune ouverture |
| Doublons | `DataCount` | Bouton seulement si > 0 | Filtre les doublons | Interaction locale |
| Orphelins | `DataCount` | Bouton seulement si > 0 | Filtre les orphelins | Interaction locale |
| Avertis. | `DataCount` | Bouton seulement si > 0 | Filtre les avertissements | Interaction locale |
| Erreurs | `DataCount` | Bouton seulement si > 0 | Filtre les erreurs | Interaction locale |
| Pharmaciens | `DataCount` | Aucune action directe | Aucune | Aucune ouverture |
| Pharmacies | `DataCount` | Aucune action directe | Aucune | Aucune ouverture |
| Missions | `DataCount` | Aucune action directe | Aucune | Aucune ouverture |
| Factures | `DataCount` | Aucune action directe | Aucune | Aucune ouverture |
| Acomptes | `DataCount` | Aucune action directe | Aucune | Aucune ouverture |

## Notes d’ouverture

- `Navigation plein écran, même onglet` signifie changement de route via `navigate(...)` dans l’application.
- `Dialog/modal centré dans la page` signifie ouverture dans une fenêtre modale au-dessus de la liste.
- `Tiroir latéral dans la même page` signifie ouverture d’un drawer MUI sans quitter la page courante.
- `Téléchargement de fichier dans le navigateur` signifie génération d’un fichier PDF ou ICS déclenchée par clic.
- `Navigation interne dans la même page + téléchargement JSON` signifie changement de période ou export local sans quitter la page.
- Les métriques sans action sont volontairement non cliquables pour éviter les doublons de navigation.
