'use client';

import { useRef, useState } from 'react';
import { savePdfFromElement } from '@/lib/documents/pdf';

// Affiche le document dans une page A4 et propose « Imprimer / enregistrer en PDF » et « Excel ».
export function DocumentViewer({ html, token, number }: { html: string; token: string; number: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const print = () => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); };
  const [busy, setBusy] = useState(false);
  const pdf = async () => {
    const page = frame.current?.contentDocument?.querySelector('.page') as HTMLElement | null;
    if (!page) return;
    setBusy(true);
    try { await savePdfFromElement(page, `${number.replace(/[\/:*?"<>|]+/g, '-')}.pdf`); } finally { setBusy(false); }
  };
  const btn = 'px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors';

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-3 py-5 flex flex-col items-center gap-4">
      <div className="w-full max-w-[794px] flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-bold text-[#263238]">{number}</p>
        <div className="flex gap-2">
          <button type="button" onClick={pdf} disabled={busy} className={`${btn} text-white disabled:opacity-60`} style={{ background: '#4CAF4F' }}>{busy ? 'PDF…' : 'Télécharger le PDF'}</button>
          <button type="button" onClick={print} className={`${btn} border border-[#E2E8F0] bg-white text-[#263238] hover:bg-[#F8FAFC]`}>Imprimer</button>
          <a href={`/d/${token}/excel`} className={`${btn} border border-[#E2E8F0] bg-white text-[#263238] hover:bg-[#F8FAFC]`}>Télécharger l&apos;Excel</a>
        </div>
      </div>
      <div className="w-full overflow-x-auto flex justify-center">
        <iframe ref={frame} title={number} srcDoc={html} style={{ width: 794, height: 1123, border: 0, background: '#fff', boxShadow: '0 4px 24px rgba(171,190,209,0.45)' }} />
      </div>
    </main>
  );
}
