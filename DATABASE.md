# PSI — Base de données

> **État** : Seed lancé le 30/06/2026 — données de test en place.  
> **Connexion** : Neon (PostgreSQL) via `DATABASE_URL` dans `.env`  
> **Voir/éditer** : `npx prisma studio` (lance une UI web sur localhost:5555)

## Comptes utilisateurs

| Nom | Email | Rôle | Mot de passe | Statut |
|-----|-------|------|-------------|--------|
| Admin PSI | admin@psi.dz | Admin | `password` ← à changer | Actif |
| Amira Bensaid | amira@psi.dz | Employé | `Amira2026!` | Actif |
| Tariq Meziane | tariq@psi.dz | Employé | `Tariq2026!` | Actif |
| Samia Oukil | samia@psi.dz | Employé | `Samia2026!` | Inactif |

---

## Produits (6 références réelles PSI)

| Référence | Largeur | Longueur | Usage | Prix seed (fictif) |
|-----------|---------|----------|-------|--------------------|
| 80/80 | 80 mm | 79 m | Imprimantes thermiques – Caisse grand format – Commerces | 680 DA |
| 80/75 | 75 mm | 74 m | Imprimantes thermiques – Caisse grand format – Commerce & banque | 650 DA |
| 80/60 | 60 mm | 45 m | Usage mixte | 520 DA |
| 57/50 | 50 mm | 30 m | Terminal compact | 390 DA |
| 57/40 | 40 mm | 20 m | Restaurant & pharmacie | 310 DA |
| 57/30 | 30 mm | 9 m | Petit terminal mobile | 220 DA |

Champs custom communs à tous : **Grammage** 55 gr/m² Premium · **Origine** Europe (Germany) · **BPA Free** oui

**→ Les prix sont fictifs. À modifier via l'admin ou Neon une fois les vrais prix connus.**

---

## Clients (12 fictifs réalistes)

| Nom | Entreprise | Wilaya |
|-----|-----------|--------|
| Ahmed Benali | TechAlger SARL | Alger |
| Hocine Belkacem | AlgerPos | Alger |
| Sara Mansouri | BuroPro | Oran |
| Meriem Saadi | MediPharm | Oran |
| Karim Hadji | AlgeroShop | Constantine |
| Nadia Berber | MegaDist | Annaba |
| Mohamed Ziani | PrintPlus | Blida |
| Fatima Bouzid | EcoMarket | Sétif |
| Youssef Amrani | DigiStore | Tizi Ouzou |
| Lynda Cherifi | SuperMarché El Amel | Béjaïa |
| Sofiane Mekki | FastPrint | Batna |
| Rania Touati | Papeterie Centrale | Tlemcen |

---

## Commandes (5)

| Ref DB | Client | Produits | Statut | Source |
|--------|--------|---------|--------|--------|
| cmd1 | Ahmed Benali (TechAlger) | 80/80 ×50 + 57/40 ×30 | Validé (Livré) | Site |
| cmd2 | Karim Hadji (AlgeroShop) | 80/80 ×30 + 80/75 ×10 | Contacté | Site |
| cmd3 | Nadia Berber (MegaDist) | 57/40 ×10 | Annulé | Téléphone |
| cmd4 | Fatima Bouzid (EcoMarket) | 57/40 ×24 + 57/50 ×12 | En attente | Site |
| cmd5 | Hocine Belkacem (AlgerPos) | 80/80 ×100 | En attente | WhatsApp (créé par Amira) |

---

## Devis (3)

| Ref DB | Client | Demande | Statut |
|--------|--------|---------|--------|
| dev1 | Sara Mansouri (BuroPro) | 80/60 ×200, format 60mm | En attente |
| dev2 | Youssef Amrani (DigiStore) | 57/40 ×100 + format custom | Contacté (prix proposé: 58 000 DA) |
| dev3 | Sofiane Mekki (FastPrint) | 80/80 ×500 | Annulé (2 relances sans réponse) |

---

## Messages contact (2)

| Client | Message résumé | Statut |
|--------|---------------|--------|
| Rania Touati (Papeterie Centrale, Tlemcen) | Infos livraison + tarifs grossistes | En attente |
| Meriem Saadi (MediPharm, Oran) | Compatibilité Epson TM-T20 | Traité |

---

## Templates messages (6)

| Titre | Catégorie |
|-------|-----------|
| Confirmation de commande | Confirmation |
| Devis reçu | Devis |
| Annonce de livraison | Livraison |
| Relance devis sans réponse | Relance |
| Relance commande en attente | Relance |
| Prise de contact initiale | Autre |

Variables disponibles dans les templates : `[Nom]` `[Référence]` `[Wilaya]` `[Agent]`

---

## Contenu site public (SiteContent)

| Clé | Valeur actuelle |
|-----|----------------|
| `hero_title` | Spécialiste du papier thermique professionnel |
| `hero_subtitle` | Rouleaux haute qualité BPA Free, livrés partout en Algérie. |
| `hero_cta` | Demander un devis |
| `about_title` | Qui sommes-nous ? |
| `about_text` | PSI (Paper Solutions Industry) est une entreprise algérienne... |
| `footer_tagline` | Spécialiste du papier thermique professionnel en Algérie |

---

## Notes internes clients

| Client | Auteur | Note |
|--------|--------|------|
| Ahmed Benali | Admin | Client fidèle, commande chaque fin de mois. Préfère WhatsApp. |
| Mohamed Ziani | Amira | Demande facture pro forma. Livraison Blida uniquement. |

---

## Relancer le seed

```bash
npx tsx prisma/seed.ts
```

⚠️ Le seed **efface tout** avant de réinsérer — ne pas lancer en prod.

## Voir la DB en live

```bash
npx prisma studio
```

Ouvre une interface web sur `http://localhost:5555` pour parcourir et modifier les données directement.
