// Téléchargement direct d'un document en PDF (un clic) : le document HTML (render.ts) est dessiné dans une page cachée,
// capturé en image haute définition puis découpé en pages A4 (jsPDF). Chargé à la demande : n'alourdit pas le reste du site.
import { renderDocumentHtml } from './render';
import type { RenderableDocument } from './types';

const safeName = (n: string) => `${n.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()}.pdf`;

/** Capture l'élément `.page` d'un document (déjà affiché) et construit le PDF A4 (plusieurs pages si le document est long). */
export async function buildPdfFromElement(el: HTMLElement) {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  // html-to-image s'appuie sur le rendu du navigateur lui-même (mise en page identique à l'écran / à l'impression)
  const canvas = await toCanvas(el, { pixelRatio: 2.5, backgroundColor: '#ffffff' });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = 210;
  const pageH = 297;
  const pxPerPage = Math.round((canvas.width * pageH) / pageW);
  for (let y = 0, page = 0; y < canvas.height - 2; y += pxPerPage, page++) {
    const h = Math.min(pxPerPage, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('PDF : canvas indisponible');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, (h * pageW) / canvas.width, undefined, 'FAST');
  }
  return pdf;
}

/** Capture l'élément `.page` d'un document et l'enregistre directement en PDF. */
export async function savePdfFromElement(el: HTMLElement, fileName: string): Promise<void> {
  (await buildPdfFromElement(el)).save(fileName);
}

/** Dessine le document dans une iframe cachée, attend le logo, puis construit le PDF. */
export async function buildDocumentPdf(doc: RenderableDocument) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden';
  frame.srcdoc = renderDocumentHtml(doc, { origin: window.location.origin, title: doc.number });
  document.body.appendChild(frame);
  try {
    await new Promise<void>((resolve, reject) => { frame.onload = () => resolve(); frame.onerror = () => reject(new Error('PDF : chargement impossible')); });
    const d = frame.contentDocument;
    if (!d) throw new Error('PDF : document indisponible');
    await Promise.race([
      Promise.all(Array.from(d.images).map((im) => (im.complete ? Promise.resolve() : new Promise<void>((r) => { im.onload = im.onerror = () => r(); })))),
      new Promise<void>((r) => setTimeout(r, 4000)),
    ]);
    const page = d.querySelector('.page') as HTMLElement | null;
    if (!page) throw new Error('PDF : page introuvable');
    return await buildPdfFromElement(page);
  } finally {
    frame.remove();
  }
}

/** Télécharge directement le document en PDF (un clic). */
export async function downloadDocumentPdf(doc: RenderableDocument): Promise<void> {
  (await buildDocumentPdf(doc)).save(safeName(doc.number));
}
