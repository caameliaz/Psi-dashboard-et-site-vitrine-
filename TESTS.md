# PSI — Checklist de recette complète
**Version :** 1 juillet 2026 — À tester avant livraison

---

## AVANT DE COMMENCER

- [ ] `npm run dev` tourne sans erreur
- [ ] Connecté en **Admin**
- [ ] Ouvrir un 2e onglet navigation privée connecté en **Employé** (pour tester les notifs croisées)
- [ ] Avoir : 1 client avec commandes, 1 client vide, 2-3 commandes dont 1 devis

---

## 1. AUTHENTIFICATION

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 1.1 | Aller sur `/admin` sans session | Redirigé `/admin/login` |
| 1.2 | Mauvais mot de passe | Message erreur, pas de redirection |
| 1.3 | Se connecter Admin | Dashboard, sidebar affiche "Admin" vert |
| 1.4 | Se connecter Employé (autre onglet) | Sidebar "Employé" bleu, pas Utilisateurs ni Contenu |
| 1.5 | Déconnexion | Redirigé `/admin/login` |

---

## 2. SITE PUBLIC → ADMIN (temps réel)

### 2A. Nouvelle commande depuis le site
| # | Action | Résultat attendu |
|---|--------|-----------------|
| 2.1 | `/products` → panier → `/checkout` → soumettre | Écran confirmation vert |
| 2.2 | Admin (sans refresh) | Toast "Nouvelle commande · Site web" haut droite (7s) |
| 2.3 | Cloche admin | Badge +1, notif dans le panel |
| 2.4 | `/admin/requests` | Commande en haut, badge "Site web" vert, statut "En attente" |
| 2.5 | Employé (autre onglet) | Reçoit aussi le toast et la notif |

### 2B. Nouveau devis depuis le site
| # | Action | Résultat attendu |
|---|--------|-----------------|
| 2.6 | `/quote` → remplir → soumettre | Écran confirmation |
| 2.7 | Admin et Employé reçoivent toast "Nouveau devis · Site web" | ✓ |
| 2.8 | Apparaît onglet Devis avec badge "Site web" | ✓ |

---

## 3. WORKFLOW COMMANDE

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 3.1 | Ouvrir commande "En attente" | Bouton "Confirmer" visible |
| 3.2 | Cliquer "Confirmer" | Statut → "Confirmé" (violet) |
| 3.3 | Vérifier onglet notifs sur compte Employé | Reçoit "Commande mise à jour — commande de ClientX → Confirmé" |
| 3.4 | Vérifier que l'Admin (acteur) ne reçoit PAS la notif | ✓ |
| 3.5 | Rouvrir le panel | Bouton "Marquer Livré" visible |
| 3.6 | Cliquer "Marquer Livré" | Statut → "Livré" (vert), descend en bas |
| 3.7 | Cliquer "Annuler" sur commande En attente | Popup "Annuler commande de X ?" |
| 3.8 | Confirmer | Statut → "Annulé" (gris), archivé en bas |
| 3.9 | Rouvrir commande annulée | Bouton "Restaurer" |
| 3.10 | Restaurer | Statut → "En attente", remonte |

---

## 4. WORKFLOW DEVIS

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 4.1 | Ouvrir devis "En attente" | Boutons "Confirmer" et "Annuler" |
| 4.2 | Confirmer | Statut → "Confirmé" |
| 4.3 | Rouvrir devis confirmé | Bouton "Convertir en commande" visible |
| 4.4 | Convertir | Nouvelle commande créée "En attente", devis reste "Confirmé" |
| 4.5 | Employé reçoit notif "Devis converti en commande de ClientX" | ✓ |
| 4.6 | Acteur ne reçoit PAS la notif | ✓ |
| 4.7 | Annuler un devis + popup | Statut → "Annulé" |
| 4.8 | Restaurer | Statut → "En attente" |

---

## 5. CRÉATION MANUELLE

### 5A. Depuis /admin/requests
| # | Action | Résultat attendu |
|---|--------|-----------------|
| 5.1 | "+ Nouvelle demande" | Modal s'ouvre |
| 5.2 | Commande : remplir client, wilaya, téléphone | — |
| 5.3 | Sélectionner produit dans dropdown | Prix auto-rempli |
| 5.4 | Activer TVA 19% | Total recalculé |
| 5.5 | Valider | Commande créée, badge "Manuel" orange |
| 5.6 | Employé reçoit toast "Nouvelle commande · Manuel" | ✓ |
| 5.7 | Acteur ne reçoit PAS la notif | ✓ |
| 5.8 | Même test avec "Devis" | Devis créé onglet Devis |

### 5B. Depuis fiche client
| # | Action | Résultat attendu |
|---|--------|-----------------|
| 5.9 | `/admin/clients` → fiche → "Nouvelle commande" | Modal client pré-rempli |
| 5.10 | Remplir, valider | Apparaît dans /requests ET historique client |

---

## 6. FILTRES — /admin/requests

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 6.1 | Onglet "Tous" | Commandes + devis, En attente en haut, archivés en bas |
| 6.2 | Onglet "Commandes" | Seulement commandes |
| 6.3 | Onglet "Devis" | Seulement devis |
| 6.4 | Filtre statut "Confirmé" | Seulement confirmés |
| 6.5 | Filtre période "Ce mois" (défaut) | Mois en cours |
| 6.6 | Filtre "3 derniers mois" | 3 mois |
| 6.7 | Filtre "Tout afficher" | Tout |
| 6.8 | Recherche par entreprise | Filtre en temps réel |
| 6.9 | Recherche par ref "CMD-" | Filtre par ref |
| 6.10 | Bouton "Effacer" | Tous filtres réinitialisés |

---

## 7. SOURCE (Site web vs Manuel)

| # | Où | Résultat attendu |
|---|---|-----------------|
| 7.1 | Tableau /requests | Badge vert "Site web" ou orange "Manuel" |
| 7.2 | Tableau /dashboard | Idem |
| 7.3 | Panel RequestPanel header | Badge Source visible |
| 7.4 | Toast | "· Site web" ou "· Manuel" dans le titre |
| 7.5 | Excel rapport ventes | Colonne "Source" lisible |

---

## 8. CLIENTS

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 8.1 | `/admin/clients` | Tous les clients visibles (même sans commandes) |
| 8.2 | Recherche | Filtre par nom / entreprise / wilaya |
| 8.3 | Clic sur client | Fiche slide-in : infos + historique |
| 8.4 | Clic sur ligne historique | RequestPanel de cette commande |
| 8.5 | Modifier client | Changements sauvegardés |
| 8.6 | Créer client | Apparaît dans la liste |
| 8.7 | Supprimer client (popup confirmation) | Client supprimé, commandes/devis restent dans /requests |
| 8.8 | Employé essaie de supprimer | Bouton absent ou 403 |

---

## 9. NOTIFICATIONS

| # | Vérification | Résultat attendu |
|---|-------------|-----------------|
| 9.1 | Toast : position | Haut droite |
| 9.2 | Toast : durée | 7 secondes |
| 9.3 | Toast : style | Carte blanche, PAS de rond à gauche, PAS de barre colorée |
| 9.4 | Toast : clic | Disparaît |
| 9.5 | Badge cloche | Nombre non lus |
| 9.6 | Panel : fond coloré = non lu | ✓ |
| 9.7 | Panel : PAS de ronds à gauche | ✓ |
| 9.8 | Clic notif | Passe en lue |
| 9.9 | "Tout marquer lu" | Badge disparaît |
| 9.10 | Employé agit → Admin reçoit | ✓ |
| 9.11 | Admin agit → Employé reçoit | ✓ |
| 9.12 | Acteur ne reçoit PAS sa propre action | ✓ |
| 9.13 | Création user → admins seulement | ✓ |

---

## 10. EXPORTS EXCEL

### 10A. Rapport de ventes
| # | Action | Résultat attendu |
|---|--------|-----------------|
| 10.1 | Bouton "Rapport de ventes" | Téléchargement `PSI_Ventes_DD-MM-YYYY.xlsx` |
| 10.2 | Colonnes | N° Facture · Source · Date commande · Date livraison · Client · Entreprise · Wilaya · Agent · Réf produit · Qté · Prix unitaire · Total ligne |
| 10.3 | Contenu | Seulement commandes **Livrées** |
| 10.4 | Multi-produits | Une ligne par produit |
| 10.5 | Bas du fichier | Ligne TOTAL VENTES |
| 10.6 | Colonne Source | "Site web" ou "Manuel" |

### 10B. Export tableau filtré
| # | Action | Résultat attendu |
|---|--------|-----------------|
| 10.7 | Filtrer, cliquer "Exporter" | Export du tableau tel qu'affiché |
| 10.8 | Colonnes | Référence · Type · Date · Client · Entreprise · Wilaya · Statut · Produits · Montant HT |
| 10.9 | Bas | Récap par statut + total |

---

## 11. DASHBOARD

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 11.1 | Cartes stats | Commandes mois, Devis mois, CA, En attente |
| 11.2 | Donut | Top 3 produits |
| 11.3 | Carte origine | Barre Site web / Manuel / % |
| 11.4 | Tableau récent | Avec colonne Source |
| 11.5 | Clic ligne | RequestPanel |
| 11.6 | Nouvelle commande site | Dashboard se met à jour sans refresh |

---

## 12. SÉCURITÉ

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 12.1 | Employé : PATCH `/api/products/[id]` | 403 Forbidden |
| 12.2 | Employé : DELETE `/api/products/[id]` | 403 Forbidden |
| 12.3 | Employé : DELETE `/api/users/[id]` | 403 Forbidden |
| 12.4 | Non connecté : GET `/api/orders` | 401 Unauthorized |

---

## 13. UTILISATEURS (admin only)

| # | Action | Résultat attendu |
|---|--------|-----------------|
| 13.1 | Créer un employé | Notif reçue par admins seulement (pas l'acteur) |
| 13.2 | Modifier rôle | Pris en compte au prochain login |
| 13.3 | Désactiver compte | Ce compte ne peut plus se connecter |

---

## RÉCAP STATUTS

| Type | Transitions |
|------|------------|
| Commande | En attente → Confirmé → Livré |
| Commande | En attente/Confirmé → Annulé → (Restaurer) → En attente |
| Devis | En attente → Confirmé → Converti en commande |
| Devis | En attente/Confirmé → Annulé → (Restaurer) → En attente |

---

## CHECKLIST FINALE

- [ ] Sections 1 à 13 toutes testées
- [ ] Aucun `console.error` dans le terminal serveur
- [ ] Export ventes contient des données réelles livrées
- [ ] Notifs temps réel entre 2 comptes simultanés OK
- [ ] Suppression client ne détruit pas les commandes
- [ ] Build propre : `npx next build` sans erreur TypeScript
