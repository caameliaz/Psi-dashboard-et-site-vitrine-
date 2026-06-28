# PSI — Référentiel des routes

## Pages publiques — `src/app/(public)/`

| Route | Fichier | Description |
|---|---|---|
| `/` | `page.tsx` | Home : hero, produits, à propos, CTA |
| `/products` | `products/page.tsx` | Catalogue produits avec filtres |
| `/cart` | `cart/page.tsx` | Panier |
| `/checkout` | `checkout/page.tsx` | Finaliser commande |
| `/quote` | `quote/page.tsx` | Formulaire demande de devis |
| `/contact` | `contact/page.tsx` | Formulaire de contact |

Layout public : `src/app/(public)/layout.tsx` (Navbar + Footer + bouton WhatsApp flottant)

---

## Pages admin — `src/app/admin/`

| Route | Fichier | Accès | Description |
|---|---|---|---|
| `/admin/login` | `login/page.tsx` | Public | Connexion admin |
| `/admin/dashboard` | `dashboard/page.tsx` | Admin + Employé | Vue d'ensemble, stats, notifs |
| `/admin/requests` | `requests/page.tsx` | Admin + Employé | Commandes, devis, messages |
| `/admin/products` | `products/page.tsx` | Admin (écriture) / Employé (lecture) | Gestion produits & catégories |
| `/admin/clients` | `clients/page.tsx` | Admin + Employé | Fiches clients |
| `/admin/history` | `history/page.tsx` | Admin (tout) / Employé (ses actions) | Journal d'audit |
| `/admin/templates` | `templates/page.tsx` | Admin (écriture) / Employé (lecture) | Templates messages WhatsApp/SMS |
| `/admin/content` | `content/page.tsx` | Admin uniquement | Contenu du site public |
| `/admin/users` | `users/page.tsx` | Admin uniquement | Gestion utilisateurs |
| `/admin/profile` | `profile/page.tsx` | Admin + Employé | Profil perso + déconnexion appareils |

Layout admin : `src/app/admin/layout.tsx` (Sidebar + header)

---

## API Routes — `src/app/api/`

### Produits
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | Public | Liste produits actifs |
| GET | `/api/products?all=true` | Admin + Employé | Tous les produits (actifs + inactifs) |
| POST | `/api/products` | Admin | Créer un produit |
| PATCH | `/api/products/[id]` | Admin | Modifier un produit |
| DELETE | `/api/products/[id]` | Admin | Supprimer un produit |
| POST | `/api/products/[id]/fields` | Admin | Ajouter/modifier valeur d'un champ custom sur un produit |
| DELETE | `/api/products/[id]/fields?definitionId=` | Admin | Supprimer valeur d'un champ custom d'un produit |
| GET | `/api/categories` | Public | Liste catégories (avec count produits) |
| POST | `/api/categories` | Admin | Créer une catégorie |
| PATCH | `/api/categories/[id]` | Admin | Renommer / réordonner une catégorie |
| DELETE | `/api/categories/[id]` | Admin | Supprimer une catégorie (bloqué si produits liés) |
| GET | `/api/products/fields` | Admin | Définitions de champs custom |
| POST | `/api/products/fields` | Admin | Créer une définition de champ custom |
| DELETE | `/api/products/fields/[id]` | Admin | Supprimer une définition (cascade sur les valeurs) |

### Commandes
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/orders` | Admin + Employé | Liste commandes |
| POST | `/api/orders` | Public + Admin + Employé | Créer une commande |
| GET | `/api/orders/[id]` | Admin + Employé | Détail commande |
| PATCH | `/api/orders/[id]` | Admin + Employé | Modifier statut / notes |
| PATCH | `/api/orders/[id]/cancel` | Admin + Employé | Annuler avec justificatif |

### Devis
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/quotes` | Admin + Employé | Liste devis |
| POST | `/api/quotes` | Public + Admin + Employé | Créer un devis |
| GET | `/api/quotes/[id]` | Admin + Employé | Détail devis |
| PATCH | `/api/quotes/[id]` | Admin + Employé | Modifier statut / champs admin |
| PATCH | `/api/quotes/[id]/convert` | Admin + Employé | Convertir en commande |
| PATCH | `/api/quotes/[id]/cancel` | Admin + Employé | Annuler avec justificatif |

### Contact
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/contact` | Admin + Employé | Liste messages contact |
| POST | `/api/contact` | Public | Envoyer un message |
| PATCH | `/api/contact/[id]` | Admin + Employé | Modifier statut / notes |

### Clients
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/clients` | Admin + Employé | Liste clients |
| GET | `/api/clients/[id]` | Admin + Employé | Fiche client complète |
| PATCH | `/api/clients/[id]` | Admin + Employé | Modifier infos client |
| POST | `/api/clients/[id]/phones` | Admin + Employé | Ajouter un numéro |
| DELETE | `/api/clients/[id]/phones/[phoneId]` | Admin + Employé | Supprimer un numéro |
| POST | `/api/clients/[id]/notes` | Admin + Employé | Ajouter une note interne |
| DELETE | `/api/clients/[id]/notes/[noteId]` | Admin + Employé | Supprimer une note |

### Notifications
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Admin + Employé | Notifs de l'utilisateur courant |
| PATCH | `/api/notifications/read` | Admin + Employé | Marquer tout lu |
| PATCH | `/api/notifications/[id]/read` | Admin + Employé | Marquer une notif lue |

### Historique
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/audit` | Admin (tout) / Employé (ses actions) | Journal d'audit |

### Templates
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/templates` | Admin + Employé | Liste templates |
| POST | `/api/templates` | Admin | Créer un template |
| PATCH | `/api/templates/[id]` | Admin | Modifier un template |
| DELETE | `/api/templates/[id]` | Admin | Supprimer un template |

### Statuts personnalisés
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/statuses` | Admin + Employé | Liste statuts custom |
| POST | `/api/statuses` | Admin | Créer un statut |
| PATCH | `/api/statuses/[id]` | Admin | Modifier un statut |
| DELETE | `/api/statuses/[id]` | Admin | Supprimer un statut |

### Contenu site
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/content` | Public | Récupérer le contenu |
| PUT | `/api/content` | Admin | Sauvegarder le contenu |

### Utilisateurs
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | Liste utilisateurs |
| POST | `/api/users` | Admin | Créer un utilisateur |
| PATCH | `/api/users/[id]` | Admin | Modifier rôle / statut |
| DELETE | `/api/users/[id]` | Admin | Supprimer un utilisateur |
| POST | `/api/users/disconnect-all` | Admin + Employé | Déconnecter tous les appareils |

### Auth
| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | Public | Auth.js handler (login / logout / session) |

---

## Composants partagés — `src/components/`

| Fichier | Usage |
|---|---|
| `Sidebar.tsx` | Navigation admin |
| `Navbar.tsx` | Navigation site public |
| `Footer.tsx` | Pied de page public |
| `ProductCard.tsx` | Card produit site public |
| `CartSummary.tsx` | Récapitulatif panier |
| `ui/Modal.tsx` | Modal générique (admin) |
| `ui/StatusPill.tsx` | Badge statut coloré |
| `ui/Button.tsx` | Bouton (non utilisé — à adopter) |
| `ui/Input.tsx` | Input (non utilisé — à adopter) |
| `ui/Badge.tsx` | Badge générique (non utilisé) |

---

## Lib & utilitaires — `src/lib/`

| Fichier | Rôle |
|---|---|
| `prisma.ts` | Instance Prisma singleton |
| `auth.ts` | Config Auth.js v5 |
| `utils.ts` | `initials()`, `inputClass`, `labelClass` |
| `mock-data.ts` | Mock produits (remplacé par API Fonc. 2) |
| `clients-data.ts` | Mock clients (remplacé par API Fonc. 7) |
| `role-context.tsx` | React Context rôle (remplacé par session Auth Fonc. 1) |

---

## Types TypeScript — `src/types/`

| Fichier | Contenu |
|---|---|
| `index.ts` | Toutes les interfaces : Product, Client, Order, Quote, User, Notification, AuditLog... |
| `next-auth.d.ts` | Augmentation session NextAuth (role, id) |
