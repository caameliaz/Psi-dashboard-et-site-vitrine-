# Comptes de test (seed)

Générés par `prisma/seed.ts` — valables après un `npx prisma db seed`.

| Rôle       | Nom            | Email            | Mot de passe  | Statut     |
|------------|----------------|------------------|---------------|------------|
| Admin      | Admin PSI      | admin@psi.dz     | `password`    | Actif      |
| Employé    | Amira Bensaid  | amira@psi.dz     | `Amira2026!`  | Actif      |
| Employé    | Tariq Meziane  | tariq@psi.dz     | `Tariq2026!`  | Actif      |
| Employé    | Samia Oukil    | samia@psi.dz     | `Samia2026!`  | **Inactif** (pour tester le blocage de connexion) |
| Admin      | Youcef         | yms211201@gmail.com | `password` | Actif      |

⚠️ L'authentification à deux facteurs est temporairement désactivée (voir [src/lib/auth.ts](src/lib/auth.ts)) — la connexion se fait directement avec email + mot de passe, sans code OTP.

Ce fichier est pour un usage local de dev/test uniquement — ne pas committer ces identifiants sur un dépôt public.
