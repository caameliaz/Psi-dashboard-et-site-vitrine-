import type { Metadata } from 'next';
import { renderDocumentHtml } from '@/lib/documents/render';
import { findByShareToken, qrForDocument, toRenderable } from '@/lib/documents/service';
import { DocumentViewer } from './DocumentViewer';

// Page PUBLIQUE ouverte depuis le lien du mail : le document (BL, facture ou proforma) à consulter, imprimer / enregistrer en PDF
// ou télécharger en Excel. Jeton non devinable (64 car.), jamais indexée, toujours rendue à la demande.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Votre document — PSI', robots: { index: false, follow: false } };

export default async function SharedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await findByShareToken(token);

  if (!row) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-5">
        <div className="rounded-2xl border border-[#E0E0E0] bg-white p-6 text-center max-w-sm">
          <p className="text-[16px] font-bold text-[#263238]">Lien introuvable</p>
          <p className="text-[13px] text-[#4D4D4D] mt-2">Ce lien n&apos;est plus valide. Contactez-nous au 0770 16 90 60 ou contact@psi.dz.</p>
        </div>
      </main>
    );
  }

  const doc = toRenderable(row, await qrForDocument(row));
  return <DocumentViewer html={renderDocumentHtml(doc, { title: doc.number })} token={token} number={doc.number} />;
}
