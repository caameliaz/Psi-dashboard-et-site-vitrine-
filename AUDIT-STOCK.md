# Audit du stock — ce que fait chaque colonne et chaque statut

Audit fait le 31 octobre 2026, à partir du code (`src/lib/order-stock.ts`, routes `/api/stock/*` et `/api/orders|quotes/[id]`) et des vraies données (lecture seule, rien modifié en base).

## 1. Les colonnes de la page Stock (produits finis)

| Colonne | Ce que c'est | Comment ça bouge |
|---|---|---|
| **Disponible** | Prêt à vendre, rattaché à aucune commande. **Inclut** ce qui est chez les commerciaux (l'attribuer ne le fait pas baisser). | Baisse quand une commande est confirmée (passe en Réservé). Monte à l'annulation, au restock, à la production. |
| **Réservé** | Mis de côté pour des commandes/devis **confirmés** pas encore livrés. | Monte à la confirmation. Baisse à la livraison (sort du stock) ou à l'annulation (retourne en Disponible). |
| **Total** | Disponible + Réservé = tout le stock physique. | Calculé. |
| **Attribué** (nouvelle colonne) | Somme de ce qui est confié aux commerciaux. | Monte à l'attribution. Baisse quand le commercial livre (corrigé, voir §3) ou au « Retirer ». |
| **Hors commerciaux** | Total − Attribué : ce qui est à l'entrepôt ou engagé sur une commande. C'est le plafond de ce qu'on peut encore attribuer. | Calculé. |
| **En retour** | Colis revenus après livraison. | Monte au statut « Retourné ». La remise en stock se fait **à la main** (Correction). |
| **Statut** | Rupture si Disponible = 0 ; Stock faible si ≤ seuil ; sinon En stock. | Calculé sur Disponible seulement. |

Sur ta capture « 2000 » : c'est `80/80 (PT-05)` qui a **2306 en Réservé**. Cela vient de 3 commandes **RollLink** sans client (RL-2026-90012, 90013 : 150 chacune ; RL-2026-90014 : **2001** rouleaux, statut Disponible). Ce sont très probablement des commandes de test. Comme « Réservé » compte dans « Hors commerciaux », la liste « Attribuer du stock » affichait **2426 disponible(s)** pour ce produit, alors qu'il n'y a que 168 de réellement libres. Le libellé dit maintenant « attribuable(s) (dont X réservé(s) pour des commandes) ».

## 2. Ce que fait chaque changement de statut sur le stock

| Passage | Effet sur le stock |
|---|---|
| **Création** (En attente) | Rien. Aucune réservation. (Exception : une vente créée directement « Livrée » avec une date de paiement passée ne touche pas au stock.) |
| **En attente → Confirmé** | Le disponible est pris : Disponible → Réservé. Le manque part en liste d'**achat** (produit acheté) ou de **production** (produit fabriqué, matière réservée si dispo). Si tout est couvert, la commande passe seule en « Disponible ». |
| **Confirmé → Disponible** (« Marquer Disponible ») | Résout le manque : d'abord le disponible, puis le réservé d'une autre commande plus récente, puis fabrication immédiate avec la matière déjà réservée. S'il manque encore : blocage (409), sauf « forcer » qui accepte l'écart sans inventer de stock. |
| **Disponible → Livré** | Le Réservé baisse de la quantité livrée (jamais en dessous de 0). Le stock du **commercial responsable** baisse aussi, et les admins reçoivent une notification (voir §3). |
| **→ Annulé** (depuis En attente, Confirmé ou Disponible) | Réservé → Disponible pour ce qui était résolu, matière de production relâchée, surplus proposé aux autres commandes en attente (FIFO). Les lignes d'achat/production sont recalculées. Une matière **déjà consommée** par une fabrication n'est jamais récupérée. |
| **Livré → Retourné** | « En retour » augmente de la quantité. Rien ne retourne en Disponible automatiquement. |
| **Annulé → En attente** (« Restaurer ») | Rien n'est réservé. Il faut refaire « Confirmer ». |
| **Modification des quantités** d'une commande confirmée | Hausse : reprend le disponible, sinon repart en achat/production. Baisse : l'excédent retourne en Disponible et est réaffecté aux autres. |
| **Modification d'une commande déjà livrée** (admin) | Le stock n'est ajusté que si la case « ajuster le stock » est cochée. |

## 3. Suivi du stock par commercial : ce qui ne marchait pas, et ce qui est corrigé

**Avant** : quand une commande était livrée, le stock du commercial ne baissait **que si** la case « Attribuer automatiquement au commercial » était cochée sur cette commande. Un commercial à qui on avait attribué du stock à la main (cas de ZINOU : 81 unités le 29 octobre) gardait donc un stock inchangé après ses ventes. Aucune notification n'existait.

**Maintenant** (`deliverStock`) : à la livraison, le stock détenu par le commercial **« Pris en charge par »** baisse de la quantité livrée, même sans la case. S'il a vendu plus que ce qu'il détenait, il tombe à 0 et l'écart est signalé. Les **admins** reçoivent la notification « Stock commercial mis à jour » : « Younes a vendu — commande XXX (client). PT-05 : −12 (reste 36) ». Elle n'est envoyée que si le commercial détenait ce produit (pas de bruit pour les ventes classiques).

Pour que ça marche pour Younes : (1) lui attribuer du stock (onglet Stock par commercial), (2) mettre Younes en « Pris en charge par » sur sa commande, (3) la livrer.

## 4. Défauts corrigés dans le code

1. **Statut renvoyé deux fois** (double clic, deux personnes) : « Livré » retirait **deux fois** le Réservé du produit, ce qui volait le réservé des autres commandes. Les effets sur le stock ne se rejouent plus que si le statut **change** vraiment (commandes et devis).
2. **Annuler une commande déjà livrée ou retournée** (possible en appelant directement l'API) remettait du stock **fantôme** en Disponible. C'est maintenant refusé (409) : pour un retour, utiliser « Retourné ».
3. Libellés de la liste « Attribuer du stock », colonne **Attribué** et infobulles sur chaque en-tête de colonne (voir §1).

## 4bis. Ajouts du 31 octobre (soir)

- **Interrupteur « RollLink »** en haut de la page Stock (ordinateur et mobile), **désactivé par défaut** (RollLink est encore en test). **Désactivé** : tout ce qui vient de RollLink est ignoré, Total compris (ce que RollLink a pris au stock libre retourne en Disponible ; ce qui a été fabriqué pour ses commandes sort du Réservé et du Total). **Activé = simulation** : les commandes RollLink reçues en mode test sont comptées comme si elles étaient confirmées (le Disponible passe en Réservé, dans la limite de ce qui existe). Le calcul se fait **à l'écran seulement** : rien n'est écrit en base, et « Gérer le stock » montre toujours les vraies valeurs. Quand RollLink sera lancé pour de bon (variable `ROLLLINK_AFFECTE_STOCK=oui`), ses commandes agiront sur le vrai stock.
- **Mode test RollLink** : par défaut, une commande reçue de RollLink est enregistrée « En attente » et **ne touche pas au stock** (aucune réservation, aucune liste d'achat/production, aucune matière réservée).
- **Vente créée directement « Livrée »** (date de règlement passée) : une fenêtre demande maintenant « toucher au stock ? » avec le détail ligne par ligne (« j'enlève 150 du stock · 168 → 18 »). « Oui » retire la quantité du Disponible (plafonné à ce qui existe, l'écart est signalé), « Non » n'y touche pas. Le choix est écrit dans l'historique de la commande. Les références libres (hors catalogue) ne sont pas concernées.
- Colonne renommée **Attribué** (avant « Chez commerciaux »).

## 5. Ce que j'ai vu en base et que je n'ai PAS touché (décisions pour toi)

- **Réservé qui ne correspond à aucune commande** : `80/80` a 2306 en Réservé mais les commandes actives n'en justifient que 2301 (+5). `57/50` a **20** en Réservé alors qu'aucune commande n'en réserve (+20). Sans doute une correction manuelle ou un ancien bug. Corrigeable par « Gérer le stock → Correction → Réservé ».
- **PT-05 (80/80) : total de 2474 rouleaux** alors que les entrées de stock enregistrées pour ce produit (+578, +24…) sont bien plus petites. Les 2001 de RL-2026-90014 sont probablement du stock **qui n'existe pas physiquement**. À vérifier par un comptage, puis corriger.
- **4 commandes RollLink de test** (RL-2026-90012, 90013, 90014, 90019, sans client, créées en octobre) bloquent du réservé et gonflent les listes de production. Si ce sont des tests, les annuler fait retomber les chiffres. Je ne l'ai pas fait.
- **Auto-attribution** : quand la case est cochée, elle crédite le commercial aussi avec du stock **réservé** (pas seulement du libre). C'est voulu par le design actuel, mais ça explique que « Attribué » puisse dépasser le Disponible.
- **« Contacté »** existe en base mais aucun bouton ne le propose et il n'a aucun effet sur le stock.
- **Aucune validation côté serveur des enchaînements de statuts** : l'écran n'offre que les passages logiques, mais l'API accepte n'importe lequel (ex. En attente → Livré directement, qui ne touche pas au stock). Je n'ai verrouillé que l'annulation d'une commande livrée.

## 6. Reconstitution du stock à partir de l'historique (31 octobre, lecture seule)

Méthode : départ à 0 (valeur par défaut des colonnes), + entrées du journal (productions, réapprovisionnements), + corrections manuelles du journal, − quantités livrées. Comparé au stock enregistré (Disponible + Réservé).

| Produit | Attendu d'après l'historique | Enregistré | Écart |
|---|---|---|---|
| ET-03 (20/40) | 86 | 86 | 0 |
| ET-04 (35/45) | 75 | 75 | 0 |
| PT-02 (57/40) | 920 (906 + 14 « forcés » jamais réservés) | 920 | 0 |
| PT-04 (80/60) | 530 | 530 | 0 |
| **PT-05 (80/80)** | **168** (3237 produits − 48 correction − 720 livrés − 2301 « fantôme ») | 2474 | **+2306** |
| **PT-03 (57/50)** | **0** d'après le journal | 20 (en Réservé) | **+20** |

- **PT-05** : le 6 octobre, « Production réalisée (+2301) 80/80 » a été enregistrée **sans recette** (la recette de 80/80 est vide ; les matières premières ne sont d'ailleurs pas touchées : leurs valeurs sont celles des entrées du 14 octobre). Elle correspond exactement aux commandes RollLink de test (150 + 150 + 2001). Le reste, 5, vient de la même production (la ligne de production indique 2306 produits). Stock réel probable : **Disponible 168**.
- **PT-03** : 20 en Réservé sans commande ni entrée dans le journal. Origine inconnue (test ou saisie ancienne) : **à confirmer physiquement**.
- Les matières premières ne sont pas faussées par cette production.

## 7. Listes d'achat et de production et RollLink

Les deux listes suivent l'interrupteur RollLink de la page Stock : **désactivé (par défaut)**, les besoins venant de commandes RollLink (en test) sont retirés des lignes, et une ligne qui n'existait que pour RollLink disparaît ; **activé**, ils sont montrés. Le tableau de bord, qui n'a pas d'interrupteur, ne les montre pas. Affichage seulement (paramètre `?rollink=1` des routes `/api/production-list` et `/api/purchase-list`).

PT-03 (57/50) a été corrigé en base le 31 octobre : Réservé 20 → 0, Disponible 0 → 20 (voir DEBRIEF-STOCK-ADMIN.md §10).
