import { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Contenu plus haut que l'écran : la modale reste dans la fenêtre et son corps défile (en-tête fixe).
   *  Désactivé par défaut : un overflow couperait les menus déroulants (AdminSelect…) des autres modales. */
  scrollable?: boolean;
}

export function Modal({ title, onClose, children, scrollable = false }: ModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 ${scrollable ? 'max-h-[92vh] flex flex-col' : ''}`}>
        {/* `overflow-hidden` déplacé ici (au lieu du conteneur principal) : sinon ça coupe net
            tout menu déroulant en position absolue (AdminSelect, etc.) qui dépasserait le bas de
            la modale — seul l'en-tête a besoin d'un fond arrondi à clipper. */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-2xl overflow-hidden flex-shrink-0">
          <h3 className="text-[15px] font-bold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors text-lg">&#x2715;</button>
        </div>
        <div className={`px-6 py-5 ${scrollable ? 'overflow-y-auto' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
