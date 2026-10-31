# Guide du stock — à expliquer aux admins

Page **Stock** : 4 onglets. Voici ce que veut dire chaque colonne, en mots simples.

## Onglet « Produits finis » (les rouleaux prêts à vendre)

| Colonne | Ce que ça veut dire | Quand ça change |
|---|---|---|
| **Référence** | Le code du produit (ex. 80/80) et son nom (ex. PT-05). | |
| **Mode** | Acheté (on le commande chez un fournisseur), Fabriqué (on le produit chez nous) ou Les deux. | |
| **Disponible** | Les rouleaux prêts à vendre, **qui ne sont promis à personne**. Ça comprend aussi ceux qui sont chez les commerciaux. | Baisse quand une commande est **confirmée**. Monte à l'annulation d'une commande, à la production ou à un réapprovisionnement. |
| **Réservé** | Les rouleaux **mis de côté pour des commandes confirmées** qui ne sont pas encore livrées. | Monte quand on confirme une commande. Baisse quand on la **livre** (les rouleaux sortent) ou qu'on l'**annule** (ils retournent en Disponible). |
| **Total** | Disponible + Réservé. Tout ce qu'on a physiquement. | Calculé. |
| **Attribué** | Les rouleaux **confiés aux commerciaux** (ceux qu'ils ont dans leur voiture ou chez eux). | Monte quand on utilise « + Attribuer du stock ». Baisse quand le commercial **livre** une commande. |
| **Hors commerciaux** | Total − Attribué. Ce qui est **à l'entrepôt**, ou déjà promis à une commande. C'est le maximum qu'on peut encore attribuer. | Calculé. |
| **En retour** | Les colis revenus après une livraison. | Monte quand on signale un retour. Les remettre en Disponible se fait **à la main** (Gérer le stock → Correction). |
| **Statut** | Rupture (Disponible à 0), Stock faible (sous le seuil), En stock. Il ne regarde que le Disponible. | Calculé. |

Bouton **Gérer le stock** : « Réapprovisionner » ajoute du Disponible (et, pour un produit fabriqué, consomme la matière première de la recette). « Correction » remplace une valeur par un chiffre exact, sans rien recalculer autour : à utiliser pour corriger une erreur.

## Onglet « Matières premières » (le papier, les mandrins…)

| Colonne | Sens |
|---|---|
| **Disponible** | La matière libre en entrepôt. |
| **Réservé** | La matière mise de côté pour des fabrications prévues (commandes confirmées à produire). |
| **Total** | Disponible + Réservé. |
| **Statut** | Rupture / Stock faible (sous le seuil d'achat) / En stock. |

## Onglet « Réfs libres »

Les références **tapées à la main** dans une commande ou un devis, qui ne sont pas dans le catalogue. Mêmes colonnes que les produits finis (Disponible, Réservé, Total, En retour), plus **En livraison** (non automatique : à corriger à la main).

## Onglet « Stock par commercial »

La liste de l'équipe avec le nombre de rouleaux confiés à chacun. Un clic sur un nom affiche le détail par produit. Le bouton **Retirer** reprend du stock à un commercial (il retourne simplement « hors attribué », rien ne bouge dans le Disponible).

## L'interrupteur « RollLink » (en haut à droite)

RollLink est la plateforme sœur. Il est **encore en test** : une commande RollLink reçue est enregistrée « En attente » et **ne touche pas au vrai stock**.
- **Désactivé (par défaut)** : le stock est affiché **sans RollLink**, Total compris.
- **Activé = simulation** : on voit ce que deviendrait le stock **si les commandes RollLink en test étaient confirmées** (le Disponible passe en Réservé).
- Dans les deux cas, **rien n'est enregistré** : c'est un calcul à l'écran. Quand RollLink sera lancé pour de bon, ses commandes agiront sur le vrai stock.

## Ce qui se passe quand une commande change de statut

| Passage | Effet sur le stock |
|---|---|
| Création | Aucun. |
| **Confirmé** | Les rouleaux disponibles passent en **Réservé**. S'il en manque, la commande part en **liste d'achat** ou **liste de production**. |
| **Disponible** (« Marquer Disponible ») | Le manque est résolu : stock libre d'abord, puis réservé d'une commande plus récente, puis fabrication avec la matière déjà réservée. S'il manque encore, la commande est **bloquée** (on peut forcer, l'écart est alors assumé). |
| **Livré** | Le **Réservé baisse** de la quantité livrée. Si la commande est « Pris en charge par » un commercial qui détient ce produit, son stock **Attribué baisse** aussi, et les admins reçoivent une notification. |
| **Annulé** | Le Réservé **retourne en Disponible**. Une commande **déjà livrée** ne peut plus être annulée : utiliser « Retourné ». |
| **Retourné** | « En retour » augmente. La remise en Disponible est manuelle. |
| **Créée directement « Livrée »** (date de règlement passée) | Une fenêtre demande si on retire les produits du stock, avec le détail. |

## Règle simple pour se souvenir

**Disponible** = libre. **Réservé** = promis à un client. **Attribué** = chez un commercial. **Total** = Disponible + Réservé.

## Les notes sur les références (admins seulement)

- Sur la page Stock, un **crayon** apparaît à côté de « Gérer le stock » pour chaque référence (produits finis, matières premières, références libres). **Grisé** : aucune note. **Coloré avec un chiffre** : la référence a des notes.
- Un clic sur le crayon ouvre les notes de la référence : on les lit et on **en ajoute**. Chaque note garde son auteur et sa date. Les notes sont aussi visibles dans la fenêtre « Gérer le stock ».
- **Seuls les comptes Admin** les voient et en écrivent. Les comptes employés, même en lecture seule ou avec un libellé « Admin » (comme Sid Stiti), n'y ont pas accès.

## Les alertes de stock faible (admins)

- Quand une référence **passe sous son seuil**, tous les admins reçoivent une notification « Stock faible » ; quand elle **tombe à 0**, « Rupture de stock ». Ça marche pour les produits finis et les matières premières.
- L'alerte n'est envoyée **qu'une fois** par passage. Elle se réarme quand le stock remonte au-dessus du seuil.
- Les références jamais approvisionnées (à 0 depuis toujours) ne déclenchent aucune alerte.
