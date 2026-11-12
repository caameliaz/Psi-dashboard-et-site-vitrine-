'use client';

import type { ReactNode } from 'react';

// Fenêtre large (formulaire de document, aperçu) : même style que Modal, mais plus grande, avec un corps qui défile.
export function WideModal({ title, onClose, children, maxWidth = 'max-w-6xl', footer }: { title: string; onClose: () => void; children: ReactNode; maxWidth?: string; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[94vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-2xl flex-shrink-0">
          <h3 className="text-[15px] font-bold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors text-lg">&#x2715;</button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-2xl flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[13px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F]';
export const labelCls = 'block text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide mb-1';
export const greenBtn = 'px-4 py-2 rounded-lg text-[13px] font-bold text-white disabled:opacity-60 transition-colors';
export const ghostBtn = 'px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-60';
