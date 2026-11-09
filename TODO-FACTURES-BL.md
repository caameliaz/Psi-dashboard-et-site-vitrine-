# TODO — Factures et bons de livraison automatiques

Statut (9 nov. 2026) : **en attente des décisions de l'entreprise** (numérotation, nommage, règles). Rien n'est codé.
Documents de référence (à la racine) : `F021-2026 Moon Mobil.pdf` / `.xlsx` (facture + classeur Excel actuel), `BL 016-2026 Assiloucom.pdf` (bon de livraison).

---

## 1. Objectif

Imprimer directement, depuis une commande, une **facture** et un **bon de livraison (BL)** identiques aux documents actuels de PSI, sans les retaper à la main dans Excel.
Même principe que les étiquettes : un modèle fidèle, rempli avec les données de la commande, imprimé en un clic (aussi en lot depuis la liste).

## 2. Ce qu'on a vu dans les documents

### Facture (ex. F 021/2026)
- Logo PSI couleur, titre « FACTURE », filet noir.
- Bloc à droite : N° Facture, Date Facture, Échéance de règlement (vide), Mode de règlement (« Virement/Chèque »).
- Deux cadres : **Entreprise** (PSI : adresse, tél, RC, NIF, NIS, RIB) et **Client** (nom, adresse, RC, NIF, NIS, **AI**).
- « Commande du jj/mm/aaaa ».
- Tableau : Références · Désignation (4 lignes : « Rouleau papier thermique blanc / Grammage papier : 55 gr/m² / Origine papier Europe (Germany) / Mandrin en plastique ») · Laize (mm) · Métrage (m) · Quantité (nbre rouleaux) · PU HT · Montant HT.
- Totaux : TOTAL HT, TVA 19 %, TOTAL TTC (calculs simples : PU × quantité, HT × 19 %).
- Cadre « Arrêtée la présente facture à la somme de : … Dinars Algérien et XX Centimes » → **montant en toutes lettres** (à générer).
- Pied de page : raison sociale, RC, NIF, NIS, RIB, adresse, tél. **Pas de timbre fiscal** sur l'exemple.

### Bon de livraison (ex. BL016-2026)
- Logo, titre « BON DE LIVRAISON », N° BL, Date.
- Cadres **Fournisseur** (PSI) et **Client** (nom, adresse). Pas de RC/NIF du client.
- « Commande du jj/mm/aaaa ».
- Tableau : Références · Désignation · Laize (mm) · Quantité (nbre rlx) · **Observation** (ex. « 100 Cartons de 30 rouleaux », « 46 cartons de 64 rouleaux + 01 carton de 56 »). **Aucun prix.**
- Anciens BL : « Date de livraison » et « Lieu de livraison » sous le tableau.
- « Signature et cachet du Client » (gauche) / « Fournisseur » (droite). Pied de page avec les mentions légales.

### Dans le classeur Excel actuel
- Un classeur par client avec **une feuille par BL et par facture**, retapées à la main.
- Facture et BL ont **chacun leur compteur** (ex. facture 021, BL 016 : pas les mêmes numéros).
- **Une facture peut regrouper plusieurs BL** : la F 013/2026 additionne 3200 + 640 rouleaux (BL 013 et BL 013 bis).
- Variantes de BL : « BL006Bis-2026 », « BL 013 bis-2026 » (livraison complémentaire).

## 3. Ce qui manque dans le site aujourd'hui

- **Fiche client** : pas de champs **RC, NIF, NIS, AI** → à ajouter (une saisie par client).
- **Infos PSI** (RC, NIF, NIS, RIB, adresse) : fixes, à mettre dans un seul endroit (réglages ou constantes).
- **N° de facture** : champ texte saisi à la main sur la commande → à remplacer par une numérotation automatique.
- **N° de BL** : n'existe pas.
- **Montant en lettres** : à coder (français, dinars + centimes).
- **Nombre de cartons / rouleaux par carton** (Observation du BL) : pas stocké. Les colis des étiquettes (`labelCount`) donnent le nombre de cartons, pas le contenu de chacun.
- **Date / lieu de livraison** : à voir si on les garde.
- **TVA** : le site a déjà un interrupteur TVA 19 % (« montant saisi final ») ; à vérifier comment il s'articule avec HT/TTC de la facture.

## 4. Décisions déjà prises

| Sujet | Décision |
|---|---|
| Ordre | **BL d'abord**, facture ensuite |
| QR sur le BL | **Oui** (même QR « Valider la réception » que l'étiquette) |
| TVA | **19 %**, comme sur la facture |
| Timbre fiscal | **Non** (absent de l'exemple), sauf demande contraire de l'entreprise |
| Qui peut émettre une facture | **Admins seulement** pour l'instant — **à retravailler plus tard** (décision de l'entreprise) |
| Facture émise | Doit être **figée** (plus modifiable) ; correction par avoir — à confirmer |

## 5. Questions à poser à l'entreprise (leur logique)

### Numérotation et nommage
1. **Facture** : quel format exact ? (« F 021/2026 » sur la facture, « F006-2026 » dans l'import des ventes.) Le compteur repart-il à 001 chaque année ?
2. **BL** : quel format ? (« BL016-2026 », « BL 013-2026 », « BL006Bis-2026 » : lequel fait foi ?) Compteur séparé de la facture ?
3. **Derniers numéros utilisés** à ce jour (facture après F 021/2026 ; BL après BL 016-2026 ou plus récent) pour que le compteur démarre juste après.
4. Les « **bis** » : à quoi servent-ils exactement (livraison complémentaire du même BL) ? Faut-il les gérer ?
5. **Y a-t-il aussi** des devis / proformas numérotés (avec leur propre compteur) ?
   - Si oui : un exemple de **facture proforma** / de devis, le format du numéro, et sa durée de validité ?
   - Une proforma devient-elle la facture (même numéro) ou une facture à part ?
   - Les produits **sur devis** (papier médical, sans prix sur le site) : le prix est-il saisi à la main sur la commande/proforma au moment de la facture ?

### Règles de gestion
6. Une facture = **une commande**, ou plusieurs BL regroupés sur une seule facture (cas F 013) ?
7. Peut-on **facturer sans BL** (et livrer sans facture) ? Quel est l'ordre habituel : BL puis facture ?
8. Une facture émise peut-elle être **modifiée / annulée** ? Comment (avoir, nouvelle facture) ?
9. **Qui** peut émettre une facture / un BL (admins seulement, commerciaux aussi) ?
10. **Échéance de règlement** : toujours vide, ou parfois remplie ? Quelle règle ?
11. **Mode de règlement** : toujours « Virement/Chèque » ? Et en espèces (timbre fiscal à ajouter ?) ?
12. **TVA** : toujours 19 % ? Des clients exonérés ?

### Contenu des documents
13. **Références** (« PT-07 », « PT-06 ») : quelle est la source ? Réf produit du site (dans la base de test : « 57/30 », « PT-007 ») ou un code interne de famille ?
14. **Désignation** : le texte « Rouleau papier thermique blanc / Grammage 55 / Origine Europe (Germany) / Mandrin plastique » est-il le même pour tous les produits, ou dépend-il du produit ? (pour les autres produits : quel texte ?)
15. **Observation du BL** (cartons de 64 rouleaux, etc.) : comment est-elle déterminée ? Saisie à la main à chaque BL, ou calculée (quantité ÷ rouleaux par carton) ?
16. **Date et lieu de livraison** : à garder sur le BL ?
17. **Adresse de PSI** : « niveau M1 » (en-tête) ou « Niveau 5 » (pied de page) ? « Paper Solution**s** Industry » avec ou sans « s » (le BL a « Solution ») ?
18. **Logo** : le logo couleur actuel (celui des documents) à garder ?
19. Faut-il garder une **copie Excel** (export) en plus du PDF imprimé ?

## 6. Plan de réalisation (une fois les réponses reçues)

### Étape 1 — Bon de livraison
- [ ] Modèle BL fidèle au PDF (A4, logo, cadres, tableau, signatures, pied de page) + QR de réception
- [ ] Numérotation BL automatique par année (compteur de départ réglable)
- [ ] Bouton « Imprimer le BL » dans le panneau d'une commande + impression en lot depuis la liste
- [ ] Saisie facultative avant impression : observation (cartons), date / lieu de livraison
- [ ] Désignation construite à partir des champs du produit (grammage, origine, mandrin) avec saisie des valeurs manquantes

### Étape 2 — Facture
- [ ] Champs client : RC, NIF, NIS, AI (fiche client + formulaire)
- [ ] Infos PSI fixes (RC, NIF, NIS, RIB, adresse)
- [ ] Modèle facture fidèle au PDF + totaux HT / TVA 19 % / TTC
- [ ] Montant en toutes lettres (français, dinars + centimes)
- [ ] Numérotation facture automatique, sans trou, par année
- [ ] Facture figée après émission ; règle de correction (avoir) selon l'entreprise
- [ ] Bouton « Générer / Imprimer la facture » (admins) + lien avec le champ N° de facture existant
- [ ] Reprise des anciens numéros (F 001 à F 021…) pour ne pas créer de doublon

### Étape 3 — Devis / proforma (si l'entreprise en fait)
- [ ] Même moteur, numérotation propre

### Vérifications
- [ ] Impression fidèle (comparaison PDF d'origine / PDF généré), A4
- [ ] Cas : plusieurs produits, beaucoup de lignes (2e page), sans TVA, client sans RC/NIF
- [ ] Migration à rejouer en production
- [ ] Permissions (admins seulement pour l'instant)
