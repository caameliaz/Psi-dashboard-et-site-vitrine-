// Message d'erreur à afficher quand une requête API échoue, ou null si elle a réussi.
// Sert à ne plus laisser passer une écriture ratée en silence (un `await fetch(...)` dont on
// ne regarde pas `res.ok` donne l'impression que tout s'est enregistré).
export async function apiError(res: Response, action: string): Promise<string | null> {
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.error ?? `${action} a échoué (erreur ${res.status}).`;
}
