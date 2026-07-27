
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



#	Ce qui change	Où tester
0	Message d'erreur rouge si un champ obligatoire est vide (bouton plus grisé)	Créer commande/devis en laissant l'entreprise ou le tél vide
1	Le devis garde le prix unitaire saisi à la création + la TVA	Créer un devis avec prix → rouvrir le détail
2	Les commandes avaient déjà tout ça (vérifié, rien à changer)	—
3	Détail + Excel + PDF du devis affichent : prix unitaire par ligne, HT / TVA 19% / TTC	Devis avec prix → Exporter Excel & Imprimer
4	« Modifier » un devis permet de changer prix unitaire + TVA sans confirmer (reste "En attente")	Devis → Modifier → changer prix → Enregistrer
4b	À la confirmation, la modale pré-remplit le prix + TVA déjà définis — tu gardes ou tu changes	Devis avec prix → Confirmer (la popup s'ouvre pré-remplie)
🔧 Plus tôt dans la session
Ce qui change	Où tester
WhatsApp : numéro 0xxxx → converti en 213xxxx (plus mal interprété)	Détail commande/devis + fiche client → bouton WhatsApp
Message d'erreur si téléphone/email au mauvais format	Créer avec email sans @ ou tél trop court
« Mes ventes » dans le filtre du dashboard	Dashboard → carte Ventes ce mois
Aperçu TVA live dans la popup de prix devis	Confirmer un devis
Bouton mobile : "Désactiver notifs" retiré une fois activé	Accueil mobile



apres la premiere commande entreprise se remplit automatiquement quand on commande et quon la laisse vide 
-devis se cree a adrar aoulef quand on laisse wilaya vide
-ajouter * a entreprise pour montrer que cest obligatoire au lieu de nom 
-ajouter * au produit souhaite 



dashboard:
-message rouge saffiche quand on cree un devis sans champ obligatoire1

on peut pas ajouter de message avec le devis comme pour le site public 

en general:
apres la premiere commande le client se cree automatiquement et toutes les commandes 
effectues apres ne creent plus de client et sajoute au client cree précédemment




mettre un message dalerte quand montant global ne corresponds pas avec le prix unitaire de chaque produit

le filtre en haut commande et devis doivent montrer toutes les commandes et devis (le compteur doit compter toutes les commandes et devis aussi pas seulement ceux livres ou en attente)

ui:
image rouleau pour caisse a changer et trop grande dans section et ceux ci vous les avez vu
adapter la taille du container gris du preview des images dans la page produit admin


---

## Session du 25 janvier 2026 - Corrections TVA, Prix et UX

### 1. ✅ Fix TVA dans affichage détail devis/commande
**Fichier** : `src/components/ui/RequestPanel.tsx`
**Problème** : Quand on modifiait un devis et ajoutait la TVA, le prix affiché restait en HT
**Solution** : 
- Utiliser `item.vatEnabled` au lieu de `item.tva` 
- Calculer dynamiquement HT depuis `item.items`
- Afficher HT + Total TTC si TVA activée
**Lignes modifiées** : Affichage total (ligne ~1195), Export Excel (ligne ~99), Export PDF (ligne ~203)

### 2. ✅ Permettre modification prix sans changer statut
**Fichier** : `src/app/admin/requests/page.tsx`  
**Problème** : Modifier le prix d'un devis le passait automatiquement en "Confirmé"
**Solution** : Ne changer le statut en "Confirmé" que si le devis est "En attente"
**Code** :
```typescript
const payload: any = { proposedPrice, vatEnabled: item.vatEnabled, itemPrices };
if (item.statut === 'En attente') {
  payload.status = 'VALIDE';
}
```

### 3. ✅ Pré-remplir modale prix avec valeurs existantes
**Fichier** : `src/components/ui/RequestPanel.tsx` (PriceModal)
**Problème** : Mode "Total global" était vide au lieu d'afficher le prix actuel
**Solution** : Calculer le HT initial et pré-remplir `totalGlobal`
```typescript
const totalHtInitial = (item.items ?? []).reduce((acc, i) => acc + i.quantite * i.prixUnitaire, 0);
const [totalGlobal, setTotalGlobal] = useState(totalHtInitial > 0 ? String(totalHtInitial) : '');
```

### 4. ✅ Génération automatique numéro de facture
**Fichiers** : 
- `src/app/admin/requests/page.tsx` (ajout bouton 🔄)
- `src/app/api/invoices/next-number/route.ts` (nouvelle API)

**Fonctionnalité** : Bouton à côté du champ "N° facture" qui génère automatiquement le prochain numéro au format `F2026-XXX`
**API** : Cherche le dernier numéro de l'année dans commandes + devis, incrémente de 1

### 5. ✅ Optimisation chargement homepage
**Fichiers** :
- `src/app/(public)/page.tsx` (server component)
- `src/components/HomeClient.tsx` (nouveau - client component)
- `src/components/CategoryBrowser.tsx` (props optionnelles)

**Problème** : Produits mettaient 3s à charger (fetch côté client)
**Solution** : 
- Homepage = server component qui fetch en parallèle (content, categories, products)
- Passe les données à `HomeClient` (client component pour animations)
- `CategoryBrowser` accepte props optionnelles → pas de fetch si données fournies
- Backward compatible : `/products` continue de fetcher côté client

### 6. ❌ Scroll + bordure rouge sur erreur formulaire (ANNULÉ)
**Fichier** : `src/app/admin/requests/page.tsx`
**Statut** : Modification annulée (causait erreur de build)
**Raison** : Problème d'encodage caractères spéciaux, restauré via `git restore`

---

## Fichiers modifiés (prêts pour push) :
1. ✅ `src/components/ui/RequestPanel.tsx` - Fix TVA + affichage prix
2. ✅ `src/app/admin/requests/page.tsx` - Fix statut + génération n° facture
3. ✅ `src/app/(public)/page.tsx` - Server component
4. ✅ `src/components/HomeClient.tsx` - Nouveau fichier
5. ✅ `src/components/CategoryBrowser.tsx` - Props optionnelles
6. ✅ `src/app/api/invoices/next-number/route.ts` - Nouvelle API
7. ✅ `src/app/(public)/quote/page.tsx` - Fix champ entreprise required

## Build Status : ✅ PASS
```
✓ Compiled successfully
✓ Generating static pages (56/56)
✓ Finalizing page optimization
```

## Prêt pour production : ✅ OUI

Site public
-devis se cree sans entreprise