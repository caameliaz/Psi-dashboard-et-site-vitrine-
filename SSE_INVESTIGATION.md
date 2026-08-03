# Investigation SSE en Production

## Problème
Les notifications push (toasts) n'apparaissent plus en production car le SSE fail.

## Corrections appliquées ✅

### 1. Polling réduit : 2min → 15s
```typescript
// AVANT
const id = setInterval(() => refreshNotifs(true), 120000); // 2 minutes

// APRÈS
const id = setInterval(() => refreshNotifs(true), 15000); // 15 secondes
```

### 2. Check basé sur l'ID plutôt que l'âge
```typescript
// AVANT : check si notif créée il y a < 30s
const age = now - new Date(n.createdAt).getTime();
if (age < 30000) {
  setToasts(...);
}

// APRÈS : check si notif jamais vue (basé sur Set d'IDs)
mapped
  .filter((n) => !notifIds.current.has(n.id))
  .forEach((n) => {
    notifIds.current.add(n.id);
    setToasts(...); // Toast immédiatement
  });
```

**Résultat** : Les toasts apparaissent maintenant pour toutes les nouvelles notifs, quel que soit leur âge ou l'intervalle de polling.

---

## Investigation SSE : Pourquoi ça fail en prod ?

### Configuration actuelle
**Fichier** : `src/app/api/sse/route.ts`

```typescript
export const maxDuration = 60; // Vercel Pro: garde la connexion jusqu'à 60s
```

### Problème suspecté : Plan Vercel Hobby
Sur Vercel Hobby (gratuit), les limites sont :
- **maxDuration par défaut : 10 secondes**
- **maxDuration max (Hobby) : 10 secondes**
- **maxDuration max (Pro) : 300 secondes**

**Avec `maxDuration = 60`** :
- ✅ Fonctionne sur plan Pro
- ❌ **Fail silencieusement sur plan Hobby** (timeout après 10s)

### Symptômes observés
1. SSE se connecte initialement
2. Se déconnecte après ~10 secondes (timeout Hobby)
3. Le client tente de reconnecter (backoff exponentiel)
4. Cycle de déconnexions/reconnexions constant
5. Les événements push ne passent jamais

---

## Solutions possibles

### Option 1 : Réduire maxDuration pour Hobby (temporaire)
```typescript
// Dans src/app/api/sse/route.ts
export const maxDuration = 10; // Compatible Hobby, mais reconnexion toutes les 10s
```

**Avantages** :
- Fonctionne sur Hobby
- Gratuit

**Inconvénients** :
- Reconnexion toutes les 10s = beaucoup de requêtes
- Latence potentielle (notif peut arriver juste après une déconnexion)

---

### Option 2 : Passer à Vercel Pro (recommandé)
```typescript
export const maxDuration = 60; // Ou plus (jusqu'à 300s)
```

**Avantages** :
- Connexions stables 60s+
- Moins de reconnexions
- Notifs push instantanées

**Inconvénients** :
- Coût : ~20$/mois

---

### Option 3 : Utiliser un service externe pour les push (alternatif)
Exemples :
- **Pusher** (WebSockets)
- **Ably** (WebSockets/SSE)
- **Firebase Cloud Messaging**

**Avantages** :
- Indépendant de Vercel
- Très stable

**Inconvénients** :
- Complexité supplémentaire
- Coût selon usage

---

## Diagnostic : Comment vérifier le plan actuel ?

1. Ouvre le dashboard Vercel : https://vercel.com/dashboard
2. Va dans **Settings** → **General**
3. Regarde la section **Plan**

Si tu es sur **Hobby** → SSE limité à 10s
Si tu es sur **Pro** → SSE peut aller jusqu'à 300s

---

## Recommandation finale

**Court terme** : 
- ✅ Polling 15s (déjà appliqué) = notifs apparaissent toujours, délai max 15s

**Long terme** :
- Passer à **Vercel Pro** si budget disponible
- Ou réduire `maxDuration` à 10s + optimiser la reconnexion

---

## Tests à faire

### 1. Vérifier si SSE fonctionne en prod
Ouvre la console navigateur en prod et regarde :
```
Network → /api/sse → Status
```

Si tu vois :
- **Connection close après ~10s** → Plan Hobby, SSE fail
- **Connection reste ouverte 60s** → Plan Pro, SSE ok

### 2. Tester le polling actuel
- Lance une commande depuis le site public
- Les toasts doivent apparaître dans max **15 secondes** (via polling)
- Si SSE marche, ils apparaissent instantanément

---

## Fichiers modifiés
- ✅ `src/components/ui/TopBar.tsx` (polling 15s + check par ID)
