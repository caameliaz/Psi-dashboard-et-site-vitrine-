'use client';

import { useEffect, useState } from 'react';
import { LabelPrintModal } from '@/components/ui/LabelPrintModal';
import { qrSvg, receiptUrl } from '@/lib/label-print';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.psi.dz';

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

// Détail d'une commande/devis : « Colis & documents » (QR + impression de l'étiquette) puis
// « Preuve de livraison » (le client a-t-il scanné le QR / confirmé la réception ?).
export function ReceiptSection({
  kind, id, refLabel, sub, token, labelCount, scannedAt, confirmedAt, seenAt, rolllink, onChanged,
}: {
  kind: 'order' | 'quote';
  id: string;
  refLabel: string;
  sub?: string;
  token?: string;
  labelCount?: number;
  scannedAt?: string | null;
  confirmedAt?: string | null;
  seenAt?: string | null;
  rolllink?: boolean;
  onChanged?: () => void;
}) {
  const [qr, setQr] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token) return;
    qrSvg(receiptUrl(token, SITE_URL)).then((svg) => { if (alive) setQr(svg); }).catch(() => {});
    return () => { alive = false; };
  }, [token]);

  const markSeen = async () => {
    setBusy(true);
    try {
      await fetch('/api/receipt/seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id }) });
      onChanged?.();
    } finally { setBusy(false); }
  };

  // État de la preuve de livraison
  const proof = confirmedAt
    ? { dot: '#4CAF4F', title: 'Réception confirmée par le client', desc: `Le ${fmt(confirmedAt)} (QR code)` }
    : scannedAt
      ? { dot: '#F59E0B', title: 'QR code scanné — réception non confirmée', desc: `Scanné le ${fmt(scannedAt)}. En attente de la confirmation du client` }
      : { dot: '#64748B', title: 'QR code non scanné', desc: 'En attente de confirmation de réception par le client' };

  const sectionTitle = 'text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-2';

  return (
    <>
      <div>
        <p className={sectionTitle}>Colis &amp; documents</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-[#EEF4FF] flex items-center justify-center text-[#3B6FE0]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" /></svg>
          </div>
          <div>
            <p className="text-[18px] font-bold text-[#0F172A] leading-none">{labelCount ?? 0}</p>
            <p className="text-[12px] text-[#8A9BB5]">colis / cartons générés</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center gap-4">
          <div className="w-[104px] h-[104px] shrink-0 rounded-lg bg-white p-2 border border-[#E2E8F0]">
            {qr
              ? <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
              : <div className="w-full h-full rounded bg-[#F2F4F7] animate-pulse" />}
          </div>
          <div className="min-w-0 flex flex-col gap-1.5 items-start">
            <p className="text-[13px] font-bold text-[#0F172A]">QR Code {kind === 'order' ? 'commande' : 'devis'}</p>
            <p className="text-[12px] text-[#6B7A90] leading-snug">À coller sur le colis. Le client le scanne à la réception pour confirmer la livraison.</p>
            <button type="button" onClick={() => setShowPrint(true)}
              className="mt-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#2563EB] hover:bg-[#F8FAFC] transition-colors">
              Imprimer l&apos;étiquette
            </button>
          </div>
        </div>
      </div>

      {!rolllink && (
        <div>
          <p className={sectionTitle}>Preuve de livraison</p>
          {/* Réception confirmée par le client : la carte passe au vert (doux) */}
          <div className={`rounded-xl border px-3 py-3 flex items-center gap-3 transition-colors ${confirmedAt ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${confirmedAt ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F2F4F7] text-[#6B7A90]'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M14 14h3v3h-3zM20 14v2M14 20h2M20 20h1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[13px] font-bold ${confirmedAt ? 'text-[#166534]' : 'text-[#0F172A]'}`}>{proof.title}</p>
              <p className={`text-[12px] leading-snug ${confirmedAt ? 'text-[#166534]/75' : 'text-[#6B7A90]'}`}>{proof.desc}</p>
              {confirmedAt && (
                seenAt ? (
                  <p className="text-[11px] text-[#166534] font-semibold mt-1">✓ Vu par l&apos;équipe le {fmt(seenAt)}</p>
                ) : (
                  <button type="button" disabled={busy} onClick={markSeen}
                    className="mt-1.5 px-2.5 py-1 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] text-[11px] font-bold text-[#B45309] hover:bg-[#FEF3C7] disabled:opacity-60">
                    ✓ Marquer comme vu
                  </button>
                )
              )}
            </div>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: proof.dot }} aria-hidden />
          </div>
        </div>
      )}

      {showPrint && (
        <LabelPrintModal
          entries={[{ kind, id, ref: refLabel, sub, count: labelCount && labelCount > 0 ? labelCount : 1 }]}
          onClose={() => setShowPrint(false)}
          onDone={onChanged}
        />
      )}
    </>
  );
}
