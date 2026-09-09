// ═══════════════════════════════════════════════════════════════════════════
// Notifie RollLink (service externe) quand une commande RollLink est prête
// (statut PRODUITE). Best-effort : ne doit JAMAIS faire échouer l'appelant —
// toute erreur est juste loguée (cf. checkCompletion dans order-stock.ts).
// ═══════════════════════════════════════════════════════════════════════════
export async function notifyRollLinkOrderReady(referenceCommande: string): Promise<void> {
  const baseUrl = process.env.ROLLINK_BACKEND_URL;
  const apiKey = process.env.ROLLINK_API_KEY;

  if (!baseUrl || !apiKey) {
    console.error('[rolllink-notify] ROLLINK_BACKEND_URL ou ROLLINK_API_KEY absente de .env — notification non envoyée pour', referenceCommande);
    return;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/stock-integration/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ referenceCommande }),
    });
    if (!res.ok) {
      console.error(`[rolllink-notify] RollLink a répondu ${res.status} pour ${referenceCommande}`);
    }
  } catch (error) {
    console.error('[rolllink-notify] échec de l\'appel vers RollLink pour', referenceCommande, error);
  }
}
