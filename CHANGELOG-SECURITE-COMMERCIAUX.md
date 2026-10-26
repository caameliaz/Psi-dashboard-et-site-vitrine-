# Sécurité : un commercial ne voit que ce qui lui est attribué (2026-10-26)

Audit des routes API puis correctifs. Principe : `requirePermission` dit « a le droit d'utiliser
la fonction », les nouveaux helpers de `src/lib/access.ts` disent « a le droit de voir CET objet ».
Règles de périmètre = celles des listes (`resolveClientVisibility`) : ses demandes (assignedToId),
celles de ses clients, et ce qu'un congé lui confie. ADMIN / `voir_tout` voient tout.

## Nouveau : `src/lib/access.ts`
`canAccessRequest`, `canAccessClient`, `guardRequestAccess`, `guardClientAccess`,
`ownRequestsWhere` (filtre Prisma pour exports/agrégats), `requireAdmin`, `requireAnyPermission`.

## Critique
- `POST /api/users` : n'importe quel connecté pouvait créer un ADMIN. Maintenant `gerer_utilisateurs`
  requis ; seul un ADMIN crée un ADMIN ; un non-admin n'accorde que ses propres permissions.
- `PATCH /api/users/[id]` : un non-admin ne touche plus un compte ADMIN, ne se donne pas ADMIN,
  ne modifie pas ses propres droits, n'accorde que les permissions qu'il possède.

## Élevé
- `orders|quotes/[id]` (GET, PATCH), `/notes`, `/cancel` : contrôle d'appartenance (404 sinon).
- `GET /api/orders/export` : permission `voir_commandes` + limité à son périmètre.
- `GET /api/stats` : toutes les requêtes commandes/devis/clients limitées à son périmètre
  (CA global, top produits, dernières demandes avec coordonnées clients...).
- `GET /api/users` (liste complète) : `gerer_utilisateurs` ; `?assignable=true` (id + nom) reste ouvert.
- `analytics/*`, `GET /api/contact` : `voir_contenu` ou `modifier_contenu` ; `PATCH /api/contact/[id]` :
  `modifier_contenu`.
- Stock : `stock/products|materials|assignments|free-refs`, `raw-materials` (GET), `production-list`,
  `purchase-list`, `production-list/urgent` exigent une permission stock (voir_stock,
  voir_listes_stock, voir_stock_commercial ou modifier_stock). `stock/assignments/[employeeId]` :
  soi-même, ou voir_stock / voir_stock_commercial.

## Moyen
- `clients/[id]` (PATCH, DELETE), `/notes`, `/phones` (+ suppression note/numéro, qui doivent
  appartenir au client) : le client doit être dans son périmètre.
- `clients/assign` : un non-admin ne réassigne que les clients qu'il voit.
- `send-email` : une seule adresse valide, objet sans saut de ligne, taille bornée, 20 envois/min/IP.
- `statuses` (POST/PATCH/DELETE) : ADMIN ; `templates` (POST/PATCH/DELETE) : `modifier_contenu`.

## Conséquence à connaître
Un employé sans `voir_contenu` ne voit plus les visites du site au dashboard (l'écran gère le 403).
Un employé sans permission stock ne charge plus les listes/stock (le widget stock du dashboard
doit rester masqué pour lui, comme avant côté interface).

## Non traité / à surveiller
- Une commande d'un client sans commercial n'est visible que par ses créateurs/assignés (comme la liste).
- Tests réels non faits : seul `tsc --noEmit` a été passé. À vérifier avec un compte commercial test :
  1. il ne voit pas une commande d'un autre via son URL ;
  2. il ne peut pas créer d'ADMIN (`POST /api/users`) ;
  3. le dashboard et la page Commandes marchent toujours pour lui ;
  4. un admin / compte `voir_tout` garde tout.

---

# Second audit — correctifs rapides (2026-10-26)

- `GET /api/products` public (sans `?all=true`) : n'expose plus `purchasePrice`, `stockMax`, seuils,
  `available`, `reserved`, `inDelivery`, `returned`. Le mode admin (`?all=true`) est inchangé.
- `auth/2fa/send` : code à 6 chiffres tiré avec `crypto.randomInt` (au lieu de `Math.random`).
- `lib/image-version.ts` : seules les images png/jpeg/webp/gif sont servies (plus de SVG) + en-têtes
  `Content-Security-Policy: sandbox` et `nosniff`.
- `/api/sse` : refuse les connexions sans session (401).

## Reste à faire (non traité)
- Réinitialisation de mot de passe publique sans confirmation (envoyer un lien au lieu de changer direct).
- Anti-bruteforce / rate-limit en mémoire, inefficaces sur Vercel (à stocker en base) ; mots de passe générés faibles.
- Mettre Next.js à jour (16.3.5 dans une plage signalée critique), puis nodemailer / prisma / trigger.dev ; `xlsx` sans correctif.
- Déconnecter les autres sessions au changement de mot de passe ; ajouter une CSP ; limiter `cart-tracking`.

- `POST /api/password-reset` : 2 réinitialisations max par compte et par fenêtre de 30 min (compteur en base,
  champs `User.resetWindowStart/resetWindowCount`, migration `20261026140000_password_reset_window`).
  Au-delà : réponse neutre « ok », mot de passe inchangé, aucun email envoyé.
