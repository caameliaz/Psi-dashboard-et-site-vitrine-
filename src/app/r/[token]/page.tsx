import type { Metadata } from 'next';
import { findByToken, markScanned, buildLines } from '@/lib/receipt';
import { ConfirmReceipt } from './ConfirmReceipt';

// Page PUBLIQUE ouverte par le QR code collé sur le colis : récapitulatif (produits + quantités, SANS prix ni
// coordonnées) et bouton « Valider la réception ». Jamais indexée. Toujours rendue à la demande (état à jour).
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Réception de votre commande', robots: { index: false, follow: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findByToken(token);

  if (!found) {
    return (
      <Shell>
        <div className="rounded-2xl border border-[#E0E0E0] bg-white p-6 text-center">
          <p className="text-[16px] font-bold text-[#263238]">Lien introuvable</p>
          <p className="text-[13px] text-[#4D4D4D] mt-2">Ce QR code n&apos;est plus valide. Contactez-nous au 0770 16 90 60 ou contact@psi.dz.</p>
        </div>
      </Shell>
    );
  }

  const { kind, row } = found;
  // Le client a ouvert la page : mémorisé pour l'équipe (une seule fois, première ouverture).
  await markScanned(kind, row.id).catch(() => {});

  const lines = buildLines(row.items);
  const confirmedAt = row.receiptConfirmedAt ?? (row.status === 'LIVRE' ? row.deliveredAt : null);
  const state =
    confirmedAt ? 'confirmed'
    : row.source === 'ROLLINK' ? 'rolllink'
    : row.status === 'ANNULE' || row.status === 'RETOURNE' ? 'unavailable'
    : row.status === 'VALIDE' || row.status === 'PRODUITE' ? 'ready'
    : 'not_ready';

  return (
    <Shell>
      {/* Même style que le récapitulatif du panier du site public, sans les prix */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6">
        <h1 className="text-[17px] font-bold text-[#263238] mb-5">Récapitulatif</h1>

        <div className="flex flex-col gap-4">
          {lines.map((l, i) => (
            <div key={i} className="flex items-baseline gap-2 text-[15px] text-[#4D4D4D]">
              <span className="font-bold text-[#263238] tabular-nums">{l.quantite}×</span>
              <span>{l.productId ? 'Réf. ' : ''}{l.designation}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-[#F0F4F8]">
          <ConfirmReceipt token={token} state={state} confirmedAt={confirmedAt ? confirmedAt.toISOString() : null} />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="mx-auto max-w-md px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-psi-transparent.png" alt="PSI — Paper Solutions Industry" className="h-16 w-auto" />
        </div>
        {children}
        <p className="text-center text-[11px] text-[#8A9BB5]">Paper Solutions Industry · Centre des affaires El Qods, Chéraga, Alger · 0770 16 90 60 · contact@psi.dz</p>
      </div>
    </div>
  );
}
