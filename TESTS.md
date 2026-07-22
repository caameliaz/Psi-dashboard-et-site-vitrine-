
4. **Notifs push** : autorise les notifications → ferme l'onglet → fais une action depuis
   un autre compte → tu dois recevoir la push
   *(PC et Android ; sur iPhone : ajoute d'abord le site à l'écran d'accueil)*
5. **Email test** → doit arriver dans la boîte `Contact@psi.dz`
6. **Récaps auto** : Vercel → Cron Jobs → « Run » → l'email arrive


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


# 📎 ANNEXES (infos de référence)


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
1️⃣ Brancher psi.dz sur Vercel
Étape A — Vercel
Settings → Domains → Add → tape psi.dz → puis recommence avec www.psi.dz.
Vercel affiche alors les enregistrements DNS à créer.

Étape B — cPanel (Zone Editor, comme pour Brevo)

Généralement :

Type	Name	Valeur
A	psi.dz	76.76.21.21 (Vercel te donnera l'IP exacte)
CNAME	www.psi.dz	cname.vercel-dns.com
⚠️ Deux points critiques :

Ne touche AUCUN enregistrement MX → tes emails @psi.dz cesseraient de fonctionner
Il existe déjà un enregistrement A sur psi.dz pointant vers 197.140.11.7 (le site actuel d'Icosnet). Il faut le modifier (Edit), pas en créer un second
Étape C — Une fois propagé : Vercel → NEXTAUTH_URL = https://psi.dz → Redeploy

⏱️ Propagation : 15 min à 24h. Vercel installe le HTTPS tout seul.