# TODO — Factures, bons de livraison (BL) et proformas automatiques

Statut (12 nov. 2026) : **étapes 0 à 4 codées** (base, réglages, BL, facture, proforma, page Documents, lien public, e-mail). Deux migrations appliquées sur la base du `.env` : `20261112120000_documents_bl_facture` et `20261113090000_document_share_token` — **à rejouer en production**. Reste : vérifier à l'écran (voir « Vérifications ») et les points de la section 6.
Documents de référence (à la racine) : `F021-2026 Moon Mobil.pdf` / `.xlsx` (facture + classeur Excel actuel), `BL 016-2026 Assiloucom.pdf` (bon de livraison).

---

## 1. Objectif

Imprimer, envoyer et exporter depuis une commande une **facture**, un **bon de livraison (BL)** et une **proforma** identiques aux documents actuels de PSI, sans les retaper à la main dans Excel.
Même principe que les étiquettes : un modèle fidèle, rempli avec les données de la commande, imprimé en un clic (aussi en lot depuis la liste).
**Les modèles sont modifiables par les admins** dans Réglages → Documents (voir 5.1).

## 2. Ce qu'on a vu dans les documents

### Facture (ex. F 021/2026)
- Logo PSI couleur, titre « FACTURE », filet noir.
- Bloc à droite : N° Facture, Date Facture, Échéance de règlement (vide), Mode de règlement (« Virement/Chèque »).
- Deux cadres : **Entreprise** (PSI : adresse, tél, RC, NIF, NIS, RIB) et **Client** (nom, adresse, RC, NIF, NIS, **AI**).
- « Commande du jj/mm/aaaa ».
- Tableau : Références · Désignation (4 lignes : « Rouleau papier thermique blanc / Grammage papier : 55 gr/m² / Origine papier Europe (Germany) / Mandrin en plastique ») · Laize (mm) · Métrage (m) · Quantité (nbre rouleaux) · PU HT · Montant HT.
- Totaux : TOTAL HT, TVA 19 %, TOTAL TTC.
- Cadre « Arrêtée la présente facture à la somme de : … Dinars Algérien et XX Centimes » → **montant en toutes lettres** (à générer).
- Pied de page : raison sociale, RC, NIF, NIS, RIB, adresse, tél.

### Bon de livraison (ex. BL016-2026)
- Logo, titre « BON DE LIVRAISON », N° BL, Date.
- Cadres **Fournisseur** (PSI) et **Client** (nom, adresse). Pas de RC/NIF du client.
- « Commande du jj/mm/aaaa ».
- Tableau : Références (ex. PT-06) · Désignation · Laize (mm) (ex. « 57/41 metres ») · Quantité (nbre rlx) · **Observation** (ex. « 100 Cartons de 30 rouleaux »). **Aucun prix.**
- Anciens BL : « Date de livraison » et « Lieu de livraison » sous le tableau.
- « Signature et cachet du Client » (gauche) / « Fournisseur » (droite). Pied de page avec les mentions légales.

### Dans le classeur Excel actuel
- Un classeur par client, **une feuille par BL et par facture**, retapées à la main.
- Facture et BL ont chacun leur compteur actuel (facture 021, BL 016 ; Camélia pense que le dernier BL est le 22).
- **Une facture peut regrouper plusieurs BL** : la F 013/2026 additionne 3200 + 640 rouleaux (BL 013 et BL 013 bis).

## 3. Ce qui manque dans le site aujourd'hui

- **Fiche client** : pas de champs **RC, NIF, NIS, AI**.
- **Infos PSI** (RC, NIF, NIS, RIB, adresse) : à mettre dans Réglages → Documents.
- **N° de facture** : champ texte saisi à la main → remplacer par une numérotation automatique (modifiable par les admins).
- **N° de BL** : n'existe pas.
- **Montant en lettres** : à coder (français, dinars + centimes).
- **Contenu des cartons** (Observation du BL) : pas stocké.
- **PDF** : décision = **ce qui existe déjà** (aucune librairie) : fenêtre d'impression du navigateur → « Enregistrer en PDF », comme les étiquettes (`src/lib/label-print.ts`), la fiche client et le PDF du dashboard. Conséquence : on ne peut pas générer un PDF à joindre automatiquement à un mail (voir 6).
- **Excel** : `xlsx-js-style` est déjà dans le projet (et `docx` pour Word) → pas de nouvelle dépendance.
- **Envoi par mail** : `sendEmail()` existe déjà (`src/lib/email/send.ts`, pièces jointes possibles). Expéditeur = **Contact@psi.dz**, le même que celui des récaps (via Brevo, cf. commentaires de `send.ts`) → rien à changer.
- **TVA** : le site a déjà un interrupteur TVA 19 % ; à relier aux totaux de la facture.

## 4. Décisions de l'entreprise (reçues le 12 nov. 2026)

### Numérotation
| Sujet | Décision |
|---|---|
| Facture | Format **« F 021/2026 »** (le premier format), compteur **par année** (repart à 1), numéros qui se suivent. **Modifiable par les admins.** |
| BL | Le numéro **essaie de coïncider avec la facture** (BL 1 ↔ F 1). **Modifiable par les admins.** Compteur de départ réglable. |
| « Bis » | Quand un client veut un BL avant la facture / plusieurs BL pour une même facture : le BL s'appelle « bis ». L'app **propose** le nom (ex. BL 13 bis) et l'utilisateur peut le changer. |
| Proforma | Les devis sont des proformas, numérotées **FP-xx-2026**, compteur propre. |
| Compteurs | Les derniers numéros ne sont pas certains (facture : F 021 vu ; BL : peut-être 22) → **compteurs modifiables dans Réglages → Documents** : on saisit le dernier numéro utilisé, les **numéros suivants se recalculent à partir de là** (les documents déjà émis ne changent pas ; alerte si un numéro existe déjà). |

### Règles de gestion
| Sujet | Décision |
|---|---|
| Ordre | **BL d'abord**, facture ensuite. |
| Facture sans BL | **Non.** On peut **livrer sans facture** (la facture vient après). |
| Regroupement | **Oui** : sélectionner plusieurs BL du même client puis « Regrouper en facture ». |
| Qui émet / modifie une facture | **Les admins**, y compris après émission (avec historique des modifications). Remplace l'ancienne idée « figée + avoir ». |
| Envoi au client | **Par mail, avec aperçu d'abord** (destinataire, objet, texte, PDF joint) ; rien ne part avant le clic sur « Envoyer ». |
| Échéance de règlement | **Facultative**, selon les clients. |
| Mode de règlement | Lié à la facture, modifiable. **Espèces → timbre calculé selon un palier de montant** (pas un taux fixe) : **tableau de paliers modifiable** par les admins dans Réglages → Documents. |
| TVA | **Toujours 19 %.** |
| Infos client (RC, NIF, NIS, AI) | Le client les envoie, les admins les saisissent ; **pop-up** si elles manquent à la génération (et enregistrement sur la fiche client). |

### Contenu des documents
| Sujet | Décision |
|---|---|
| QR sur le BL | **Oui par défaut**, désactivable (modèle + à chaque impression). |
| Références | Réf du site et code interne (PT-xx) **liés mais modifiables** sur le document. |
| Désignation | **Par catégorie**, modifiable (et par produit si besoin). |
| Date et lieu de livraison | Gardés. Observation (cartons) modifiable. |
| Adresse / nom de PSI | Modifiables dans Réglages → Documents. |
| Logo | Inchangé. |
| Format de sortie | **PDF ou Excel au choix.** |
| Papier médical | On ne touche à rien. |

## 5. Plan de réalisation

### 5.1 Principe des modèles modifiables (Réglages → Documents)
- Nouvelle page **Réglages → Documents**, **réservée aux admins**.
- Un modèle par type : **BL, Facture, Proforma**.
- Par modèle : activer/désactiver chaque **bloc** (QR, cadre Client, observation, date et lieu de livraison, signatures, pied de page…), modifier **tous les textes et titres**, **renommer / masquer / ajouter des colonnes** du tableau, **ajouter des champs personnalisés** (libellé + valeur par défaut, ex. « N° bon de commande client »).
- **Mentions légales non verrouillées** : les admins peuvent les ajuster depuis les modèles (mêmes droits que le reste).
- La **mise en page reste fixe** (fidèle aux PDF actuels) : pas d'éditeur libre par glisser-déposer.
- **Aperçu en direct** + bouton « Revenir au modèle d'origine ».
- **Un document émis garde une copie du modèle utilisé** : modifier un modèle plus tard ne change jamais les documents déjà émis.
- À l'impression : petite fenêtre (comme celle des étiquettes) : QR oui/non, PDF ou Excel, exemplaires ; reprend les choix du modèle, modifiables à chaque fois.
- Aussi dans cette page : **infos PSI** (raison sociale, adresse, tél, RC, NIF, NIS, RIB, pied de page), **désignation par catégorie**, **compteurs** (dernier n° de BL, de facture, de proforma : modifiables, les suivants se recalculent), **taux** (TVA 19 %) et **paliers du timbre** (de / à / taux, + minimum éventuel).

### Étape 0 — Base de données et moteur ✅ (12 nov. 2026)
- [x] Tables `DocumentTemplate`, `DocumentSettings`, `DocumentCounter`, `Document` ; colonnes client RC / NIF / NIS / AI ; `documentDesignation` sur catégorie et produit ; `DOCUMENT` ajouté à l'historique.
- [x] Compteurs par type et par année (`src/lib/documents/numbering.ts`) ; compteur facture 2026 initialisé à **22** (prochaine : F 023/2026).
- [x] Montant en toutes lettres (`amount-in-words.ts`), testé contre la F 021 ; timbre par paliers (`stamp-duty.ts`, valeurs à confirmer).
- [x] Modèles et réglages par défaut repris des PDF (`defaults.ts`, `types.ts`).
- [x] Moteur de rendu unique (modèle + données → HTML A4 / Excel) : `render.ts`, `excel.ts`.
- [x] PDF : fenêtre d'impression existante (aucune librairie). Excel : `xlsx-js-style` déjà présent.
- [x] Migrations ajoutées à la liste de `TODO.md` §0. [ ] **À rejouer en production** (`npx prisma migrate deploy`, puis compteur facture 2026 = 22).

### Étape 1 — Page Réglages → Documents ✅
- [x] Page réservée aux admins, onglets BL / Facture / Proforma.
- [x] Interrupteurs de blocs, édition des textes, colonnes, champs personnalisés, aperçu, retour au modèle d'origine.
- [x] Infos PSI, désignation par catégorie, compteurs, taux.

### Étape 2 — Bon de livraison ✅
- [x] Modèle BL fidèle au PDF + QR de réception (même QR que l'étiquette).
- [x] Numéro proposé = celui de la future facture ; « bis » proposé quand le numéro est déjà pris ; modifiable.
- [x] Bouton « Imprimer le BL » dans le panneau d'une commande + impression en lot depuis la liste.
- [x] Saisie avant impression : observation (cartons), date / lieu de livraison, champs personnalisés.
- [x] Désignation construite depuis la catégorie/produit, références liées (réf site + code interne) modifiables.
- [x] État « à facturer » sur les BL pour retrouver ceux qui n'ont pas encore de facture.

### Étape 3 — Facture ✅
- [x] Champs client : RC, NIF, NIS, AI (fiche client + pop-up de saisie si manquants).
- [x] Création depuis un ou plusieurs BL ; **« Regrouper en facture »** (même client, lignes identiques additionnées, avertissement si prix différents ; un BL ne peut être que dans une facture).
- [x] Totaux HT / TVA 19 % / TTC, **timbre selon les paliers si espèces**, montant en lettres, échéance facultative.
- [x] Numérotation « F 021/2026 », par année, modifiable par les admins ; reprise des anciens numéros (F 001 à F 021…) pour éviter les doublons.
- [x] Facture modifiable par les admins après émission, avec historique (qui, quoi, quand).
- [x] Envoi par mail avec aperçu (destinataire, objet, texte, PDF joint), journal de l'envoi.
- [x] Export PDF ou Excel au choix.

### Étape 4 — Proforma ✅
- [x] Même moteur, numéro **FP-xx-2026**, compteur propre ; produits sur devis : prix saisi à la main.

### Vérifications
- [ ] Impression fidèle (comparaison avec les PDF d'origine), A4.
- [ ] Cas : plusieurs produits, beaucoup de lignes (2e page), espèces (timbre), client sans RC/NIF, regroupement de BL, « bis ».
- [ ] Modèle modifié → un ancien document émis ne bouge pas.
- [ ] Permissions : admins seulement (modèles, émission, modification).
- [ ] Migration rejouée en production ; commit/push **faits par toi** (Claude donne les commandes).

## 6. Points encore à confirmer
1. ✅ **Compteurs** : modifiables dans les réglages, les suivants se recalculent (dernier n° exact à vérifier avec l'admin au moment de les saisir).
2. **Paliers du timbre** : valeurs de départ à faire confirmer par l'admin/comptable (à ma connaissance : 1 % jusqu'à 300 000 DA, 1,5 % de 300 000 à 30 millions, 2 % au-delà, minimum 5 DA — **non vérifié**). Base de calcul : TTC ?
3. **Proforma devenue facture** : réponse « oui » ambiguë → à reposer : la facture a-t-elle son **propre numéro F xx/2026** (la proforma FP reste en référence) ?
4. ✅ **Adresse mail** : Contact@psi.dz, la même que les récaps.
5. ✅ **PDF** : l'existant (impression → « Enregistrer en PDF »). Conséquence : pas de PDF joint automatiquement au mail → proposer : lien sécurisé vers le document (comme la page de réception par QR) et/ou **Excel en pièce jointe**. À valider.

## 7. Où trouver quoi (code)
- Réglages : `/admin/settings/documents` (admins). Liste : `/admin/documents`. Création : section « Documents » du détail d'une commande/devis.
- Lien public envoyé par mail : `/d/[token]` (+ `/d/[token]/excel`). Mail : aperçu avant envoi, lien + Excel en pièce jointe (pas de PDF automatique : pas de librairie PDF).
- Code : `src/lib/documents/` (types, defaults, calc, numbering, render, excel, service), `src/components/documents/`, `src/app/api/documents/`.
- Droits : BL = toute personne qui voit les commandes ; facture, proforma, modèles, compteurs, modification, suppression, e-mail = admins.
- Règle des numéros : le compteur = plus grand numéro émis ; un 2e BL du même client encore « à facturer » prend « bis » ; la facture reprend le n° du BL si libre.
