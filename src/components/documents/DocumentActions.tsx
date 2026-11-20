'use client';

import { useEffect, useState } from 'react';
import { api, downloadExcel, printDocumentById } from '@/lib/documents/client';
import { downloadDocumentPdf } from '@/lib/documents/pdf';
import type { RenderableDocument } from '@/lib/documents/types';
import { WideModal, inputCls, labelCls, ghostBtn, greenBtn } from './WideModal';

// Aperçu du mail avant envoi : destinataire, objet, texte, lien et pièce jointe visibles ; rien ne part avant « Envoyer ».
export function MailDialog({ id, onClose, onSent }: { id: string; onClose: () => void; onSent?: () => void }) {
  const [form, setForm] = useState<{ to: string; subject: string; message: string; link: string; attachmentName: string } | null>(null);
  const [attach, setAttach] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api(`/api/documents/${id}/send`).then(setForm).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, [id]);

  const send = async () => {
    if (!form) return;
    setBusy(true); setError('');
    try {
      await api(`/api/documents/${id}/send`, { method: 'POST', body: JSON.stringify({ to: form.to, subject: form.subject, message: form.message, attachExcel: attach }) });
      setDone(true);
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally { setBusy(false); }
  };

  return (
    <WideModal title="Envoyer par e-mail" onClose={onClose} maxWidth="max-w-xl"
      footer={done ? (
        <div className="flex justify-end"><button onClick={onClose} className={greenBtn} style={{ background: '#4CAF4F' }}>Fermer</button></div>
      ) : (
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className={ghostBtn}>Annuler</button>
          <button onClick={send} disabled={busy || !form} className={greenBtn} style={{ background: '#4CAF4F' }}>{busy ? 'Envoi…' : 'Envoyer'}</button>
        </div>
      )}>
      {done ? (
        <div className="text-center py-6">
          <p className="text-[15px] font-bold text-[#166534]">✓ E-mail envoyé à {form?.to}</p>
          <p className="text-[12px] text-[#6B7A90] mt-1">L&apos;envoi est noté dans l&apos;historique.</p>
        </div>
      ) : !form ? (
        <p className="text-[13px] text-[#8A9BB5]">{error || 'Chargement…'}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#6B7A90]">Vérifie le message : rien n&apos;est envoyé tant que tu ne cliques pas sur « Envoyer ». Expéditeur : Contact@psi.dz.</p>
          <label className="block"><span className={labelCls}>Destinataire</span>
            <input className={inputCls} type="email" value={form.to} placeholder="e-mail du client" onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
          <label className="block"><span className={labelCls}>Objet</span>
            <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
          <label className="block"><span className={labelCls}>Message</span>
            <textarea className={`${inputCls} min-h-[150px]`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12px] text-[#374151] flex flex-col gap-1.5">
            <p><span className="font-bold">Lien du document :</span> <span className="text-[#2563EB] break-all">{form.link}</span> <span className="text-[#8A9BB5]">(le client peut l&apos;imprimer ou l&apos;enregistrer en PDF)</span></p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="accent-[#4CAF4F]" />
              <span>Joindre le fichier Excel <span className="font-semibold">{form.attachmentName}</span></span>
            </label>
          </div>
          {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}
        </div>
      )}
    </WideModal>
  );
}

// Boutons d'un document émis : Imprimer / PDF, Excel, E-mail (admin), Copier le lien (admin).
export function DocumentActions({ id, isAdmin, onChanged, compact = false }: { id: string; isAdmin: boolean; onChanged?: () => void; compact?: boolean }) {
  const [mail, setMail] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const btn = `${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'} rounded-lg border border-[#E2E8F0] bg-white font-bold text-[#2563EB] hover:bg-[#F8FAFC] transition-colors`;

  const pdf = async () => {
    setErr(''); setPdfBusy(true);
    try { const { doc } = await api<{ doc: RenderableDocument }>(`/api/documents/${id}`); await downloadDocumentPdf(doc); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erreur PDF'); }
    finally { setPdfBusy(false); }
  };
  const print = async () => { setErr(''); try { await printDocumentById(id); } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); } };
  const copyLink = async () => {
    try {
      const d = await api<{ link: string }>(`/api/documents/${id}/send`);
      await navigator.clipboard.writeText(d.link);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 items-center">
        <button type="button" onClick={pdf} disabled={pdfBusy} className={btn}>{pdfBusy ? 'PDF…' : 'Télécharger PDF'}</button>
        <button type="button" onClick={print} className={btn}>Imprimer</button>
        <button type="button" onClick={() => downloadExcel(id)} className={btn}>Excel</button>
        {isAdmin && <button type="button" onClick={() => setMail(true)} className={btn}>E-mail</button>}
        {isAdmin && <button type="button" onClick={copyLink} className={btn}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</button>}
      </div>
      {err && <p className="text-[11px] text-red-600 font-medium mt-1">{err}</p>}
      {mail && <MailDialog id={id} onClose={() => setMail(false)} onSent={onChanged} />}
    </>
  );
}
