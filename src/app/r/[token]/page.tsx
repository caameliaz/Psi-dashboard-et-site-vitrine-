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
      <div className="text-center">
        <p className="text-[12px] font-bold text-[#4CAF4F] uppercase tracking-wide">{kind === 'order' ? 'Votre commande' : 'Votre devis'}</p>
        <h1 className="text-[24px] font-semibold text-[#263238] mt-1">{row.ref}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {lines.map((l, i) => (
          <div key={i} className="rounded-2xl border border-[#E0E0E0] bg-white p-4 shadow-[0_2px_10px_rgba(171,190,209,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-bold text-[#263238] leading-snug">{l.designation}</p>
              <span className="shrink-0 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 text-[13px] font-bold text-[#166534] whitespace-nowrap">× {l.quantite}</span>
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[['Laize (mm)', l.laize], ['Grammage', l.grammage], ['Mandrin Ø', l.mandrin], ['Mètres', l.metres]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-[#F8FAFC] px-1 py-2">
                  <dt className="text-[10px] font-semibold text-[#8A9BB5] uppercase leading-tight">{k}</dt>
                  <dd className="text-[14px] font-bold text-[#263238] mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <ConfirmReceipt token={token} state={state} confirmedAt={confirmedAt ? confirmedAt.toISOString() : null} />
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
