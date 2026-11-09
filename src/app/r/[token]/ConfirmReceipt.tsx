'use client';

import { useState } from 'react';
import { ArrowButton } from '@/components/ArrowButton';

type State = 'ready' | 'confirmed' | 'not_ready' | 'unavailable' | 'rolllink';

// Bloc d'action de la page du QR : « Valider la réception » (avec une étape de confirmation pour éviter un clic par erreur).
export function ConfirmReceipt({ token, state, confirmedAt }: { token: string; state: State; confirmedAt: string | null }) {
  const [current, setCurrent] = useState<State>(state);
  const [doneAt, setDoneAt] = useState<string | null>(confirmedAt);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { timeZone: 'Africa/Algiers', dateStyle: 'long', timeStyle: 'short' });

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/receipt/${token}/confirm`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Une erreur est survenue. Merci de réessayer.'); setAsking(false); return; }
      setDoneAt(data.confirmedAt ?? new Date().toISOString());
      setCurrent('confirmed');
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };

  if (current === 'confirmed') {
    return (
      <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-5 text-center">
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-[#4CAF4F] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p className="text-[16px] font-bold text-[#166534]">Réception confirmée</p>
        {doneAt && <p className="text-[13px] text-[#166534]/80 mt-1">{fmt(doneAt)}</p>}
        <p className="text-[13px] text-[#4D4D4D] mt-3">Merci pour votre confiance !</p>
      </div>
    );
  }

  if (current !== 'ready') {
    const msg =
      current === 'not_ready' ? "Votre commande n'est pas encore prête : la réception pourra être confirmée dès sa préparation."
      : current === 'rolllink' ? 'Cette commande est suivie via RollLink : la réception ne se confirme pas depuis cette page.'
      : 'Cette commande ne peut plus être confirmée. Pour toute question, contactez-nous.';
    return <p className="rounded-2xl border border-[#E0E0E0] bg-[#F8FAFC] p-4 text-[13px] text-[#4D4D4D] text-center">{msg}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-red-600 font-medium text-center">{error}</p>}
      {!asking ? (
        <ArrowButton variant="green-white" onClick={() => setAsking(true)} className="w-full justify-center !text-[16px] !py-4">
          Valider la réception
        </ArrowButton>
      ) : (
        <div className="rounded-2xl border border-[#E0E0E0] bg-white p-4 flex flex-col gap-3">
          <p className="text-[14px] text-[#263238] text-center font-medium">Confirmez-vous avoir bien reçu votre colis, produits et quantités conformes ?</p>
          <div className="flex gap-2">
            <ArrowButton variant="white-dark" disabled={busy} onClick={() => setAsking(false)} className="flex-1 justify-center border border-[#E0E0E0]">
              Annuler
            </ArrowButton>
            <ArrowButton variant="green-white" disabled={busy} onClick={confirm} className="flex-1 justify-center">
              {busy ? 'Envoi…' : 'Oui, confirmer'}
            </ArrowButton>
          </div>
        </div>
      )}
    </div>
  );
}
