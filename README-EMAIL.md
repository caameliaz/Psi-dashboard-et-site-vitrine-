# Emails automatiques de récap — PSI Dashboard

## Architecture

```
src/lib/email/send.ts          → sendEmail({ to, subject, html, text, attachments? }) — SEUL point d'envoi (Nodemailer + Gmail SMTP)
src/emails/shared.ts           → bouts HTML communs (cartes Commandes/Devis, barres par statut, tableau, logo en bas) + logoAttachment
src/emails/dailyRecapTemplate.ts   → compose { subject, html, text } pour le récap quotidien à partir de shared.ts
src/emails/weeklyRecapTemplate.ts  → compose { subject, html, text } pour le bilan hebdomadaire à partir de shared.ts
src/lib/recaps/shared.ts       → DB_TO_UI (statuts) + buildCard() (total) + buildStatusBars() (répartition combinée par statut)
src/lib/recaps/sendDailyRecap.ts   → logique métier : va chercher les données, appelle le template, envoie à chaque admin
src/lib/recaps/sendWeeklyRecap.ts  → idem pour le bilan hebdo
src/trigger/dailyRecap.ts      → tâche planifiée Trigger.dev (tous les jours 8h) — appelle sendDailyRecap()
src/trigger/weeklyRecap.ts     → tâche planifiée Trigger.dev (lundi 8h) — appelle sendWeeklyRecap()
```

**Pourquoi cette séparation ?** `lib/recaps/*` ne connaît rien de Trigger.dev — ce sont
juste des fonctions `async () => résultat`. On peut donc les tester en local sans
avoir besoin d'un compte Trigger.dev, d'un nom de domaine ou d'un déploiement.
Les fichiers `src/trigger/*` ne font qu'appeler ces fonctions au bon moment.

`sendEmail()` (`lib/email/send.ts`) est le seul endroit qui parle à Nodemailer.
L'expéditeur (`from`) est **fixé côté serveur** dans cette fonction, avec l'adresse
configurée via `GMAIL_USER` — impossible à surcharger par un appelant. Le jour où on
veut changer de provider (Resend, etc.), c'est le seul fichier à toucher.

---

## Variables d'environnement requises

Déjà en place depuis la fonctionnalité d'envoi d'email du panel commande (voir `.env`) :

```
GMAIL_USER="contact@psi-algerie.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

Pas de nouvelle variable pour les récaps — ils réutilisent `sendEmail()`.

`NEXTAUTH_URL` est aussi utilisée pour construire le lien "Ouvrir l'admin →" dans les
emails (fallback sur `http://localhost:3000` si absente).

---

## Destinataires

Tous les utilisateurs avec `role: 'ADMIN'` et `active: true` en base, filtrés sur une
adresse email non vide (`User.email` est obligatoire dans le schéma, mais le filtre
est fait quand même par sécurité). Si aucun admin valide n'est trouvé, la fonction
logue un avertissement et retourne `sent: 0` sans planter.

Chaque admin reçoit l'email dans **sa propre boîte** (un envoi par admin, pas de CC/BCC).

---

## Tester manuellement en local

### Option A — route API temporaire (`/api/dev/send-recap`)

Réservée aux comptes `ADMIN` connectés. À supprimer avant une mise en prod publique
si vous ne voulez pas exposer ce déclencheur manuel (ou la laisser, elle est protégée).

```bash
npm run dev
# puis, connecté en admin dans le navigateur :
curl "http://localhost:3000/api/dev/send-recap?type=daily" -H "Cookie: <cookie de session>"
```
Plus simple : ouvrez l'URL directement dans le navigateur pendant que vous êtes
connecté en admin sur l'app — `http://localhost:3000/api/dev/send-recap?type=daily`
ou `?type=weekly`.

### Option B — script en ligne de commande

```bash
npx dotenv-cli -e .env -- npx tsx scripts/test-recap.ts daily
npx dotenv-cli -e .env -- npx tsx scripts/test-recap.ts weekly
```

Les deux options appellent directement `sendDailyRecap()` / `sendWeeklyRecap()` —
aucune dépendance à Trigger.dev n'est nécessaire pour tester.

---

## Connecter Trigger.dev plus tard (une fois le nom de domaine choisi)

1. **Créer un compte** sur [trigger.dev](https://trigger.dev) et un nouveau projet.
2. **Récupérer la clé de projet** (`TRIGGER_PROJECT_REF`, format `proj_xxxxx`).
3. **Initialiser le projet** dans ce repo :
   ```bash
   npx trigger.dev@latest init
   ```
   Cela génère `trigger.config.ts` à la racine — y indiquer :
   ```ts
   export default defineConfig({
     project: "proj_xxxxx",
     dirs: ["./src/trigger"],
   });
   ```
4. **Se connecter** : `npx trigger.dev@latest login`
5. **Lancer le dev server Trigger.dev** (en parallèle de `npm run dev`) pour tester
   les tâches en local avec de vraies exécutions planifiées :
   ```bash
   npx trigger.dev@latest dev
   ```
6. **Déployer** les tâches vers l'environnement de prod Trigger.dev :
   ```bash
   npx trigger.dev@latest deploy
   ```
7. Configurer les **variables d'environnement** (`GMAIL_USER`, `GMAIL_APP_PASSWORD`,
   `DATABASE_URL`, `NEXTAUTH_URL`) dans le dashboard Trigger.dev (Environment Variables),
   car les tâches tournent sur l'infra Trigger.dev, pas sur votre serveur Next.js.
8. Une fois déployé, les cron définis dans `src/trigger/dailyRecap.ts` (`0 8 * * *`)
   et `src/trigger/weeklyRecap.ts` (`0 8 * * 1`) s'activent automatiquement — plus
   besoin de la route `/api/dev/send-recap` ni du script pour le fonctionnement normal.

**Logo** : le vrai logo (`public/Logo PSI-new.jpeg`) est embarqué directement dans
l'email en pièce jointe "inline" (Content-ID), pas via une URL publique — ça
fonctionne donc dès maintenant, sans nom de domaine. Voir `src/emails/shared.ts`
(`logoAttachment`, `LOGO_CID`) : le fichier est lu sur disque à l'envoi et
référencé dans le HTML via `<img src="cid:psi-logo"/>`. Si un jour vous préférez
une URL publique classique, il suffira de remplacer cette balise et de retirer
`attachments: [logoAttachment]` des appels à `sendEmail()` dans `lib/recaps/*`.
