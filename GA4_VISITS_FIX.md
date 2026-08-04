# Correction des visites GA4

## Problème identifié

### Données affichées pour des semaines futures
**Cause**: La requête GA4 utilisait `'28daysAgo'` au lieu du début du mois en cours, ce qui pouvait inclure des semaines partielles ou des semaines de mois précédents.

**Solution**: Modifié `getWeeklyPageViews()` pour interroger GA4 uniquement du début du mois en cours jusqu'à aujourd'hui.

## Note importante sur le total mensuel

Le total mensuel affiche **TOUTES les pages vues du site** (accueil, contact, produits, etc.), tandis que le graphique hebdomadaire affiche uniquement les pages produits par catégorie. C'est le comportement attendu :
- **Total mensuel** = vues globales du site
- **Graphique hebdomadaire** = vues des pages produits uniquement

Il est donc normal que le total mensuel soit supérieur à la somme des barres du graphique.

## Modifications apportées

### Fichier: `src/lib/ga4.ts`

#### Fonction `getWeeklyPageViews()` (ligne ~189-204)
**Avant**:
```typescript
try {
  // Utiliser runReport avec week et pagePath
  const today = formatDate(new Date());
  
  console.log('🔍 Appel runReport hebdomadaire:', {
    startDate: '28daysAgo',
    endDate: today,
  });
  
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: '28daysAgo',
        endDate: today,
      },
    ],
    dimensions: [
      { name: 'week' },
      { name: 'pagePath' },
    ],
    metrics: [{ name: 'screenPageViews' }],
  });
```

**Après**:
```typescript
try {
  // Calculer les semaines du mois en cours uniquement
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startDate = formatDate(startOfMonth);
  const endDate = formatDate(now);
  
  console.log('🔍 Appel runReport hebdomadaire:', {
    startDate,
    endDate,
    note: 'Du début du mois en cours à aujourd\'hui',
  });
  
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    dimensions: [
      { name: 'week' },
      { name: 'pagePath' },
    ],
    metrics: [{ name: 'screenPageViews' }],
  });
```

## Comportement après correction

### Total mensuel
- **Avant**: Affichait toutes les pages vues (y compris accueil, contact, etc.)
- **Après**: Affiche uniquement les vues des pages produits (cohérent avec le graphique)

### Graphique hebdomadaire
- **Avant**: Pouvait afficher des semaines partielles ou des semaines de mois précédents
- **Après**: Affiche uniquement les semaines du mois en cours (depuis le 1er du mois jusqu'à aujourd'hui)

## Tests à effectuer

1. [ ] Vérifier que le total mensuel correspond à la somme des barres du graphique hebdomadaire
2. [ ] Vérifier qu'aucune donnée n'apparaît pour les semaines futures
3. [ ] Vérifier que seules les semaines du mois en cours sont affichées
4. [ ] Vérifier que les données par catégorie sont correctement réparties

## Notes

- Les modifications sont rétrocompatibles et n'affectent pas l'API `/api/analytics`
- Le calcul des catégories reste inchangé
- La logique de mapping des semaines ISO vers "Sem 1-4" reste identique
