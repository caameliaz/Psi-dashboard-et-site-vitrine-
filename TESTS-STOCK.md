# Plan de test — Gestion du stock

Organisé par fonctionnalité. Pour chaque fonctionnalité : le comportement général attendu,
puis les cas critiques où ce comportement peut changer, avec pour chacun ce qu'on doit
observer (sans valeurs chiffrées d'exemple — utilisez les vôtres et comparez au comportement
décrit).

## Préparation

Prenez un produit **fabriqué** avec une recette (une seule matière suffit pour simplifier), et
si possible un second produit en mode **acheté**. Gardez en parallèle : la fiche produit/matière
(page Stock), la liste de production, la liste d'achat.

Avant de commencer une série de tests, notez toujours l'état de départ : disponible et réservé
du produit et de la matière, seuils, stock max, contenu des listes (idéalement vides ou stables
sur ce produit/matière avant de commencer).

Pour chaque étape qui échoue, notez les valeurs exactes observées — ça permet de retrouver
directement la fonction en cause dans le code.

---

## 1. Bouton "Produire" (marquer une ligne de production fabriquée)

Le buffer ne réserve JAMAIS de matière (c'est un simple chiffre indicatif de rattrapage
préventif, pas un engagement physique) — seul le besoin réel se réserve. La consommation à la
production suit un ordre précis, matière par matière : vérification globale d'abord sur toute
la recette, puis la part correspondant au besoin déjà reconnu de cette ligne vient de son propre
réservé, le surplus éventuel prend d'abord sur le disponible, et seulement s'il en manque encore
on pioche dans le réservé du pot commun (potentiellement destiné à d'autres lignes).

### 1.1 Matière disponible suffisante (cas normal)
- [ ] Une production partielle fait baisser le réservé de la ligne d'exactement la quantité
  produite — jamais plus, jamais moins — et ne touche pas le disponible.
- [ ] La ligne reste "À produire" tant qu'il reste du besoin ou du buffer ; elle ne passe
  "Produit" que lorsque les deux sont retombés à zéro.
- [ ] La commande liée reçoit sa part correspondante dans son suivi de résolution.

### 1.2 Matière réservée insuffisante pour cette ligne, mais dispo dans le pot commun d'une AUTRE commande
- [ ] Produire au-delà du réservé propre de la ligne va piocher dans le réservé du pot commun
  destiné à d'autres lignes/commandes sur la même matière.
- [ ] Les lignes ainsi privées de leur matière basculent "Bloquée" en priorité sur les plus
  RÉCENTES — les plus anciennes gardent leur matière intacte (FIFO par ancienneté réelle).
- [ ] Le manquant qui en résulte pour la ligne nouvellement bloquée remonte automatiquement dans
  la liste d'achat matière.

### 1.3 Matière totalement insuffisante (disponible + réservé ne suffit pas)
- [ ] Refus net : rien n'est modifié (ni le stock matière, ni la quantité déjà produite de la
  ligne), une erreur explicite est renvoyée.
- [ ] Recette à plusieurs matières, une seule insuffisante : refus net également, et TOUTES les
  autres matières de la recette (même largement suffisantes) restent rigoureusement inchangées —
  une seule matière manquante bloque toute la recette.

### 1.4 Production au-delà du besoin réel déjà réservé (surplus)
- [ ] La part correspondant au besoin réel déjà réservé vient du réservé de la ligne (consommée,
  jamais laissée orpheline).
- [ ] Le surplus (au-delà de ce besoin réel — buffer produit ou quantité forcée plus grande que
  prévu) vient du disponible, tant que personne d'autre n'attend cette matière.

### 1.5 Produit fabriqué sans AUCUNE recette enregistrée
- [ ] Cliquer "Produire" sans rien choisir n'exécute rien : un message explicite indique que le
  produit n'a pas de recette, avec deux choix — continuer sans elle, ou la saisir maintenant.
  Jamais de production silencieuse comme avant ce comportement.
- [ ] "Continuer sans recette" : comportement identique à l'ancien (aucune vérification ni
  consommation de matière première), mais choisi explicitement, jamais implicite.
- [ ] "Entrer la recette" ouvre l'overlay de saisie avec une case à cocher pour l'enregistrer.
  Après saisie, "Lancer la production" applique le circuit normal de vérification/consommation
  de matière (comme si le produit avait toujours eu cette recette), pas l'ancien passage libre.
- [ ] Case "Enregistrer" COCHÉE : la recette est aussi sauvegardée sur le produit (visible ensuite
  dans l'onglet Recettes) — une prochaine production sur ce produit ne redemande plus rien.
- [ ] Case "Enregistrer" DÉCOCHÉE : la recette saisie sert uniquement à cette production ; le
  produit reste sans recette enregistrée après coup (la prochaine production redemande).
- [ ] Dans les deux cas (case cochée ou non), le stock matière est bien vérifié et consommé selon
  la recette saisie — refus net si la matière saisie ne suffit pas, rien n'est produit.

---

## 2. Bouton "Commander" (liste d'achat matière / produit acheté)

### 2.1 Commande couvrant besoin réel + buffer
- [ ] Commander la totalité de la ligne (besoin + buffer) fait retomber la ligne à zéro sur les
  deux compteurs, passe son statut à "Commandé", et fige la quantité commandée.

### 2.2 Ce qui est déjà commandé compte comme "sécurisé"
- [ ] Après avoir passé une commande fournisseur qui couvre largement le besoin + le buffer
  actuels, la carte doit rester à besoin=0/buffer=0 tant que ce qui reste "en transit"
  (commandé moins déjà reçu) couvre toujours le total requis — même si le besoin ou le buffer
  sont recalculés entre-temps (annulation de la commande d'origine, nouvelle commande, etc.).
- [ ] Le statut reste "Commandé" jusqu'à réception, il n'est jamais supprimé automatiquement une
  fois la commande passée.

---

## 3. Bouton "Réceptionner"

### 3.1 Réception partielle (produit acheté avec commande client en attente)
- [ ] La distribution suit l'ordre FIFO : la commande client en attente la plus ancienne est
  comblée en priorité, le reliquat éventuel part dans le disponible du produit.

### 3.2 Passage au statut "Reçu" — condition stricte
- [ ] Réceptionner exactement le besoin réel (sans le buffer) ne fait PAS passer la ligne à
  "Reçu" tant qu'il reste du buffer à recevoir.
- [ ] Réceptionner le reste (le buffer) fait enfin passer la ligne à "Reçu".
- [ ] Piège à vérifier : une réception partielle minime ne doit JAMAIS faire passer la ligne à
  "Reçu" seulement parce que besoin et buffer retombent à zéro grâce à l'en-transit qui compte
  comme "couvert" — il faut EN PLUS que la quantité reçue égale la quantité commandée.

### 3.3 Badge "Urgent" vs statut d'attente de réception
- [ ] Le badge "Urgent" ne s'affiche que si (besoin + buffer) est positif ET que le stock
  physique est à zéro.
- [ ] Une ligne déjà "Commandé" qui n'attend plus que sa réception n'affiche jamais "Urgent" —
  elle affiche un sous-titre "en attente de réception" à la place.

### 3.4 Déblocage progressif d'une matière (FIFO), pas tout-ou-rien
- [ ] Avec plusieurs lignes de production "Bloquée" sur la même matière, réceptionner juste assez
  pour couvrir ENTIÈREMENT la plus ancienne la débloque seule ("À produire") ; les autres restent
  "Bloquée", inchangées.
- [ ] Compléter la réception débloque la suivante à son tour.
- [ ] Le FIFO se base sur la vraie commande d'origine, pas sur la date de (re)création de la
  ligne de production elle-même : une ligne qui "renaît" (annulée puis recréée) garde la
  priorité de la commande réelle qui est derrière, même si sa propre date est plus récente.

---

## 4. "Marquer commandes produites" (bouton "Marquer Produit", avant Livré)

Résout le manquant de chaque article, dans cet ordre strict, par produit : 1) disponible
produit, 2) réservé d'une autre commande/devis déjà active sur ce produit (la plus récemment
créée en premier), 3) — pour les produits fabriqués seulement — fabrication immédiate avec la
matière déjà réservée. S'il reste un manquant après ces trois étapes : blocage dur, aucune
modification, aucun moyen de forcer depuis ce bouton.

### 4.1 Disponible produit suffit à tout couvrir
- [ ] L'action réussit, le disponible bascule en réservé pour la commande concernée, celle-ci
  est entièrement résolue.
- [ ] Effet sur les AUTRES commandes en attente sur le même produit : elles restent strictement
  inchangées (résolution, statut, blocage) — l'action ne redistribue jamais aux autres commandes
  en attente, elle ne sert que celle qu'on force. Un témoin (autre produit/matière) reste
  également inchangé.

### 4.2 Vol chez une AUTRE commande active (déjà "Produite" OU simplement "Confirmée")
- [ ] Le donneur peut être n'importe quelle commande/devis encore active qui a déjà du réservé
  sur ce produit, pas seulement celles déjà "Produite" — toujours la plus récemment créée en
  premier.
- [ ] Si le donneur était "Produite" : il repasse "Confirmée", son manquant réapparaît
  normalement dans la liste de production/achat (jamais perdu silencieusement).
- [ ] Si le donneur était simplement "Confirmée" (jamais "Produite") : il perd sa couverture sans
  changement de statut (il n'y avait pas de statut à faire redescendre).
- [ ] Dans les deux cas, le réservé total du produit ne change pas (c'est un transfert interne
  entre commandes, pas une création ou destruction de stock).

### 4.3 Rien du tout nulle part → blocage dur
- [ ] Refus net (aucune commande "Produite" ou "Confirmée" à qui prendre, matière insuffisante
  pour fabriquer davantage) : la commande reste "Confirmée", rien n'est modifié (ni stock, ni
  statut), l'erreur détaille les produits/quantités manquants.

### 4.4 Produit fabriqué sans AUCUNE recette parmi les articles de la commande/du devis
- [ ] Une commande/un devis contenant un tel produit ne bascule JAMAIS "Disponible" tout seul
  (ni automatiquement, ni via "Marquer Disponible" sans intervention) — elle reste "Confirmée"
  tant que rien n'a été choisi pour ce produit.
- [ ] Cliquer "Marquer Disponible" affiche un message explicite ("ce produit n'a pas de recette")
  avec les mêmes deux choix qu'au §1.5 — continuer sans recette, ou la saisir maintenant (même
  overlay, même case "Enregistrer").
- [ ] "Continuer sans recette" : la commande passe "Disponible" sans aucune vérification/
  consommation de matière pour ce produit (écart assumé, choisi explicitement).
- [ ] "Entrer la recette" puis lancer : la commande passe "Disponible" en suivant le circuit
  normal de résolution (disponible → vol chez une autre commande → fabrication avec la matière),
  cette fois avec une vraie vérification de stock matière selon la recette saisie — refus si la
  matière ne suffit pas (comme un manquant normal, §4.3).
- [ ] Recette saisie mais NON enregistrée (case décochée) : le produit reste sans recette après
  coup — une prochaine commande sur ce même produit redemandera la même chose.

---

## 5. "Commandes concernées" (précision de l'affichage)

### 5.1 Commande jamais confirmée
- [ ] Une commande encore "En attente" (jamais confirmée) n'apparaît PAS dans "Commandes
  concernées" — elle n'a encore réservé ni consommé aucun stock.

### 5.2 Badge "Bloqué" — par commande, jamais par carte
- [ ] Avec plusieurs commandes en attente sur une même ligne à matière insuffisante pour toutes
  les couvrir, seules les commandes réellement non couvertes (les plus récentes, cf. §1.2)
  portent le badge "Bloqué" — les plus anciennes, couvertes, ne l'ont pas.
- [ ] Le statut "Bloqué" n'apparaît plus jamais au niveau de la carte/ligne elle-même (ni badge,
  ni sous-titre, ni ligne de statut globale) — uniquement par commande listée dans "Commandes
  concernées".

---

## 6. Modification de commande (changement de quantité)

### 6.1 Augmentation de quantité
- [ ] Le stock réservé (produit et/ou matière selon le mode) augmente en conséquence, la ligne
  de production/achat grossit du delta — jamais une deuxième ligne créée pour la même commande.

### 6.2 Réduction de quantité
- [ ] Le stock réservé relâché correspond exactement au delta réduit — jamais plus, jamais
  moins.

### 6.3 Ligne de production/achat liée non modifiable (déjà "Commandé" côté fournisseur)
- [ ] La nouvelle quantité s'enregistre quand même normalement sur la commande.
- [ ] Le stock et la ligne concernée doivent malgré tout suivre après coup (pas rester bloqués
  sur l'ancienne quantité une fois la ligne de nouveau modifiable, ou dès que le recalcul suivant
  s'exécute).

### 6.4 Réduction qui libère du stock pendant qu'une AUTRE commande attend sur le même
    produit/matière
- [ ] Le disponible libéré par la réduction n'est pas laissé "libre" : il doit être proposé en
  priorité à la commande en attente la PLUS ANCIENNE, automatiquement, sans action manuelle.
- [ ] La commande qui a été réduite garde sa propre résolution cohérente avec sa nouvelle
  quantité ; le reliquat non réaffecté (s'il y en a) reste un vrai disponible.

---

## 7. Annulation de commande

### 7.1 Annulation simple (aucune autre commande en attente sur le produit/la matière)
- [ ] Le stock réservé (et la matière associée le cas échéant) est intégralement relâché.

### 7.2 Annulation avec réaffectation automatique FIFO
- [ ] Si une autre commande en attente sur le même produit peut être comblée par le disponible
  qui vient d'être libéré, elle l'est automatiquement (règle FIFO : la plus ancienne d'abord).
- [ ] La matière associée à cette part n'est relâchée qu'UNE SEULE FOIS — pas de double
  relâchement quand la part libérée est immédiatement reprise par une autre commande.

### 7.3 Annulation d'une commande dont la matière/le produit est déjà commandé chez le
    fournisseur
- [ ] Ce qui a déjà été commandé au fournisseur reste "sécurisé" : la carte ne doit pas afficher
  de nouveau manquant trompeur si l'en-transit couvre toujours ce qui est réellement nécessaire
  après l'annulation (cf. §2.2).

---

## 8. Restock (réapprovisionnement manuel dédié)

### 8.1 Produit fabriqué, aucune commande en attente
- [ ] Le réapprovisionnement consomme directement la recette (fabrication immédiate) — la
  matière n'est jamais mise en réservé pour cette opération, elle est consommée sur le
  disponible tout de suite.

### 8.2 Produit fabriqué avec une commande déjà en attente sur ce produit
- [ ] La commande en attente est comblée en priorité (FIFO) avant que le reliquat n'alimente
  simplement le disponible/buffer.
- [ ] La matière qui était réservée pour la part de production désormais couverte directement
  n'est plus nécessaire : elle doit être relâchée d'autant, en une seule fois (pas de double
  comptage si le recalcul est déclenché plusieurs fois).

### 8.3 Matière première, avec une ligne de production "Bloquée" en attente
- [ ] La ligne se débloque ("À produire") dès que la matière apportée suffit à couvrir son
  besoin.
- [ ] La matière réservée pour cette ligne augmente d'exactement ce qui est nécessaire (jamais
  plus que besoin + buffer de la ligne) ; le reste part en disponible et alimente le nouveau
  buffer de la ligne d'achat matière, recalculé immédiatement.

---

## 9. Modification manuelle de stock (correction directe, hors commande/restock dédié)

### 9.1 Disponible produit — correction à la baisse
- [ ] Seul le buffer bouge : le besoin réel, lié aux commandes déjà réglées à leur confirmation,
  ne change jamais suite à une simple correction du disponible.

### 9.2 Disponible produit — correction à la hausse
- [ ] S'il y a une commande déjà en attente sur ce produit, elle est comblée en priorité (FIFO)
  avant que le reliquat ne compte comme buffer.
- [ ] La matière relâchée pour la part ainsi reprise ne l'est qu'UNE seule fois (pas de double
  comptage).

### 9.3 Disponible matière — correction à la hausse
- [ ] Une ligne de production "Bloquée" en attente sur cette matière se débloque, ou avance
  partiellement si l'apport ne suffit qu'à couvrir une partie du besoin manquant (cf. §3.4).

### 9.4 Réservé matière — correction (hausse ou baisse)
- [ ] Le besoin réel est recalculé immédiatement.
- [ ] À la baisse : les lignes de production "À produire" qui comptaient sur ce pot commun sont
  revérifiées — les plus RÉCENTES rebasculent "Bloquée" en premier (même logique FIFO inversée
  qu'en §1.2), le manquant qui en résulte remonte dans la liste d'achat matière.

### 9.5 Réservé produit — correction
- [ ] À la baisse : la couverture est reprise aux commandes/devis actifs concernés, les plus
  RÉCENTES perdent leur couverture en premier (les plus anciennes gardent la priorité) ; une
  ligne de production/achat apparaît avec le manquant résultant, et le statut des commandes
  ainsi découvertes redescend en conséquence.
- [ ] À la hausse : aucun effet — une hausse manuelle du réservé n'invente pas de commande
  supplémentaire à mieux couvrir.

### 9.6 Témoin (non-régression)
- [ ] Un autre produit/matière non concerné par la correction ne bouge jamais pendant ces
  actions.

---

## 10. Modification du seuil (seuil d'achat, seuil de production, stock max)

Ces champs ne pilotent QUE le buffer (rattrapage préventif) — jamais le besoin réel, qui ne
dépend que des commandes/devis actifs. Le recalcul du buffer est immédiat, dans les deux sens.

### 10.1 Seuil relevé au-dessus du disponible actuel
- [ ] Le buffer apparaît ou augmente immédiatement (sans qu'aucune autre action ne soit
  nécessaire pour déclencher le recalcul).

### 10.2 Seuil abaissé, ou stock max abaissé sous le disponible actuel
- [ ] Le buffer diminue en conséquence, sans jamais descendre sous zéro.

### 10.3 Modification sur un produit (fabriqué ou acheté)
- [ ] Les DEUX lignes concernées (production et achat) sont recalculées ensemble à partir de ce
  seul changement.

### 10.4 Modification sur une matière première
- [ ] Seul le buffer de la ligne d'achat de cette matière est recalculé — le besoin réel des
  lignes de production qui en dépendent, lui, ne bouge pas suite à ce changement seul.

### 10.5 Effet sur le statut des lignes
- [ ] Un changement de seuil ne fait jamais basculer une ligne entre "À produire" et "Bloquée" —
  seul le rapport entre besoin réel et matière réservée décide de ce statut, jamais le buffer.

---

## 11. Modification des recettes

### 11.1 Changement de ratio d'une matière dans une recette
- [ ] Le besoin réel en matière de TOUS les produits utilisant cette matière est réconcilié à
  neuf, en FIFO par vraie commande d'origine (pas par date de la ligne de production) — pas
  seulement le produit dont la recette vient de changer.

### 11.2 Le nouveau total dépasse le stock disponible + réservé de la matière
- [ ] La ligne de production dont la vraie commande est la plus ancienne reste/passe "À
  produire" en priorité ; une ligne plus récente peut être rétrogradée "Bloquée" même si elle ne
  l'était pas avant le changement.

### 11.3 Suppression complète d'une matière de la recette d'un produit
- [ ] La part de cette matière due à ce produit retombe à zéro ; la ligne d'achat de la matière
  est recalculée sans lui ; les autres produits utilisant encore cette matière reprennent leur
  part normalement (aucun effet de bord sur eux).

### 11.4 Recalcul immédiat
- [ ] La liste d'achat de la matière concernée est recalculée immédiatement après le changement
  de recette — aucune autre action nécessaire pour déclencher le recalcul.

---

## 12. Stock commercial (attribution) — bonus, hors liste initiale

L'attribution à un commercial ne touche jamais directement le disponible/réservé du produit :
seule l'attribution elle-même bouge. La colonne "Hors commerciaux" (disponible + réservé moins
la somme déjà attribuée) sert toujours de plafond pour une nouvelle attribution, jamais le
disponible seul.

### 12.1 Attribution manuelle
- [ ] Un produit n'apparaît dans la modale d'attribution que si son stock hors commerciaux est
  positif, et la quantité saisie est plafonnée à cette valeur.
- [ ] Attribuer la totalité du stock hors commerciaux d'un produit ne change ni son disponible ni
  son réservé — seule la colonne "Hors commerciaux" retombe à zéro.
- [ ] Toute tentative d'attribuer au-delà de ce qui reste hors commerciaux est refusée avec un
  message explicite, rien n'est modifié.

### 12.2 Retrait d'attribution
- [ ] Retirer une partie de l'attribution d'un commercial remet la quantité correspondante en
  circulation dans "Hors commerciaux", sans toucher au disponible/réservé.
- [ ] Un retrait total supprime la ligne d'attribution (pas de ligne à zéro qui traîne).

### 12.3 Auto-attribution au commercial assigné à la commande
- [ ] La case d'auto-attribution n'est activable que si un commercial est déjà assigné à la
  commande, et seulement tant que la commande est "En attente" ou "Confirmée".
- [ ] Confirmer une commande avec la case cochée crée/incrémente automatiquement l'attribution du
  commercial assigné, sans action manuelle sur la page Stock.
- [ ] Décocher la case retire immédiatement le crédit déjà donné (pas seulement pour le futur).
- [ ] Annuler une commande dont la case était cochée relâche le stock ET reprend le crédit du
  commercial en même temps.
- [ ] Changer le commercial assigné après un premier crédit ne transfère pas le crédit déjà
  donné : seule une augmentation ultérieure du besoin doit créditer le nouveau commercial.

### 12.4 Livraison
- [ ] Marquer une commande "Livré" fait toujours baisser le réservé du produit de la quantité
  livrée.
- [ ] Si le commercial assigné dispose bien de tout son crédit sur ce produit, la livraison le
  ramène à zéro sans toucher au disponible ni à "Hors commerciaux".
- [ ] Si le commercial en a moins que la quantité livrée (retiré ailleurs entre-temps), la
  livraison le ramène à zéro (jamais négatif) et "Hors commerciaux" absorbe l'écart restant.
- [ ] Une commande livrée sans auto-attribution active ne touche que le réservé, rien d'autre.

### 12.5 Angle mort connu (à vérifier, pas forcément à corriger)
- [ ] Forcer "Marquer Produit" sur une commande avec un manquant réel, quand l'auto-attribution
  est cochée : le manquant fictif (jamais couvert par du vrai stock) est quand même crédité au
  commercial. Vérifier que ça reste au moins visible/détectable (le commercial semble avoir plus
  que ce qui existe réellement).
