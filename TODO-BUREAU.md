# À faire au bureau

## Exclure l'équipe PSI des visites du site (Google Analytics)

Les pages `/admin` ne sont plus comptées. Mais quand quelqu'un de l'équipe ouvre
le site public (psi.dz) depuis le bureau, ça compte encore comme une visite.
Il faut le faire **depuis le réseau du bureau** (pour récupérer la bonne IP).

- [ ] **Récupérer l'IP publique du bureau** : sur un PC branché au réseau du
      bureau, ouvrir https://www.whatismyip.com et noter l'adresse IPv4
      (ex. `41.xxx.xxx.xxx`). Si le bureau a plusieurs connexions internet (fibre +
      4G…), le faire pour chacune.
- [ ] **Déclarer l'IP comme trafic interne** : analytics.google.com →
      Admin (roue dentée en bas à gauche) → **Flux de données** → cliquer sur le
      flux du site (`G-7VJG0M6KY5`) → **Configurer les paramètres de la balise** →
      **Afficher plus** → **Définir le trafic interne** → **Créer** :
      - Nom de la règle : `Bureau PSI`
      - `traffic_type` : laisser `internal`
      - Type de correspondance : **L'adresse IP est égale à** → coller l'IP
      - Enregistrer.
- [ ] **Activer le filtre** : Admin → **Paramètres des données** →
      **Filtres de données** → filtre « Internal Traffic » → le passer de
      **Test** à **Actif** → Enregistrer.
      ⚠️ Tant qu'il est en « Test », rien n'est exclu.
- [ ] **Vérifier** : ouvrir psi.dz depuis le bureau, puis dans Google Analytics →
      Rapports → **Temps réel** : votre visite ne doit plus apparaître
      (compter quelques minutes).

À savoir :
- Le filtre ne s'applique qu'**à partir de son activation**, pas aux visites passées.
- Si l'IP du bureau change (box redémarrée, changement d'opérateur), il faudra la
  mettre à jour dans la règle. Demander à l'opérateur si l'IP est **fixe**.
- Les visites de l'équipe **hors du bureau** (téléphone en 4G, maison) resteront
  comptées.

---

## Mails @psi.dz rejetés (codes de connexion non reçus)

**Le problème** : Brevo envoie bien, mais le serveur mail d'Icosnet (mail.psi.dz)
refuse les mails venant de l'IP Brevo `77.32.148.25`, listée sur UCEPROTECT
(erreur `550 5.5.1 Server IP 77.32.148.25 listed as abusive`). Seules les boîtes
**@psi.dz** sont touchées ; Gmail & co reçoivent normalement.
Le DNS (SPF, DKIM, DMARC) est correct — rien à y changer.

- [ ] **Dépanner tout de suite** : dans l'admin, mettre temporairement une adresse
      Gmail sur le compte des personnes en @psi.dz qui ne reçoivent plus leur code
      (Radja…). Remettre l'adresse @psi.dz une fois le problème réglé.
- [ ] **Ticket Brevo** envoyé (demander un autre pool d'IP).
- [ ] **Appeler Icosnet** (la vraie solution) : leur demander d'autoriser les IP de
      Brevo (`include:spf.brevo.com`) pour les boîtes @psi.dz, ou de ne plus rejeter
      sur la seule liste UCEPROTECT. Leur donner l'erreur 550 ci-dessus.
- [ ] **Si rien n'a bougé après quelques jours** : passer les mails vers @psi.dz par
      un autre service d'envoi (Claude modifie `sendEmail()`, il faudra ajouter 2-3
      enregistrements DNS dans cPanel).

### Services d'envoi gratuits possibles (plan C)

⚠️ Tarifs et limites relevés en 2026 : **à revérifier sur leur site** avant de
choisir, ils changent souvent.

| Service | Gratuit | Limites de l'offre gratuite |
|---|---|---|
| **Brevo** (actuel) | oui | 300 mails / jour. IP **partagées** → c'est justement le problème actuel. |
| **Resend** | oui | 3 000 mails / mois **et** 100 / jour max · 1 seul domaine · IP partagées · pas d'IP dédiée en gratuit. Le plus simple à brancher. |
| **Mailjet** | oui | 6 000 mails / mois **et** 200 / jour max · logo/mention Mailjet possible dans les mails · IP partagées. |
| **SMTP2GO** | oui | 1 000 mails / mois **et** 200 / jour max · IP partagées. |
| **Amazon SES** | non (presque) | ~0,10 $ / 1 000 mails (quasi gratuit à nos volumes) · **carte bancaire obligatoire** · compte bloqué en « sandbox » au départ (il faut demander à AWS d'en sortir, 1-2 jours) · plus technique à configurer. |

Limites communes à **toutes** les offres gratuites :
- **IP partagées** avec d'autres clients : si un autre client spamme, l'IP peut être
  listée à son tour → **aucune garantie** que le problème ne revienne pas.
  UCEPROTECT niveaux 2/3 liste parfois des réseaux entiers (y compris de gros
  services). **Avant de choisir**, tester les IP du service sur
  https://mxtoolbox.com/blacklists.aspx.
- **Plafond journalier** : au-delà, les mails ne partent plus jusqu'au lendemain
  (codes de connexion compris). À nos volumes (codes 2FA + récaps +
  notifications) on reste normalement très en dessous, mais à surveiller.
- **Pas de support prioritaire** (réponse lente, parfois uniquement par email).
- La seule vraie garantie est une **IP dédiée** (payant, plusieurs dizaines d'€ / mois)
  — ou qu'**Icosnet arrête de bloquer** Brevo, ce qui est gratuit.
