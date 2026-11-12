'use client';

import { useRef } from 'react';

// Affiche le document dans une page A4 et propose « Imprimer / enregistrer en PDF » et « Excel ».
export function DocumentViewer({ html, token, number }: { html: string; token: string; number: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const print = () => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); };
  const btn = 'px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors';

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-3 py-5 flex flex-col items-center gap-4">
      <div className="w-full max-w-[794px] flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-bold text-[#263238]">{number}</p>
        <div className="flex gap-2">
          <button type="button" onClick={print} className={`${btn} text-white`} style={{ background: '#4CAF4F' }}>Imprimer / enregistrer en PDF</button>
          <a href={`/d/${token}/excel`} className={`${btn} border border-[#E2E8F0] bg-white text-[#263238] hover:bg-[#F8FAFC]`}>Télécharger l&apos;Excel</a>
        </div>
      </div>
      <div className="w-full overflow-x-auto flex justify-center">
        <iframe ref={frame} title={number} srcDoc={html} style={{ width: 794, height: 1123, border: 0, background: '#fff', boxShadow: '0 4px 24px rgba(171,190,209,0.45)' }} />
      </div>
      <p className="text-[11px] text-[#8A9BB5] text-center">Pour obtenir un PDF : « Imprimer », puis choisissez « Enregistrer au format PDF » comme imprimante.</p>
    </main>
  );
}
