# PSI — Structure des fichiers

## Site public `src/app/(public)/`

| Fichier | Rôle |
|---------|------|
| `layout.tsx` | Layout public : Navbar + Footer |
| `page.tsx` | Page d'accueil (hero, produits, à propos, contact) |
| `products/page.tsx` | Catalogue produits |
| `cart/page.tsx` | Panier |
| `checkout/page.tsx` | Formulaire commande (passe la commande en DB) |
| `quote/page.tsx` | Formulaire demande de devis |
| `contact/page.tsx` | Formulaire de contact |

## Admin `src/app/admin/`

| Fichier | Rôle |
|---------|------|
| `layout.tsx` | Layout admin : Sidebar + TopBar |
| `login/page.tsx` | Page de connexion admin |
| `dashboard/page.tsx` | Dashboard : post-it, stats, top produits, tableau récent |
| `requests/page.tsx` | Commandes & devis — tableau, onglets, panel détail |
| `clients/page.tsx` | Fiches clients — tableau + slide-in + historique |
| `products/page.tsx` | Gestion produits — CRUD |
| `history/page.tsx` | Historique des actions (audit log) |
| `content/page.tsx` | Édition contenu site public |
| `users/page.tsx` | Gestion utilisateurs + permissions |
| `profile/page.tsx` | Profil de l'admin connecté |

## Composants `src/components/`

| Fichier | Rôle |
|---------|------|
| `Navbar.tsx` | Navbar site public |
| `Footer.tsx` | Footer site public (réseaux sociaux, liens, contact) |
| `Sidebar.tsx` | Sidebar admin — collapse/expand, nav items |
| `ProductCard.tsx` | Carte produit (site public) |
| `CartSummary.tsx` | Résumé panier |

## Composants UI `src/components/ui/`

| Fichier | Rôle |
|---------|------|
| `TopBar.tsx` | Barre admin en haut — cloche notifications + panel |
| `RequestPanel.tsx` | Modal détail commande/devis — actions WhatsApp/email/statut |
| `StatusPill.tsx` | Badge coloré statut (En attente, Contacté, Livré, Annulé) |
| `AdminSelect.tsx` | Dropdown custom style PSI (vert focus, rounded-xl) |
| `WilayaSelect.tsx` | Select des 58 wilayas algériennes |
| `Modal.tsx` | Modal générique avec overlay blur |
| `Button.tsx` | Composant bouton réutilisable |
| `Input.tsx` | Composant input réutilisable |
| `Badge.tsx` | Badge générique |

## API Routes `src/app/api/`

### Produits
| Route | Méthodes | Rôle |
|-------|----------|------|
| `/api/products` | GET, POST | Liste produits / créer produit |
| `/api/products/[id]` | GET, PATCH, DELETE | Détail / modifier / supprimer |
| `/api/categories` | GET, POST | Catégories |
| `/api/categories/[id]` | PATCH, DELETE | Modifier / supprimer catégorie |
| `/api/products/fields` | GET, POST | Champs custom (définitions) |
| `/api/products/fields/[id]` | PATCH, DELETE | Modifier / supprimer champ |
| `/api/products/[id]/fields` | GET | Valeurs custom d'un produit |

### Commandes & Devis
| Route | Méthodes | Rôle |
|-------|----------|------|
| `/api/orders` | GET, POST | Liste commandes / créer |
| `/api/orders/[id]` | GET, PATCH | Détail / modifier statut |
| `/api/orders/[id]/cancel` | PATCH | Annuler une commande |
| `/api/quotes` | GET, POST | Liste devis / créer |
| `/api/quotes/[id]` | GET, PATCH | Détail / modifier statut |
| `/api/quotes/[id]/cancel` | PATCH | Annuler un devis |
| `/api/quotes/[id]/convert` | POST | Convertir devis → commande |

### Clients
| Route | Méthodes | Rôle |
|-------|----------|------|
| `/api/clients` | GET, POST | Liste clients / créer |
| `/api/clients/[id]` | GET, PATCH, DELETE | Fiche client |
| `/api/clients/[id]/phones` | POST | Ajouter téléphone |
| `/api/clients/[id]/phones/[phoneId]` | PATCH, DELETE | Modifier / supprimer tél |
| `/api/clients/[id]/notes` | GET, POST | Notes internes client |
| `/api/clients/[id]/notes/[noteId]` | DELETE | Supprimer note |

### Contact
| Route | Méthodes | Rôle |
|-------|----------|------|
| `/api/contact` | GET, POST | Messages contact |
| `/api/contact/[id]` | PATCH | Marquer traité |

### Users & Auth
| Route | Méthodes | Rôle |
|-------|----------|------|
| `/api/auth/[...nextauth]` | ALL | NextAuth — login/logout/session |
| `/api/users` | GET, POST | Liste users / créer |
| `/api/users/[id]` | GET, PATCH, DELETE | Modifier / supprimer user |
| `/api/users/disconnect-all` | POST | Invalider toutes les sessions |

### Notifications & Audit
| Route | Méthodes | Rôle |
|-------|----------|------|
| `/api/notifications` | GET | Liste notifs de l'user connecté |
| `/api/notifications/[id]/read` | PATCH | Marquer une notif lue |
| `/api/notifications/read` | POST | Tout marquer lu |
| `/api/audit` | GET | Historique des actions |

### Contenu & Config
| Route | Méthodes | Rôle |
|-------|----------|------|
| `/api/content` | GET, PUT | Contenu site public |
| `/api/templates` | GET, POST | Templates messages |
| `/api/templates/[id]` | PATCH, DELETE | Modifier / supprimer template |
| `/api/statuses` | GET, POST | Statuts personnalisés |
| `/api/statuses/[id]` | PATCH, DELETE | Modifier / supprimer statut |

## Auth & Middleware

| Fichier | Rôle |
|---------|------|
| `src/lib/auth.ts` | Config NextAuth v5 — provider Credentials, JWT, callbacks session/jwt, sessionVersion |
| `src/middleware.ts` | Protège `/admin/*` et routes API — redirige vers `/admin/login` si pas de session |
| `src/app/api/auth/[...nextauth]/route.ts` | Handler NextAuth (GET + POST) |
| `src/app/admin/login/page.tsx` | Formulaire login — `signIn("credentials")` → `/admin/dashboard` |

**Flow auth** : Login → NextAuth hache le mdp → JWT signé → cookie httpOnly → chaque requête vérifie `sessionVersion` en DB.

## Lib `src/lib/`

| Fichier | Rôle |
|---------|------|
| `auth.ts` | Config NextAuth (credentials provider, JWT, session + sessionVersion) |
| `prisma.ts` | Client Prisma singleton |
| `role-context.tsx` | Context React rôle admin/employé |
| `clients-data.ts` | Type `ClientRecord` (interface UI pour les clients) |
| `utils.ts` | Fonctions utilitaires (initials, formatDate, etc.) |

## Prisma `prisma/`

| Fichier | Rôle |
|---------|------|
| `schema.prisma` | Schéma DB complet |
| `seed.ts` | Données initiales (produits réels, clients fictifs, comptes admin) |
| `migrations/` | Historique des migrations DB |

## Autres

| Fichier | Rôle |
|---------|------|
| `TESTS.md` | Workflows complets de l'app |
| `STRUCTURE.md` | Ce fichier |
| `DATABASE.md` | Contenu de la base de données |
| `.env` | Variables d'environnement (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL) |
| `next.config.ts` | Config Next.js |
| `tailwind.config.ts` | Config Tailwind |

## Photos produits

Les photos de rouleaux sont à placer dans **`public/produits/`** :
- `80-80.jpg` → rouleau 80/80
- `80-75.jpg` → rouleau 80/75
- `80-60.jpg` → rouleau 80/60
- `57-50.jpg` → rouleau 57/50
- `57-40.jpg` → rouleau 57/40
- `57-30.jpg` → rouleau 57/30

Le champ `photo` dans le modèle `Product` (DB) stocke le chemin relatif depuis `/public`, ex: `/produits/80-80.jpg`.
Pour l'instant les produits n'ont pas de photo — tu peux les ajouter via l'admin ou directement dans la DB Neon.
