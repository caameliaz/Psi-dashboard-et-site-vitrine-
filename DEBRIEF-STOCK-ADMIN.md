# Debrief stock — à passer en revue avec l'admin de l'entreprise

Établi le 31 octobre 2026 à partir de la base de production, **en lecture seule** : rien n'a été modifié. Les valeurs d'origine sont dans `SAUVEGARDE-STOCK-2026-10-31.json`.

## 1. En résumé

- **4 produits sur 6 sont justes** d'après l'historique : ET-03, ET-04, PT-02, PT-04.
- **PT-05 (80/80)** est faux de +2306 : 2301 viennent d'une production du 6 octobre sans recette, liée aux commandes de test RollLink, et 5 de la même production.
- **PT-03 (57/50)** a 20 en Réservé que **rien n'explique**.
- Les matières premières sont justes.
- RollLink est en test : ses commandes ne touchent plus au stock (voir §8).

## 2. Les colonnes d'un produit fini

| Colonne | Sens |
|---|---|
| Disponible | prêt à vendre, promis à personne (comprend ce qui est chez les commerciaux) |
| Réservé | mis de côté pour des commandes confirmées pas encore livrées |
| Total | Disponible + Réservé |
| Attribué | confié à un commercial |
| Hors commerciaux | Total − Attribué |
| En retour | colis revenus (remise en stock à la main) |

## 3. Qui détient le Réservé ?

Il y a deux produits avec du Réservé.

**PT-05 (80/80) : 2306 en Réservé**

| Commande | Statut | Source | Créée le | Client | Quantité réservée |
|---|---|---|---|---|---|
| RL-2026-90012 | Confirmée | RollLink | 6 oct. | (aucun) | 150 |
| RL-2026-90013 | Confirmée | RollLink | 6 oct. | (aucun) | 150 |
| RL-2026-90014 | Disponible | RollLink | 6 oct. | (aucun) | **2001** |
| **Total commandes** | | | | | **2301** |
| **Écart non expliqué** | | | | | **5** |

**PT-03 (57/50) : 20 en Réservé.** **Aucune commande ne le détient.** Aucune entrée dans le journal non plus. La ligne de production de ce produit indique 40 « déjà produits » depuis le 15 septembre, avant le début du journal : c'est la seule piste.

## 4. Historique par produit (de quoi retrouver le Total)

**PT-05 (80/80) : attendu 168**

| Date | Événement | Quantité |
|---|---|---|
| 6 oct. | « Production réalisée » **sans recette** (pour les commandes RollLink de test) | +2301 ⚠️ fictif |
| 14 oct. | Production | +334 |
| 14 oct. | Production | +578 |
| 17 oct. | Livrée CMD-16-0063 (Nour el Hani, commercial Radja Djenadi) | −480 |
| 23 oct. | Vente CMD-Be-0001 (supérette Abderaouf, Karim), créée directement livrée, corrigée à la main le 26 | −48 |
| 29 oct. | Livrée CMD-16-0068 (Ets El Achir / Abderrezak, Radja Djenadi) | −192 |
| 29 oct. | Livrée CMD-16-0069 (Brothers fast-food, Karim) | −48 |
| 29 oct. | Production | +24 |
| | **Total hors production fictive** | **168** |

**PT-02 (57/40) : attendu 920** : 14 oct. +912 ; 17 oct. CMD-16-0063 −100 ; 20 oct. CMD-16-0066 (aéroport, Karim, créée directement livrée, corrigée le 26) −60 ; 29 oct. +104 et +64. La vente du 29 sept. CMD-16-0058 (supérette Kamer, 14 rouleaux) avait été « forcée » sans stock : elle ne retire rien.

**PT-04 (80/60) : attendu 530** : 14 oct. +460 ; 29 oct. +70. Aucune vente depuis.

**ET-03 (20/40) : 86** et **ET-04 (35/45) : 75** : achetés le 14 octobre (+86 et +75), aucune vente depuis.

Depuis le 14 octobre, **seules deux ventes livrées n'ont pas retiré de stock** (CMD-16-0066 et CMD-Be-0001) et **les deux ont été corrigées à la main le 26 octobre**. Les anciennes ventes (96 commandes de PT-05 entre avril et octobre, etc.) datent d'avant le suivi du stock et n'ont rien à retirer.

## 5. Stock confié aux commerciaux (onglet « Stock par commercial »)

ZINOU, attribué le 29 octobre : 4 × ET-03, 5 × ET-04, 24 × PT-02, 48 × PT-05 = **81 unités**. Aucune vente livrée n'est encore rattachée à ZINOU.

## 6. Besoins ouverts (listes de production et d'achat)

| Liste | Produit | Besoin | Cause |
|---|---|---|---|
| Production | 80/75 (PT-07) | 200 | les commandes RollLink de test RL-2026-90012 et 90013 (100 chacune) |
| Production | 57/50 (PT-03) | 1 | la commande RollLink de test RL-2026-90019 |
| Production | PT-01, PT-07, PT-03, 80/40 | rattrapage de 140 chacun | stock à 0, sous le seuil de 70 : « refaire le plein » |
| Achat | 100/150-2 (ET-01-300) | rattrapage de 140 | même raison |
| Achat | ligne sans produit rattaché (matière) | 140 | ouverte depuis le 16 septembre, à vérifier |

Commande normale en cours : **CMD-16-0067** (Superette Boutiche, commercial ZINOU), En attente, 4 × ET-03 et 1 × ET-04, rien de réservé.

## 7. Questions pour l'admin

1. Les **2301 rouleaux de 80/80 « produits » le 6 octobre** étaient-ils un test RollLink sans vraie production ? C'est ce qui explique PT-05.
2. Peut-on annuler les 4 commandes RollLink de test (RL-2026-90012, 90013, 90014, 90019) ?
3. PT-05 : confirmer **168 rouleaux** en entrepôt (dont 48 chez ZINOU), et si les **5** en trop sont à retirer.
4. PT-03 (57/50) : y a-t-il **20 rouleaux** physiquement ? Si oui, ils iront en Disponible ; sinon ils sont retirés.
5. Confirmer les quantités de ZINOU (81 unités) et les mandrins et papiers : 4500 / 3333 / 486,75 kg / 593,99 kg.

## 8. Ce qui est déjà en place dans l'application

- **RollLink en mode test** : une commande RollLink est enregistrée « En attente » et ne réserve rien, ne crée aucun besoin de production ou d'achat. Elle reçoit en réponse le résultat **simulé** (en stock / production / achat), sans écriture. Au lancement officiel : variable `ROLLLINK_AFFECTE_STOCK=oui`.
- **Interrupteur RollLink** sur la page Stock, désactivé par défaut : désactivé, tout ce qui vient de RollLink est ignoré (PT-05 : 168 / 5 / 173) ; activé = simulation, sans rien écrire.
- **Livraison suivie par commercial** : à la livraison, le stock du commercial « Pris en charge par » baisse et les admins reçoivent une notification.
- **Fenêtre de confirmation** quand une vente est créée directement livrée : « j'enlève X du stock ? ».
- Une livraison rejouée ne retire plus deux fois le Réservé, et une commande livrée ne peut plus être annulée.

## 9. Corrections prévues, après accord de l'admin

1. PT-05 : **Réservé 2306 → 0** (le Disponible reste à 168).
2. Annuler les 4 commandes RollLink de test : comme le Réservé est déjà à 0, rien ne remonte en Disponible. Ça supprime les besoins fantômes de §6.
3. PT-03 : Réservé 20 → 0 et, **si** les rouleaux existent, Disponible 0 → 20.

Chaque correction se fait dans « Gérer le stock → Correction » et se défait avec la sauvegarde.

## 10. Mise à jour du 31 octobre (soir)

- **PT-03 (57/50) corrigé en base** à la demande de la propriétaire : Réservé 20 → 0 et Disponible 0 → 20. Aucune commande ne réservait ces 20 rouleaux. La ligne est tracée dans l'historique (« Correction manuelle stock (réservé fantôme) »). **Les 20 rouleaux restent à vérifier à l'entrepôt.** Valeurs d'avant : `SAUVEGARDE-STOCK-2026-10-31.json`.
- **Listes d'achat et de production** : avec l'interrupteur RollLink **désactivé** (par défaut), les besoins venus de commandes RollLink de test n'apparaissent plus (80/75 : besoin de 200 retiré ; 57/50 : besoin de 1 retiré). Activé, ils réapparaissent. Affichage seulement.
- Le rattrapage de 140 de `57/50` sera recalculé par l'application (120 maintenant que 20 sont en Disponible) à la prochaine action sur ce produit.
- Précision : la ligne d'achat « sans produit » de 140 est en fait la matière **80MM** (mandrins), liée aux rattrapages de production, pas à RollLink.
