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
    { key: 'laize', title: 'Laize', unit: '(mm)', show: true },
    { key: 'grammage', title: 'Grammage', unit: '(g/m²)', show: lines.some((l) => hasVal(l.grammage)) },
    { key: 'mandrin', title: 'Mandrin Ø', unit: '(mm)', show: lines.some((l) => hasVal(l.mandrin)) },
    { key: 'metres', title: 'Mètres', unit: '(m)', show: true },
    { key: 'quantite', title: 'Nbre', unit: 'Rouleaux', show: true },
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
      <div className="text-center">
        <p className="text-[12px] font-bold text-[#4CAF4F] uppercase tracking-wide">{kind === 'order' ? 'Votre commande' : 'Votre devis'}</p>
        <h1 className="text-[24px] font-semibold text-[#263238] mt-1">{row.ref}</h1>
      </div>

      {/* Même tableau que l'étiquette du colis (colonne sans aucune valeur masquée) */}
      <div className="rounded-2xl border border-[#E0E0E0] bg-white p-3 shadow-[0_2px_10px_rgba(171,190,209,0.25)]">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="border border-[#263238] px-1.5 py-2 text-[12px] font-bold text-[#263238] leading-tight">
                  {c.title}<br />{c.unit}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} className="border border-[#263238] px-1.5 py-2.5 text-[15px] font-semibold text-[#263238]">{l[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
