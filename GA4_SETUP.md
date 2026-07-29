# Configuration Google Analytics 4 (GA4)

## Installation

1. Installer le package GA4:
```bash
npm install @google-analytics/data
```

## Configuration

1. Créer un projet Google Cloud et activer l'API Google Analytics Data
2. Créer un compte de service et télécharger le fichier JSON des credentials
3. Ajouter les variables d'environnement dans `.env`:

```env
# Google Analytics 4
GA4_PROPERTY_ID=votre-property-id
GA4_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

## Comment obtenir les credentials

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer l'API "Google Analytics Data API"
4. Créer un compte de service:
   - IAM & Admin → Comptes de service → Créer un compte de service
   - Donner le rôle "Visualiseur Google Analytics"
5. Créer une clé JSON pour ce compte de service
6. Copier le contenu du fichier JSON (en une seule ligne) dans `GA4_CREDENTIALS`
7. Trouver votre Property ID dans Google Analytics:
   - Admin → Informations sur la propriété → ID DE LA PROPRIÉTÉ

## Fonctionnement

Le système récupère automatiquement:
- Le nombre total de visites du site ce mois
- Les visites par page de catégorie produit (Impression et Étiquettes)
- Les visites des 4 dernières semaines sous forme de graphique en barres empilées

Si GA4 n'est pas configuré, des données de test s'affichent par défaut.
