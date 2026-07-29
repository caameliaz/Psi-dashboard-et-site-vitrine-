# Installation GA4 Analytics

Le dashboard affiche maintenant les statistiques de visites du site public via Google Analytics 4.

## Commande à exécuter

```bash
npm install @google-analytics/data
```

## Configuration requise

Ajoutez ces variables dans votre fichier `.env`:

```env
GA4_PROPERTY_ID=votre-property-id
GA4_CREDENTIALS={"type":"service_account","project_id":"..."}
```

Voir `GA4_SETUP.md` pour les instructions détaillées.

## Fonctionnement

- **Sans configuration GA4**: Des données de test s'affichent automatiquement
- **Avec configuration GA4**: Les vraies données de visites du site sont récupérées

Le graphique remplace l'ancien container "Source" (Origine des demandes) et affiche:
- Le nombre total de visites du site ce mois
- Un graphique en barres empilées montrant les visites par catégorie (Impression et Étiquettes) sur les 4 dernières semaines
