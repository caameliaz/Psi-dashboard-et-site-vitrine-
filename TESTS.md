# PSI — Workflows & Parcours complets

## ORDRE D'IMPLÉMENTATION
1. ✅ Front admin (mock data)
2. → Auth
3. → Routes Bruno
4. → Branchement DB

---

## WORKFLOW 1 — Devis entrant (depuis site public)

```
Client remplit formulaire /devis
  → POST /api/quotes
  → Devis créé en DB (statut: En attente)
  → Notif admin : "Nouveau devis — BuroPro"

Admin ouvre /admin/requests → onglet Devis
  → Voit DEV-XXX en orange (En attente)
  → Clique sur la ligne → RequestPanel s'ouvre

  ACTIONS POSSIBLES dans le panel :
  ├── WhatsApp → ouvre wa.me avec message prérempli (nom + ref)
  ├── Appeler → tel: du client
  ├── Email → mailto: du client
  ├── Annuler → statut: Annulé (ligne grisée, archivée en bas)
  └── Marquer Contacté → statut: Contacté (pill bleue)
        └── ACTIONS POSSIBLES :
            ├── Annuler → statut: Annulé
            └── Valider → Commande
                  → Devis reste "Contacté" (archivé)
                  → Nouvelle Commande créée (CMD-XXX, statut: En attente)
                  → Notif : "Devis DEV-XXX converti en CMD-XXX"

Si Annulé → bouton Restaurer → statut revient: En attente
```

---

## WORKFLOW 2 — Commande entrante (depuis site public)

```
Client remplit formulaire /cart ou /checkout
  → POST /api/orders
  → Commande créée en DB (statut: En attente)
  → Notif admin : "Nouvelle commande — TechAlger"

Admin ouvre /admin/requests → onglet Commandes
  → Voit CMD-XXX en orange (En attente)
  → Clique → RequestPanel

  ACTIONS POSSIBLES :
  ├── WhatsApp / Appeler / Email
  ├── Annuler → statut: Annulé
  └── Marquer Contacté → statut: Contacté
        └── ACTIONS POSSIBLES :
            ├── Annuler → statut: Annulé
            └── Marquer Livré → statut: Livré (archivée)

Si Annulé → Restaurer → statut: En attente
```

---

## WORKFLOW 3 — Création manuelle (admin)

### Depuis /admin/requests
```
Bouton "Nouvelle demande"
  → Modal CreateForm s'ouvre
  → Choisir : Commande ou Devis
  → Remplir : entreprise, client, produits, montant
  → Valider
  → Ref auto-générée (CMD-XXX ou DEV-XXX)
  → Apparaît en haut du tableau (En attente)
  → Suit le workflow normal (1 ou 2)
```

### Depuis /admin/clients → fiche client
```
Ouvrir fiche client (clic sur ligne)
  → Section Historique → bouton "Nouvelle demande"
  → Modal NewOrderForm (client pré-rempli)
  → Choisir Commande / Devis
  → Remplir produits + montant
  → Valider
  → Apparaît dans /admin/requests + dans l'historique du client
```

---

## WORKFLOW 4 — Gestion client

```
/admin/clients
  → Tableau clients (clic sur ligne → fiche slide-in droite)

Fiche client contient :
  ├── Infos : nom, entreprise, wilaya, téléphones
  ├── Historique : toutes ses commandes/devis
  │     └── Clic sur une ligne → RequestPanel de cette commande
  ├── Bouton "Nouvelle demande" → workflow 3
  └── Bouton modifier → éditer nom/wilaya/tél

Actions dans la fiche :
  ├── WhatsApp direct (numéro du client)
  ├── Appeler
  └── Supprimer client (avec confirmation)

Nouveau client :
  → Bouton "Nouveau client" (haut de page)
  → Modal : nom, entreprise, wilaya, téléphone, email
  → Créé immédiatement dans la liste
```

---

## WORKFLOW 5 — Gestion produits

```
/admin/products
  → Liste produits (ref, format, prix, stock)
  → Clic → fiche produit slide-in

Actions :
  ├── Modifier prix / stock → inline edit ou modal
  ├── Ajouter variante (format, longueur)
  ├── Désactiver produit (ne s'affiche plus sur site public)
  └── Supprimer (avec confirmation)

Nouveau produit :
  → Bouton "Nouveau produit"
  → Modal : ref, format (mm), longueur (m), prix, stock
```

---

## WORKFLOW 6 — Gestion utilisateurs

```
/admin/users
  → Tableau : Nom · Email · Rôle · Statut · Autorisations · Actions

Créer un utilisateur (2 étapes) :
  Étape 1 : nom, email, mot de passe (auto-généré ↻), rôle
  Étape 2 : cocher les autorisations une par une
  → Valider → Modal identifiants (email + mdp à copier)
  → L'employé se connecte avec ces identifiants

Modifier un utilisateur :
  → Clic sur ligne → fiche slide-in droite
  → Autorisations : checkboxes cochables/décochables en temps réel
  → Bouton Modifier → éditer nom/email/rôle
  → Bouton Supprimer → choix : désactiver ou supprimer définitivement

Autorisations disponibles :
  ├── Voir les commandes & devis
  ├── Modifier les statuts
  ├── Voir les fiches clients
  ├── Modifier / ajouter des clients
  ├── Voir les produits
  ├── Modifier les produits
  ├── Voir l'historique
  ├── Modifier le contenu du site
  └── Gérer les utilisateurs

Admin → toutes les autorisations (non modifiables)
Employé → sous-ensemble configurable par l'admin
```

---

## WORKFLOW 7 — Contenu site public

```
/admin/content
  → Sections éditables : Hero, À propos, Produits mis en avant, Footer
  → Modifier texte / image → live preview
  → Bouton "Publier" → PATCH /api/content → site public mis à jour
```

---

## WORKFLOW 8 — Historique

```
/admin/history
  → Journal de toutes les actions (qui a fait quoi, quand)
  → Filtres : par user, par type d'action, par date
  → Entrées : création commande, changement statut, modification client, etc.
```

---

## WORKFLOW 9 — Notifications

```
Cloche en haut à droite (TopBar)
  → Badge rouge = nombre non lues
  → Clic → panel 500px

Types :
  ├── Commande (vert) : nouvelle commande, commande livrée
  ├── Devis (violet) : nouveau devis, devis converti
  ├── Action (gris) : mes propres actions (produit modifié, client ajouté)
  └── Équipe (orange) : actions des autres users

Comportement :
  ├── Clic sur notif → marque comme lue (bordure bleue disparaît)
  ├── "Tout marquer lu" → toutes lues
  └── (futur) Clic → redirige vers la commande/fiche concernée
```

---

## WORKFLOW 10 — Messages contact

```
/admin/requests → onglet Messages
  → Messages reçus depuis /contact du site public
  → Clic → panel avec contenu du message
  → Actions : répondre (email), marquer lu, archiver
```

---

## TRANSITIONS DE STATUTS — Récap

```
DEVIS :
  En attente → Contacté → [converti en Commande]
  En attente → Annulé → (Restaurer) → En attente
  Contacté   → Annulé → (Restaurer) → En attente

COMMANDE :
  En attente → Contacté → Livré
  En attente → Annulé → (Restaurer) → En attente
  Contacté   → Annulé → (Restaurer) → En attente

RÈGLE : un Devis ne peut pas avoir statut "Validé"
  → Quand validé : Devis reste "Contacté", une Commande est créée
```

---

## COULEURS STATUTS

| Statut     | Couleur     | Hex       |
|------------|-------------|-----------|
| En attente | Orange      | `#F97316` |
| Contacté   | Bleu        | `#3B82F6` |
| Livré      | Vert        | `#4CAF4F` |
| Annulé     | Gris        | `#9CA3AF` |

---

## ÉTAPES RESTANTES

1. **AUTH** — login admin (ne pas faire sans validation explicite)
2. **Bruno** — tester toutes les routes API
3. **DB** — remplacer tous les `useState` mock par des vrais appels API
