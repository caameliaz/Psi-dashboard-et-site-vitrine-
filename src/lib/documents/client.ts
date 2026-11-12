// Utilitaires navigateur pour les documents : impression (« Enregistrer en PDF »), Excel, requêtes API.
// Même principe que les étiquettes (src/lib/label-print.ts) : une fenêtre dédiée + impression du navigateur.
import { renderDocumentHtml } from './render';
import type { RenderableDocument } from './types';

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Erreur');
  return json as T;
}

/** Ouvre la fenêtre d'impression — À APPELER DANS LE CLIC (sinon le navigateur la bloque comme un pop-up). */
export function openPrintWindow(): Window | null {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (w) w.document.write('<p style="font-family:sans-serif;padding:24px">Préparation du document…</p>');
  return w;
}

/** Écrit le document dans la fenêtre `w`, attend le logo puis lance l'impression (→ « Enregistrer au format PDF »). */
export async function printRenderable(w: Window, doc: RenderableDocument): Promise<void> {
  w.document.open();
  w.document.write(renderDocumentHtml(doc, { origin: window.location.origin }));
  w.document.close();
  const imgs = Array.from(w.document.images);
  await Promise.race([
    Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise<void>((r) => { im.onload = im.onerror = () => r(); })))),
    new Promise<void>((r) => setTimeout(r, 4000)),
  ]);
  w.focus();
  w.print();
}

/** Imprime un document enregistré (le charge, puis ouvre la boîte d'impression). */
export async function printDocumentById(id: string): Promise<void> {
  const w = openPrintWindow();
  if (!w) throw new Error("Le navigateur a bloqué la fenêtre d'impression : autorisez les pop-ups pour ce site.");
  try {
    const { doc } = await api<{ doc: RenderableDocument }>(`/api/documents/${id}`);
    await printRenderable(w, doc);
  } catch (e) {
    w.close();
    throw e;
  }
}

/** Télécharge le fichier Excel d'un document enregistré. */
export function downloadExcel(id: string) {
  const a = document.createElement('a');
  a.href = `/api/documents/${id}/excel`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const DOC_NAMES = { BL: 'Bon de livraison', FACTURE: 'Facture', PROFORMA: 'Proforma' } as const;
export const DOC_SHORT = { BL: 'BL', FACTURE: 'Facture', PROFORMA: 'Proforma' } as const;
