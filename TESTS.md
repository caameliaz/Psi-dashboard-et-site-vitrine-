# 2️⃣ TUTO — Déployer sur Vercel (à faire UNE fois)

> Prérequis : le code est sur GitHub ✅ · tu as une base Neon de prod.

**Étape 1** — Va sur `vercel.com` → connecte-toi avec ton compte **GitHub**.

**Étape 2** — **Add New → Project** → sélectionne le repo `psisite` → **Import**.

**Étape 3** — ⚠️ **AVANT de cliquer Deploy**, ouvre **Environment Variables** et ajoute :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'URL de ta base **Neon de prod** |
| `NEXTAUTH_SECRET` | une chaîne aléatoire forte (voir encadré ci-dessous) |
| `NEXTAUTH_URL` | ⏳ à remplir à l'**étape 6**, une fois l'URL connue |
| `SMTP_PROVIDER` | `cpanel` |
| `SMTP_HOST` | `mail.psi.dz` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `Contact@psi.dz` |
| `SMTP_PASS` | le mot de passe de la boîte (celui du `.env`) |
| `EMAIL_FROM` | `Contact@psi.dz` |
| `VAPID_PUBLIC` | même valeur que le `.env` local |
| `VAPID_PRIVATE` | même valeur que le `.env` local |
| `NEXT_PUBLIC_VAPID_PUBLIC` | même valeur que le `.env` local |
| `CRON_SECRET` | ⚠️ **obligatoire** — voir encadré ci-dessous |

> **Générer `NEXTAUTH_SECRET`** (dans ton terminal) :
> ```
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
> ```
>
> **Générer `CRON_SECRET`** :
> ```
> node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
> ```
> Sans lui, les **récaps automatiques** (quotidien 20h + hebdo jeudi 23h59) ne partiront
> pas : la route les refuse (protection contre les envois massifs d'emails).

**Étape 4** — Clique **Deploy**. Attends ~2-3 min.
*(Le build applique tout seul les migrations de la base — rien à faire.)*

**Étape 5** — Vercel te donne une URL type `https://psisite-xxxx.vercel.app`
👉 **c'est ton lien de test.**

**Étape 6** — Retourne dans **Settings → Environment Variables** → mets
`NEXTAUTH_URL` = cette URL (avec `https://`) → onglet **Deployments** → bouton **Redeploy**.

**Étape 7** — Vérifie dans **Vercel → onglet "Cron Jobs"** que les **2 tâches** apparaissent.
*(bouton « Run » pour tester un récap sans attendre 20h)*

✅ **Site en ligne.**

---

# 3️⃣ TESTS À FAIRE UNE FOIS EN LIGNE

Sur l'URL `.vercel.app`, dans cet ordre :

1. **Connexion** admin → le dashboard s'ouvre
2. **Créer une commande + un devis** → la cloche sonne, notif reçue
3. **Exports** Excel + PDF → se téléchargent
4. **Notifs push** : autorise les notifications → ferme l'onglet → fais une action depuis
   un autre compte → tu dois recevoir la push
   *(PC et Android ; sur iPhone : ajoute d'abord le site à l'écran d'accueil)*
5. **Email test** → doit arriver dans la boîte `Contact@psi.dz`
6. **Récaps auto** : Vercel → Cron Jobs → « Run » → l'email arrive

---

# 4️⃣ TUTO — Modifier le site après le déploiement

À chaque fois que tu changes quelque chose :

```
git add -A
git commit -m "ta description"
git push
```

👉 **Vercel redéploie tout seul** (~2 min). Les migrations de base passent automatiquement.
Rien d'autre à faire.

---

# 5️⃣ TUTO — Brancher le domaine psi.dz

> À faire **après** avoir validé le site sur l'URL `.vercel.app`.

1. Vercel → **Project → Settings → Domains → Add** → tape `psi.dz` (puis `www.psi.dz`)
2. Vercel affiche des **enregistrements DNS** à créer (type A et/ou CNAME)
3. Envoie-les à **ICOSNET** (qui gère le DNS de psi.dz) — ou fais-le toi-même si tu as l'accès
4. **Propagation : quelques heures** (jusqu'à 24-48h max). Vercel met le HTTPS tout seul.
5. ⚠️ Une fois `psi.dz` actif : change `NEXTAUTH_URL` = `https://psi.dz` → **Redeploy**

✅ **Site accessible sur psi.dz.**

⚠️ **Attention** : ne pas toucher aux enregistrements **MX** — ce sont eux qui font
fonctionner les emails `@psi.dz` (hébergés chez Icosnet, voir annexe).

---

# 6️⃣ ORDRE COMPLET — de maintenant à la mise en service

1. Déployer sur Vercel (§2) → obtenir l'URL `.vercel.app`
2. Mettre `NEXTAUTH_URL` = URL prod (les cookies Secure sont déjà auto en prod)
3. Faire les tests en ligne (§3)
4. Brancher le domaine psi.dz (§5)
5. Remplir les vraies données (produits, clients) directement via l'app en ligne

---
---

# 📎 ANNEXES (infos de référence)

## 📧 EMAILS — ✅ RÉSOLU le 21/07/2026

> ⚠️ **Fausse piste initiale** : on croyait la boîte chez Microsoft/Office 365
> → erreur 535 en boucle, alors que le problème n'était pas là.
>
> **RÉALITÉ** : la boîte `Contact@psi.dz` est hébergée chez **ICOSNET (cPanel)**.
> *Preuves : MX de psi.dz → 197.140.11.7 (Icosnet) · le SPF n'autorise que cette IP · cPanel accessible.*
>
> **Config qui marche** (dans `.env` ET sur Vercel) :
> `SMTP_PROVIDER=cpanel` · `SMTP_HOST=mail.psi.dz` · `SMTP_PORT=465` · user `Contact@psi.dz`
>
> Le mot de passe était **le bon depuis le début** — aucun « mot de passe d'application » nécessaire,
> aucune action de l'entreprise requise.
>
> 💡 Le mot de passe de la boîte est réinitialisable seule depuis **cPanel → Email Accounts → Manage**.
>
> ⚠️ Depuis certaines connexions locales, le port 465 fait des timeouts (1 essai sur 2) —
> c'est le réseau local, pas le code. Aucun souci depuis Vercel.

## 💰 HÉBERGEMENT & COÛTS (à savoir face à l'entreprise)

**Architecture = 2 services séparés :**
- **VERCEL** = héberge l'APP (le site + l'admin)
- **NEON** = héberge la BASE DE DONNÉES (clients, commandes, users…) ← reliée via `DATABASE_URL`

**VERCEL**
- Gratuit (Hobby) : ~100 Go/mois de trafic, largement suffisant pour un usage interne.
  ⚠️ Le gratuit **interdit l'usage COMMERCIAL** → OK pour tester, pas pour la prod officielle.
- Pro (~20$/mois) : à prendre quand l'entreprise l'utilise « pour de vrai ». C'est l'entreprise qui paie.

**NEON (base de données)**
- Gratuit : 0,5 Go = facilement **+10 000 clients** (100 clients = quelques Mo → on est TRÈS loin).
- ⚠️ Le gratuit met la base « en veille » après inactivité → 1ʳᵉ requête ~1s de délai (erreur P1001 vue en dev).
- Payant (~19$/mois) : supprime la veille. À prendre seulement si la lenteur gêne.

**RÉSUMÉ COÛTS**
- Démarrage / tests : **0$**
- Production réelle : **~20$/mois** (Vercel Pro) + éventuellement ~19$ (Neon payant) = **20 à 40$/mois**
- Le **nombre de clients n'est jamais un problème** (la limite c'est le trafic/stockage, pas le nb de fiches).

**À CONSEILLER À L'ENTREPRISE**
> « On démarre gratuit pour valider. En production quotidienne → Vercel Pro (~20$/mois),
> sans maintenance de votre côté (HTTPS auto, redéploiement en 1 commande). La base reste
> gratuite tant qu'on ne dépasse pas ~10 000 clients, donc pour longtemps. Un VPS coûterait
> moins cher mais demande un admin serveur — pas rentable pour une PME. »

## 👤 COMPTES DE TEST

| Email | Rôle |
|---|---|
| `admin1@psi.dz` | Admin (tout) — **utilise celui-là** |
| `admin2@psi.dz` | Admin (2ᵉ, pour tester les notifs à 2) |
| `employe1@psi.dz` | Employé complet |
| `employe2@psi.dz` | Employé limité (lecture seule) |

## ⚙️ CONFIG — déjà en place, rien à faire

- [x] Le build applique les migrations auto : `"build": "prisma migrate deploy && next build"`
- [x] Cookies Secure AUTO en prod (`useSecureCookies = NODE_ENV==='production'`)
- [x] En-têtes de sécurité (HSTS / X-Frame / nosniff) + rate limiting (login + routes publiques)
- [x] Emails OK (Icosnet/cPanel) — testé en réel le 21/07/2026
- [ ] ⚠️ Mettre un `NEXTAUTH_SECRET` **fort et unique** sur Vercel (pas celui de dev)

## ✅ PRIORITÉ 9 — Retours entreprise (réunion) — TERMINÉE

- 9.1 Emails : récap hebdo jeudi 23h59 + récap quotidien 20h, expéditeur Contact@psi.dz ✅
- 9.2 Export fiche client PDF + Excel (infos + historique) ✅
- 9.3 Secteur d'activité par client (dropdown + gestion + badge) ✅
- 9.4 Champ métrage (m) facultatif partout (commande/devis/produit/site/Excel) ✅
- 9.5 Référence libre dans les commandes ✅
- 9.6 Bouton « + Nouveau » (ex « + Nouvelle commande ») ✅
- 9.7 Réf auto par catégorie (préfixe → PTT-001, PTT-002…) ✅
- 9.8 Nom de produit éditable ✅
- 9.9 Excel 1 ligne/produit sans cases vides + colonnes wilaya/commune/cat/réf/métrage ✅

> Migration `p9` : Product.name/metrage, Category.prefix/refCounter, OrderItem/QuoteItem.metrage,
> Client.sectorId + table Sector, OrderItem.

## ⚡ TEMPS RÉEL — ✅ VÉRIFIÉ

Avec 2 fenêtres ouvertes (`admin1` sur une liste, `admin2` qui agit) :

1. ✅ `admin2` crée/valide une demande → chez `admin1` la liste `/admin/requests` se met
   à jour **sans F5** et **sans clignotement** (pas de « Chargement… »)
2. ✅ Idem sur le **dashboard** : chiffres + camembert bougent en douceur
3. ✅ **Fiche client** ouverte → l'historique se met à jour en direct
4. ✅ La **cloche** s'incrémente en direct, le toast apparaît sans recharger
5. ✅ Aucune vue ne « flashe » d'état de chargement pendant une mise à jour

> **Comment ça marche** : SSE (instantané quand ça passe) + un rafraîchissement silencieux
> toutes les 15s en filet de sécurité. En prod Vercel, c'est surtout le second qui joue
> → mise à jour en **max 15s**, mais toujours **sans F5 ni clignotement**.

## ✅ CHECK FINAL — avant de livrer

1. Toutes les sections testées
2. Aucune erreur rouge dans le terminal du serveur
3. `npx next build` passe sans erreur
4. Notifications OK entre 2 comptes (temps réel)
5. Supprimer un client ne casse pas ses commandes
6. Permissions employé fonctionnent (limité ≠ admin)
7. Modifier une commande (quantités/produits) marche
8. Conversion devis → commande marche
9. Photos produits visibles sur le site public
10. Page login sans sidebar + agrandie
11. La base contient les 4 comptes (2 admins + 2 employés)
12. Commande/devis depuis le site → apparaît côté admin + client créé
