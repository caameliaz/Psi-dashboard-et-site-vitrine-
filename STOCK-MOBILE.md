# Rendre la page Stock responsive mobile — pistes de réflexion

Document de travail, pas de code encore. Objectif : discuter des options avant de choisir quoi implémenter.

## État actuel

La page [src/app/admin/stock/page.tsx](src/app/admin/stock/page.tsx) n'a **aucune adaptation mobile** — zéro `md:` dans tout le fichier, contrairement au Dashboard ou aux Utilisateurs qui ont déjà des variantes mobile/desktop séparées. Trois zones à traiter :

1. **Onglet "Produits finis"** : tableau à 9 colonnes (Référence, Mode, Disponible, Réservé, Hors commerciaux, En livraison, En retour, Statut, Action).
2. **Onglet "Matières premières"** : tableau à 6 colonnes.
3. **Onglet "Stock par commercial"** : `grid lg:grid-cols-2` — liste des employés à gauche, détail à droite. Sur mobile ça empile déjà en 1 colonne par défaut (Tailwind), mais pas testé/soigné.

Plus les 3 modals (StockActionModal, AssignModal, RestockOnlyModal) qui contiennent des `select` HTML natifs, des lignes `flex` avec des largeurs fixes (`style={{ width: 80 }}`) — à vérifier aussi au tactile.

## Le vrai problème : 9 colonnes de chiffres sur ~360px de large

Un tableau HTML avec `overflow-x-auto` (déjà en place) est la solution la plus rapide, mais sur ce cas précis elle est mauvaise en pratique : l'utilisateur doit scroller horizontalement pour lire "Statut" ou cliquer "Gérer le stock" après avoir lu "Référence" — sur un vrai téléphone en usage terrain (probablement le cas ici, PSI vend au comptoir/livraison), c'est pénible à l'usage, pas juste inélégant.

## Option A — Cartes empilées (recommandé)

Remplacer le tableau par une liste de **cartes verticales**, une par produit/matière, sur mobile uniquement (le tableau reste tel quel sur desktop `hidden md:table` / cartes en `md:hidden`) — c'est le pattern déjà utilisé ailleurs dans ce projet (ex: page Utilisateurs = grille de cartes, jamais de tableau).

Contenu d'une carte produit, à mon avis dans cet ordre de priorité visuelle :
- **Ligne 1** : Référence (gros, gras) + badge Statut (Rupture/Stock faible/En stock) aligné à droite — c'est l'info qu'on scanne en premier.
- **Ligne 2** : nom du produit si présent, petit, gris.
- **Ligne 3** : 2-3 chiffres clés en mini-grille (Disponible, Réservé, Hors commerciaux) — pas les 6 colonnes, voir plus bas.
- **Bouton "Gérer le stock"** pleine largeur en bas de la carte (zone de tap confortable, pas un petit lien).
-je propose aussi genr euand on clique sur a carte elle setend poir avor plus de details 

Question pour toi : est-ce que **"En livraison"** et **"En retour"** sont des chiffres qu'un utilisateur mobile consulte souvent -> nn pas necessaire poir stoc terrain mais pour ladmin si 
ou surtout pertinents pour un usage bureau (admin qui fait des rapports) ? Si c'est plutôt secondaire sur le terrain, je proposerais de les cacher par défaut sur la carte mobile et de les montrer seulement en dépliant la carte (bouton "voir plus" ou tap sur la carte elle-même) — évite de surcharger l'écran tout en gardant l'info accessible. -> ok 

## Option B — Tableau scrollable horizontalement, mais amélioré (laisse cette optoon je verrai lus tard 
)

Garder un vrai tableau mais :
- Épingler la colonne "Référence" (`position: sticky; left: 0`) pour qu'elle reste visible pendant qu'on scroll horizontalement — pattern classique des tableurs mobiles.
- Réduire à 4-5 colonnes essentielles sur mobile (masquer En livraison/En retour/Hors commerciaux par défaut, accessibles via un tap qui ouvre le détail).

Plus rapide à coder que l'option A (pas de nouvelle structure de carte), mais reste un scroll horizontal — moins agréable qu'une vraie liste verticale sur téléphone. Je ne le recommande qu'en solution "rapide en attendant mieux".

## Barre de recherche + onglets

- La barre de recherche (`max-w-xs`, ligne 381) est bridée à une largeur desktop — sur mobile elle devrait passer en pleine largeur (`w-full` sans le `max-w-xs` en dessous de `md:`).
- Les 3 onglets (Produits finis / Matières premières / Stock par commercial) sont dans un conteneur `w-fit` avec `px-4` par bouton — à tester si les 3 libellés tiennent sur 360-390px sans wrap moche. Si ça déborde, deux pistes : libellés raccourcis sur mobile ("Produits", "Matières", "Commercial") ou onglets qui scrollent horizontalement (`overflow-x-auto` sur le conteneur). ok dos moi quand cets ok moi je propose un toggle 

## Boutons d'action du header (Seuils / Restocker / Attribuer)

Actuellement 3 boutons côte à côte (`flex items-center gap-2`, `flex-wrap` déjà présent) — sur mobile ils vont probablement passer à la ligne façon "wrap" désordonné. Proposition : les empiler en pleine largeur sur mobile, ou les regrouper dans un seul bouton "Actions" qui ouvre un petit menu (cohérent avec l'idée de pop-up centrée qu'on a évoquée pour les filtres du dashboard). - > on peut mettre de s icones sinon meme si je pense que 3 horizontaes ca suffit genr een bas de la card 

## Modals (StockActionModal, AssignModal, RestockOnlyModal)

Le composant `Modal` générique a déjà `w-full max-w-md mx-4` — donc déjà responsive en largeur. Points à vérifier/ajuster :
- `AssignModal` : la ligne produit (`select` + `input` largeur fixe `80px` + bouton supprimer) tient sur 3 éléments côte à côte — à re-tester sur 360px, risque d'être trop serré. Piste : empiler `select` puis `input`+bouton sur mobile au lieu de tout sur une ligne.
- Les `<select>` HTML natifs (pas `AdminSelect` comme ailleurs dans l'app) s'affichent différemment selon l'OS mobile (natif iOS/Android) — pas forcément un problème, juste à vérifier visuellement que ça reste lisible avec le style actuel.

## Onglet "Stock par commercial" -> cest pas tt le mond e qui peut voir ,  que les admins pour le mmt 

Le `grid lg:grid-cols-2` empile déjà en 1 colonne sur mobile par défaut (Tailwind : pas de préfixe `lg:` = mobile-first, donc 1 colonne jusqu'à `lg`). Ça devrait déjà à peu près fonctionner, mais je n'ai pas testé visuellement — possible que le clic sur un employé (qui affiche le détail dans la 2e colonne) soit peu clair sur mobile si les deux blocs sont l'un sous l'autre sans transition claire (l'utilisateur doit scroller pour voir le détail après avoir tapé un employé, sans indice visuel).
aussi on met dans la navbar tsock mais aussi restock qui mene direct vers les formulaires ou jsp quoi jute le respo de stock entre manuellement ce quil a fait ten pense quoi ger si c un restock pas special 

## Décisions prises (14/09)

1. **Option A (cartes empilées) validée.** Option B (tableau scrollable amélioré) mise de côté, à revoir plus tard si besoin.
2. **Carte extensible au tap** : idée ajoutée — la carte se déplie au clic pour révéler plus de détails. Ça règle directement le point suivant : plutôt que de conditionner l'affichage d'En livraison/En retour au rôle de l'utilisateur, ils sont simplement cachés par défaut sur la carte repliée et visibles en dépliant — accessible à tous, juste secondaire visuellement.
3. **Onglets (Produits finis / Matières premières / Stock par commercial)** : garder le style pill-toggle actuel, à re-tester sur mobile pour voir si les 3 libellés tiennent sans wrap moche avant de décider s'il faut les raccourcir.
4. **Boutons header (Seuils / Restocker / Attribuer)** : rester sur 3 boutons horizontaux avec icônes plutôt qu'un menu unique, positionnés en bas de la zone d'en-tête (pas un menu qui s'ouvre).
5. **Onglet "Stock par commercial" réservé** : pas accessible à tout le monde — décision prise d'ajouter une **permission dédiée** (cohérente avec le système `ALL_PERMISSIONS` existant), plutôt qu'un simple check `role === 'ADMIN'` en dur. Plus de travail à l'implémentation, mais reste configurable comme le reste des droits de l'app.
6. **Navbar mobile devient configurable par permission** : au lieu d'une liste fixe de 4 icônes (Dashboard/Créer/Commandes/Clients) pour tout le monde, chaque item de la navbar n'apparaît que si l'utilisateur a la permission correspondante (ex: `voir_stock` → icône Stock visible, `modifier_stock` → icône Restock visible). Un admin (toutes permissions) verrait donc potentiellement 6 icônes ou plus, un commercial avec moins de permissions verrait une navbar plus courte.
   - **Restock** dans la navbar mène directement à un formulaire de réapprovisionnement rapide (pas la liste complète Stock) — le responsable saisit manuellement ce qu'il a fait, un restock classique, rien de spécial en plus.

### Point encore en suspens : que faire si un utilisateur (souvent l'admin) a la permission pour 6+ items ?

J'ai proposé de regrouper le surplus dans un item "Plus" (menu) au-delà de 5 icônes, pour que la navbar reste toujours compacte même pour un admin qui a toutes les permissions. Tu m'as répondu "ça va, tu trouves que c'est trop ?" — je reformule mon avis plus clairement ici plutôt qu'à l'oral :

**Mon avis** : 6 icônes sur une largeur d'écran de 360-390px, ça fait environ 60-65px par icône (padding compris) — c'est jouable mais serré, la zone de tap de chaque icône devient plus petite que l'idéal (le standard recommandé est ~44px minimum de zone tactile, donc 6 icônes reste au-dessus de ce seuil, pas catastrophique). Ce n'est **pas bloquant**, juste moins confortable qu'avec 4-5 icônes. Je ne bloque pas dessus : on peut commencer avec 6 icônes directes telles quelles, et si à l'usage réel ça s'avère trop serré (retour terrain), basculer vers un "Plus" à ce moment-là plutôt que sur-anticiper. **Je penche donc maintenant pour : laisser les icônes directes sans regroupement, quitte à ajuster après un vrai test sur téléphone.**

## Prochaine étape

Une fois que tu valides ce récap (ou corriges un point), je commence l'implémentation — dans cet ordre proposé :
1. Permission dédiée pour "Stock par commercial" (rapide, isolé).
2. Navbar mobile configurable par permission (Stock + Restock ajoutés).
3. Formulaire Restock rapide (accessible depuis la navbar).
4. Cartes mobiles pour l'onglet "Produits finis" (le plus complexe), avec extension au tap.
5. Réplication du pattern carte sur "Matières premières".
6. Ajustements onglets / boutons header / modals une fois le reste en place.
