'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';

// Notes sur les références du stock — réservées aux comptes ADMIN (les routes /api/stock/notes le vérifient aussi).
export type NoteKind = 'PRODUCT' | 'MATERIAL' | 'FREE';
interface Note { id: string; content: string; createdAt: string; author: { id: string; name: string } }

export const noteKey = (kind: NoteKind, keyId: string) => `${kind}:${keyId}`;

// Nombre de notes par référence → sert à colorer les crayons
export function useStockNoteCounts(enabled: boolean) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch('/api/stock/notes');
      if (res.ok) setCounts(await res.json());
    } catch { /* les notes ne doivent jamais bloquer la page Stock */ }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    let annule = false;
    fetch('/api/stock/notes')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data && !annule) setCounts(data); })
      .catch(() => {});
    return () => { annule = true; };
  }, [enabled]);
  return { counts, refresh };
}

// Crayon : grisé sans note, coloré (avec le nombre) quand la référence en a
export function NotesPencil({ count, onClick, className = '' }: { count: number; onClick: () => void; className?: string }) {
  const has = count > 0;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={has ? `${count} note(s)` : 'Ajouter une note'} aria-label={has ? `${count} note(s)` : 'Ajouter une note'}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border align-middle transition-colors ${has ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7]' : 'border-[#E2E8F0] text-[#ABBED1] hover:bg-[#F8FAFC] hover:text-[#374151]'} ${className}`}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17v3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.5 7.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {has && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F59E0B] text-white text-[9px] font-bold flex items-center justify-center leading-none">{count}</span>}
    </button>
  );
}

// Liste des notes + ajout — utilisée dans la fenêtre « Notes » et dans « Gérer le stock »
export function NotesPanel({ kind, keyId, onChange }: { kind: NoteKind; keyId: string; onChange?: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let annule = false;
    fetch(`/api/stock/notes?kind=${kind}&key=${encodeURIComponent(keyId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Note[]) => { if (!annule) setNotes(data); })
      .catch(() => {})
      .finally(() => { if (!annule) setLoading(false); });
    return () => { annule = true; };
  }, [kind, keyId]);

  const add = async () => {
    if (!text.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/stock/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, key: keyId, content: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Impossible d'ajouter la note."); return; }
      setNotes((n) => [data, ...n]); setText(''); onChange?.();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer cette note ?')) return;
    const res = await fetch(`/api/stock/notes/${id}`, { method: 'DELETE' });
    if (res.ok) { setNotes((n) => n.filter((x) => x.id !== id)); onChange?.(); }
  };

  return (
    <div>
      <p className="text-[12px] font-semibold text-[#374151] mb-2">Notes <span className="font-normal text-[#8A9BB5]">(visibles par les admins seulement)</span></p>
      {loading ? (
        <p className="text-[12px] text-[#8A9BB5] py-2">Chargement…</p>
      ) : notes.length === 0 ? (
        <p className="text-[12px] text-[#8A9BB5] py-2">Aucune note pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-3 max-h-[220px] overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
              <p className="text-[13px] text-[#0F172A] whitespace-pre-wrap break-words">{n.content}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[11px] text-[#92400E]">{n.author.name} · {new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <button type="button" onClick={() => remove(n.id)} className="text-[11px] font-semibold text-[#B91C1C] hover:underline">Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Écrire une note…"
        className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] bg-[#F8FAFC] resize-none" />
      {error && <p className="text-[12px] font-semibold text-[#B91C1C] mt-1">{error}</p>}
      <div className="flex justify-end mt-2">
        <button type="button" onClick={add} disabled={!text.trim() || saving}
          className="px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] disabled:opacity-50 transition-colors">
          {saving ? 'Ajout…' : 'Ajouter la note'}
        </button>
      </div>
    </div>
  );
}

export function NotesModal({ title, kind, keyId, onClose, onChange }: { title: string; kind: NoteKind; keyId: string; onClose: () => void; onChange?: () => void }) {
  return (
    <Modal title={`Notes — ${title}`} onClose={onClose} scrollable>
      <NotesPanel kind={kind} keyId={keyId} onChange={onChange} />
    </Modal>
  );
}
