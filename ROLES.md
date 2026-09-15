# Rôles personnalisés — ça existe déjà

Bonne nouvelle : ce que tu décris (créer un rôle nommé et réutilisable, plutôt que cocher les
permissions une par une à chaque nouveau compte) **existe déjà** dans l'app, pas besoin de le
construire.

## Ce qui est déjà en place

- **Modèle en base** : [prisma/schema.prisma](prisma/schema.prisma) → `CustomRole` (`id`, `name`, `permissions: String[]`).
- **API** : [src/app/api/roles/route.ts](src/app/api/roles/route.ts) (lister/créer) et `src/app/api/roles/[id]/route.ts` (supprimer).
- **UI** : page Utilisateurs ([src/app/admin/users/page.tsx](src/app/admin/users/page.tsx)) → bouton **"+ Ajouter un rôle"** visible à la création d'un compte, ouvre `RoleCreatorOverlay` : tu donnes un nom (ex: "Responsable production") et coches les permissions voulues parmi la liste complète (`ALL_PERMISSIONS`).

## Comment ça marche concrètement, aujourd'hui

1. À la création d'un utilisateur (**Nouvel utilisateur**), en face de "Rôle" il y a déjà 2 boutons fixes (**Admin**, **Employé**) + tous les rôles perso déjà créés, affichés à côté.
2. Clique **"+ Ajouter un rôle"** → tu nommes le rôle, coches les permissions, tu le crées.
3. Le nouveau rôle apparaît immédiatement comme un 3e bouton sélectionnable (à côté d'Admin/Employé) — tu peux directement l'assigner au compte en cours de création.
4. Pour les comptes déjà existants aussi : ouvre le profil d'un employé → **Modifier** → le sélecteur de rôle propose Admin / Employé / tous les rôles perso créés.
5. Un rôle perso peut être supprimé (bouton `×` sur son badge) — les comptes qui l'utilisaient gardent leurs permissions individuelles telles quelles (`role` reste `EMPLOYEE` en base, seules les permissions cochées à ce moment-là restent).

⚠️ Détail technique important : en base, un compte avec un rôle perso reste `role: 'EMPLOYEE'` (il n'y a que ADMIN/EMPLOYEE comme vrais rôles au sens strict) — le "rôle perso" est juste un **ensemble de permissions pré-rempli et nommé** pour aller plus vite à la création/modification, pas un vrai 3ᵉ niveau de rôle système. Concrètement : renommer ou supprimer un rôle perso plus tard n'affecte JAMAIS rétroactivement les comptes déjà créés avec — chaque compte garde ses propres cases cochées, indépendamment.

## Ce que ça permet pour ton besoin (permissions stock)

Une fois `voir_listes_stock` (ou le nom qu'on choisira) ajoutée à `ALL_PERMISSIONS`
([src/lib/permissions.ts](src/lib/permissions.ts)), tu pourras directement créer des rôles comme :

- **"Responsable production"** : `voir_listes_stock` coché, `voir_stock` décoché → voit les listes achat/production, pas les chiffres de stock global.
- **"Magasinier"** : `voir_stock` + `modifier_stock` + `voir_listes_stock` → accès complet à la page Stock.
- **"Commercial"** : ni l'un ni l'autre → aucun accès à la page Stock du tout.

Et les réutiliser à chaque nouvel employé sans tout recocher.

## Prochaine étape

Rien à construire ici — c'est prêt. Il reste juste à :
1. Ajouter la nouvelle permission `voir_listes_stock` (et éventuellement `voir_stock_commercial` pour l'onglet "Stock par commercial" déjà évoqué dans [STOCK-MOBILE.md](STOCK-MOBILE.md)) à la liste `ALL_PERMISSIONS`.
2. Toi, créer les rôles perso qui correspondent aux vrais métiers chez PSI (production, achat, commercial, magasinier...) via l'UI déjà existante — dis-moi si tu veux qu'on liste ensemble les métiers réels et ce que chacun doit voir/faire avant de les créer.
