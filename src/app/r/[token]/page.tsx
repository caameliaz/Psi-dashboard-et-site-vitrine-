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
  const hasVal = (v: string) => v !== '—' && v.trim() !== '';
  const cols = ([
    { key: 'format', title: 'Référence', show: true, left: true },
    { key: 'grammage', title: 'Grammage', show: lines.some((l) => hasVal(l.grammage)), left: false },
    { key: 'mandrin', title: 'Mandrin Ø', show: lines.some((l) => hasVal(l.mandrin)), left: false },
    { key: 'metres', title: 'Mètres', show: lines.some((l) => hasVal(l.metres)), left: false },
    { key: 'quantite', title: 'Nbre rouleaux', show: true, left: false },
  ] as const).filter((c) => c.show);
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
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-5">
        <h1 className="text-[17px] font-bold text-[#263238] mb-5">Récapitulatif</h1>

        {/* Tableau dans le style du détail de commande : en-tête grise, lignes séparées */}
        <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                {cols.map((c) => (
                  <th key={c.key} className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#8A9BB5] leading-tight ${c.left ? 'text-left' : 'text-right'}`}>{c.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-[#F0F4F8] last:border-b-0">
                  {cols.map((c) => (
                    <td key={c.key} className={`px-3 py-3.5 text-[14px] ${c.left ? 'text-left font-semibold text-[#263238]' : c.key === 'quantite' ? 'text-right font-bold text-[#263238] tabular-nums' : 'text-right text-[#4D4D4D] tabular-nums'}`}>{l[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
