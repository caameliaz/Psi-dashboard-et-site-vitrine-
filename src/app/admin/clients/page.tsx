'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
interface ClientRecord {
  id: string | number;
  _dbId?: string;
  entreprise: string;
  contact: string;
  telephone: string;
  wilaya: string;
  commune?: string;
  sectorId?: string;
  sectorName?: string;
  adresse: string;
  email: string;
  photo?: string;
  commandes: number;
  devis: number;
  derniere: string;
  active?: boolean;
  deactivatedReason?: string | null;
  deactivatedByName?: string | null;
  deactivatedAt?: string | null;
  historique: Array<{
    id: string;
    ref: string;
    type: 'Commande' | 'Devis';
    date: string;
    statut: string;
    montant: string;
    produits: string;
  }>;
}
import { StatusPill } from '@/components/ui/StatusPill';
import { initials } from '@/lib/utils';
import { RequestPanel, TemplatePopover, type RequestDetail } from '@/components/ui/RequestPanel';
import { Modal } from '@/components/ui/Modal';
import { WilayaSelect } from '@/components/ui/WilayaSelect';
import { exportClientExcel, printClientDoc, type ClientExportData } from '@/lib/export-client';
import { useSSE } from '@/lib/use-sse';

function avatarColor(id: number | string) {
  const n = typeof id === 'string' ? id.charCodeAt(0) + id.charCodeAt(1) : id;
  const colors = [
    { bg: '#D1FAE5', text: '#166534' },
    { bg: '#DBEAFE', text: '#1E40AF' },
    { bg: '#FDE68A', text: '#92400E' },
    { bg: '#F3E8FF', text: '#6B21A8' },
    { bg: '#FFE4E6', text: '#9F1239' },
    { bg: '#CCFBF1', text: '#134E4A' },
  ];
  return colors[n % colors.length];
}

const emptyClient: Omit<ClientRecord, 'id' | 'commandes' | 'devis' | 'derniere' | 'historique'> = {
  entreprise: '', contact: '', telephone: '', wilaya: '', sectorId: '', adresse: '', email: '',
};

function ClientForm({ form, setForm, onSubmit, onClose, submitLabel, sectors }: {
  form: typeof emptyClient;
  setForm: (f: typeof emptyClient) => void;
  onSubmit: () => void;
  sectors?: { id: string; name: string }[];
  onClose: () => void;
  submitLabel: string;
}) {
  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] text-[#263238] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";
  const labelClass = "block text-[12px] font-semibold text-[#374151] mb-1.5";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Entreprise</label>
          <input value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} placeholder="Nom de l'entreprise" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nom du contact *</label>
          <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Prénom Nom" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Téléphone</label>
          <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+213 5XX XXX XXX" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@entreprise.dz" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Wilaya</label>
          <WilayaSelect value={form.wilaya} onChange={(v) => setForm({ ...form, wilaya: v })} />
        </div>
        <div>
          <label className={labelClass}>Secteur d'activité</label>
          <select value={form.sectorId ?? ''} onChange={(e) => setForm({ ...form, sectorId: e.target.value })} className={inputClass}>
            <option value="">— Aucun —</option>
            {(sectors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Adresse</label>
        <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Rue, quartier, ville" className={inputClass} />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
        <button onClick={onSubmit} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>{submitLabel}</button>
      </div>
    </div>
  );
}

function NewOrderForm({ client, onClose }: { client: ClientRecord; onClose: () => void }) {
  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] text-[#263238] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";
  const labelClass = "block text-[12px] font-semibold text-[#374151] mb-1.5";
  const [produits, setProduits] = useState('');
  const [montant, setMontant] = useState('');
  const [type, setType] = useState<'Commande' | 'Devis'>('Commande');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!produits.trim()) return;
    setSaving(true);
    const dbId = (client as any)._dbId ?? client.id;
    const endpoint = type === 'Commande' ? '/api/orders' : '/api/quotes';
    const body = type === 'Commande'
      ? {
          source: 'ADMIN',
          client: {
            name: client.contact,
            company: client.entreprise,
            phone: client.telephone,
            wilaya: client.wilaya,
            email: client.email,
          },
          items: [],
        }
      : {
          source: 'ADMIN',
          clientId: dbId,
          name: client.contact,
          company: client.entreprise,
          phone: client.telephone,
          wilaya: client.wilaya,
          email: client.email,
          message: produits,
          items: [],
        };
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] max-w-[92vw] p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-bold text-[#0F172A]">Nouvelle {type === 'Commande' ? 'commande' : 'demande de devis'}</h3>
            <p className="text-[12px] text-[#8A9BB5] mt-0.5">{client.contact} · {client.entreprise}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1] transition-colors">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['Commande', 'Devis'] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors border-2"
              style={type === t
                ? { background: t === 'Commande' ? '#F0FDF4' : '#F5F3FF', color: t === 'Commande' ? '#166534' : '#5B21B6', borderColor: t === 'Commande' ? '#4CAF4F' : '#8B5CF6' }
                : { background: '#F8FAFC', color: '#8A9BB5', borderColor: '#E2E8F0' }}>
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Produits / Spécifications</label>
            <textarea value={produits} onChange={(e) => setProduits(e.target.value)}
              placeholder="ex: 80/80 × 50 rouleaux, 57/40 × 30 rouleaux"
              rows={3}
              className={inputClass + ' resize-none'} />
          </div>
          <div>
            <label className={labelClass}>Montant {type === 'Devis' ? '(estimé, optionnel)' : ''}</label>
            <input value={montant} onChange={(e) => setMontant(e.target.value)}
              placeholder={type === 'Devis' ? 'Sur devis' : 'ex: 45 000 DA'}
              className={inputClass} />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors disabled:opacity-60"
            style={{ background: '#4CAF4F' }}>
            {saving ? 'Création...' : type === 'Commande' ? 'Créer la commande' : 'Créer le devis'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientSlideIn({ client, onClose, onEdit, onDelete, onReactivate, onDeleteDefinitif, onRefresh }: {
  client: ClientRecord; onClose: () => void; onEdit: () => void; onDelete: () => void;
  onReactivate?: () => void; onDeleteDefinitif?: () => void; onRefresh?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>(client.photo);
  const [selectedRequest, setSelectedRequest] = useState<RequestDetail | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [templateMode, setTemplateMode] = useState<'wa' | 'mail' | null>(null);
  const ac = avatarColor(client.id);

  // Item minimal (niveau client) pour le sélecteur de templates WhatsApp
  const clientAsItem: RequestDetail = {
    ref: '', type: 'Commande', date: '', statut: '', montant: '', produits: '',
    client: client.contact, entreprise: client.entreprise, telephone: client.telephone,
    wilaya: client.wilaya, email: client.email,
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clientExport: ClientExportData = {
    entreprise: client.entreprise, contact: client.contact, telephone: client.telephone,
    wilaya: client.wilaya, commune: client.commune, sectorName: client.sectorName,
    adresse: client.adresse, email: client.email, commandes: client.commandes, devis: client.devis,
    active: client.active, deactivatedReason: client.deactivatedReason,
    historique: client.historique.map((h) => ({ ref: h.ref, type: h.type, date: h.date, statut: h.statut, montant: h.montant, produits: h.produits })),
  };

  const waHref = `https://wa.me/${client.telephone.replace(/\s/g, '').replace('+', '')}`;
  const callHref = `tel:${client.telephone.replace(/\s/g, '')}`;
  const emailHref = client.email ? `mailto:${client.email}` : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[110] backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full bg-white z-[120] shadow-2xl flex flex-col overflow-hidden w-full md:w-[46vw] md:min-w-[500px] max-w-full">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <p className="text-[13px] font-semibold text-[#8A9BB5]">Fiche client</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => printClientDoc(clientExport)} title="Exporter en PDF"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC] transition-colors">
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => exportClientExcel(clientExport)} title="Exporter en Excel"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#16A34A] hover:bg-[#F8FAFC] transition-colors">
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M9 13l6 6M15 13l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="w-px h-5 bg-[#E2E8F0] mx-0.5" />
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1] hover:text-[#374151] transition-colors">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Profil */}
          <div className="px-5 md:px-6 pt-5 md:pt-6 pb-5 border-b border-[#F2F4F7]">
            <div className="flex items-start gap-3 mb-4">
              {/* Avatar (sans nom dessous) */}
              <div className="relative group cursor-pointer flex-shrink-0" onClick={() => fileRef.current?.click()}>
                {photo ? (
                  <img src={photo} alt={client.contact} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-extrabold" style={{ background: ac.bg, color: ac.text }}>
                    {initials(client.entreprise || client.contact)}
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-[9px] font-bold">Photo</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

              <div className="flex-1 min-w-0">
                {/* Ligne 1 : nom entreprise + badges (à gauche), boutons contact (à droite) */}
                <div className="flex items-start gap-2 mb-1">
                  <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                    <p className="text-[19px] font-extrabold text-[#0F172A] leading-tight truncate">{client.entreprise || client.contact}</p>
                    <span className="bg-[#F0FDF4] text-[#166534] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#BBF7D0]">{client.commandes} cmd</span>
                    {client.devis > 0 && (
                      <span className="bg-[#F5F3FF] text-[#5B21B6] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#DDD6FE]">{client.devis} devis</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setTemplateMode('wa')} title="WhatsApp (avec template)"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-white" style={{ background: '#25D366' }}>
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>
                    <a href={callHref} title="Appeler"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#3B82F6] hover:bg-[#F8FAFC] transition-colors">
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                    </a>
                    {client.email && (
                      <button onClick={() => setTemplateMode('mail')} title="Email (avec template)"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#F59E0B] hover:bg-[#F8FAFC] transition-colors">
                        <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.6"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Ligne 2 : nom du client + secteur */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-semibold text-[#4CAF4F]">{client.contact}</p>
                  {client.sectorName && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">{client.sectorName}</span>
                  )}
                </div>

                {/* Petit espace, puis 2 colonnes : tél/mail à gauche, wilaya/adresse à droite */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                  {/* Colonne gauche : tél + mail */}
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="flex-shrink-0 text-[#8A9BB5]"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      <span className="font-medium truncate">{client.telephone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="flex-shrink-0 text-[#8A9BB5]"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.6"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      <span className="font-medium truncate">{client.email || '—'}</span>
                    </div>
                  </div>
                  {/* Colonne droite : wilaya + adresse */}
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2 text-[13px] text-[#374151]">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-[#8A9BB5]"><path d="M12 21s-7-5.7-7-11a7 7 0 0114 0c0 5.3-7 11-7 11z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6"/></svg>
                      <span className="truncate">{client.commune ? `${client.commune}, ${client.wilaya}` : client.wilaya}</span>
                    </div>
                    {client.adresse && (
                      <div className="flex items-center gap-2 text-[13px] text-[#8A9BB5]">
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="flex-shrink-0"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="truncate">{client.adresse}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bandeau si client désactivé */}
          {client.active === false && (
            <div className="mx-5 md:mx-6 mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <svg width={16} height={16} fill="none" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5"><path d="M12 8v4M12 16h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#B45309" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#92400E]">Client désactivé</p>
                  {client.deactivatedReason && <p className="text-[12px] text-[#B45309] mt-0.5">Motif : {client.deactivatedReason}</p>}
                  {(client.deactivatedByName || client.deactivatedAt) && (
                    <p className="text-[11px] text-[#B45309]/70 mt-0.5">
                      Par {client.deactivatedByName ?? '—'}{client.deactivatedAt ? ` · ${client.deactivatedAt}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Historique commandes */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">Historique</p>
              <button onClick={() => setShowNewOrder(true)} title="Nouvelle commande / devis"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white text-[18px] font-bold leading-none"
                style={{ background: '#4CAF4F' }}>
                +
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {client.historique.map((h) => {
                const detail: RequestDetail = {
                  id: h.id, ref: h.ref, type: h.type, date: h.date, statut: h.statut,
                  montant: h.montant, produits: h.produits,
                  client: client.contact, entreprise: client.entreprise,
                  telephone: client.telephone, wilaya: client.wilaya,
                  adresse: client.adresse, email: client.email,
                };
                const isCmd = h.type === 'Commande';
                const typeCfg = isCmd
                  ? { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Commande' }
                  : { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: 'Devis' };
                return (
                  <button key={h.ref} onClick={() => setSelectedRequest(detail)}
                    className="w-full text-left rounded-lg border border-[#E2E8F0] hover:border-[#4CAF4F] hover:bg-[#F8FFF8] transition-all px-3 py-2.5 flex items-center gap-2.5">
                    {/* Pastille type */}
                    <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: typeCfg.color }} />
                    {/* Réf + produits */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold font-mono text-[#374151]">{h.ref}</span>
                        <span className="text-[9px] font-bold px-1 py-px rounded" style={{ background: typeCfg.bg, color: typeCfg.color }}>{typeCfg.label}</span>
                      </div>
                      <p className="text-[11px] text-[#8A9BB5] truncate mt-0.5">{h.produits}</p>
                    </div>
                    {/* Montant + statut + date */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#0F172A]">{h.montant}</span>
                        <StatusPill status={h.statut} />
                      </div>
                      <span className="text-[10px] text-[#ABBED1]">{h.date}</span>
                    </div>
                  </button>
                );
              })}
              {client.historique.length === 0 && (
                <p className="text-[13px] text-[#8A9BB5] text-center py-8">Aucune commande ni devis</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F2F4F7] flex items-center gap-2 flex-wrap">
          {client.active === false ? (
            <>
              <button onClick={onDeleteDefinitif} className="px-3 py-2 rounded-lg text-[12px] font-semibold text-[#EF4444] border border-[#FECACA] hover:bg-[#FEF2F2] transition-colors">
                Supprimer définitivement
              </button>
              <div className="flex-1" />
              <button onClick={onReactivate} className="px-4 py-2 rounded-lg text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
                Réactiver
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onDelete()} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-[#B45309] border border-[#FDE68A] hover:bg-[#FFFBEB] transition-colors">
                Désactiver
              </button>
              <div className="flex-1" />
              <button onClick={() => { onClose(); onEdit(); }} className="px-4 py-2 rounded-lg text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
                Modifier
              </button>
            </>
          )}
        </div>
      </div>

      {selectedRequest && (
        <RequestPanel
          item={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onReassigned={() => { setSelectedRequest(null); onRefresh?.(); }}
          onStatusChange={async (_ref, newStatut) => {
            if (!selectedRequest.id) return;
            const UI_TO_DB: Record<string, string> = { 'En attente': 'EN_ATTENTE', 'Confirmé': 'VALIDE', 'Livré': 'LIVRE', 'Annulé': 'ANNULE' };
            const endpoint = selectedRequest.type === 'Devis' ? `/api/quotes/${selectedRequest.id}` : `/api/orders/${selectedRequest.id}`;
            await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: UI_TO_DB[newStatut] ?? newStatut }) });
            // Statut final → ferme le détail. Sinon garde ouvert avec le nouveau statut.
            if (newStatut === 'Livré' || newStatut === 'Annulé') setSelectedRequest(null);
            else setSelectedRequest((prev) => (prev ? { ...prev, statut: newStatut } : prev));
            onRefresh?.();
          }}
          onConfirmQuoteWithPrice={async (it) => {
            if (!it.id) return;
            const prix = it._prix;
            let proposedPrice = 0;
            if (prix?.totalOverride !== undefined) proposedPrice = prix.totalOverride;
            else if (prix?.itemPrices) proposedPrice = (it.items ?? []).reduce((acc, x) => { const p = prix.itemPrices!.find((y) => y.designation === x.designation); return acc + x.quantite * (p?.unitPrice ?? 0); }, 0);
            await fetch(`/api/quotes/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'VALIDE', proposedPrice }) });
            setSelectedRequest(null);
            onRefresh?.();
          }}
        />
      )}
      {showNewOrder && <NewOrderForm client={client} onClose={() => setShowNewOrder(false)} />}
      {templateMode && <TemplatePopover item={clientAsItem} mode={templateMode} recipientEmail={client.email} onClose={() => setTemplateMode(null)} />}
    </>
  );
}

// Modal de DÉSACTIVATION client (motif obligatoire). L'historique n'est jamais perdu.
function DeleteClientModal({ client, onDeactivate, onClose }: { client: ClientRecord; onDeactivate: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title="Désactiver le client" onClose={onClose}>
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#FFF7ED] flex items-center justify-center flex-shrink-0">
            <svg width={22} height={22} fill="none" viewBox="0 0 24 24"><path d="M18.36 6.64A9 9 0 105.64 19.36 9 9 0 0018.36 6.64zM12 8v4M12 16h.01" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#0F172A] leading-snug">Désactiver <span className="text-[#B45309]">{client.entreprise || client.contact}</span></p>
            <p className="text-[12px] text-[#8A9BB5] mt-1">Le client n'apparaîtra plus dans la liste, mais <b>ses commandes, devis et tout l'historique sont conservés</b>. Un admin pourra le réactiver.</p>
          </div>
        </div>

        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Motif de la désactivation <span className="text-[#EF4444]">*</span></label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Ex : doublon, client inactif, erreur de saisie…"
          className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] text-[#0F172A] resize-none focus:outline-none focus:border-[#F59E0B] focus:ring-[3px] focus:ring-[#F59E0B]/15 transition-all"
        />
        <p className="text-[11px] text-[#ABBED1] mt-1.5">Les administrateurs seront notifiés avec ce motif.</p>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button
            onClick={() => reason.trim() && onDeactivate(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors disabled:opacity-40"
            style={{ background: '#F59E0B' }}>
            Désactiver
          </button>
        </div>
      </div>
    </Modal>
  );
}

function IconSearch() {
  return (
    <svg width={16} height={16} fill="none">
      <circle cx="7" cy="7" r="5.25" stroke="#8A9BB5" strokeWidth="1.5" />
      <path d="M11 11L14 14" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

const STATUS_DB_TO_UI: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE:   'Contacté',
  VALIDE:     'Confirmé',
  LIVRE:      'Livré',
  ANNULE:     'Annulé',
};

function dbClientToRecord(c: any): ClientRecord {
  const phone = c.phones?.find((p: any) => p.primary)?.number ?? c.phones?.[0]?.number ?? '';
  const ordersCount = c._count?.orders ?? 0;
  const quotesCount = c._count?.quotes ?? 0;

  const orderHist = (c.orders ?? []).map((o: any) => ({
    id: o.id,
    ref: o.ref ?? o.id.slice(0, 8).toUpperCase(),
    type: 'Commande' as const,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    statut: STATUS_DB_TO_UI[o.status] ?? o.status,
    montant: `${(o.items ?? []).reduce((acc: number, i: any) => acc + i.quantity * (i.unitPrice ?? 0), 0).toLocaleString('fr-FR')} DA`,
    produits: (o.items ?? []).map((i: any) => `${i.product?.reference ?? '?'} × ${i.quantity}`).join(', ') || '—',
    _ts: new Date(o.createdAt).getTime(),
  }));
  const quoteHist = (c.quotes ?? []).map((q: any) => ({
    id: q.id,
    ref: q.ref ?? q.id.slice(0, 8).toUpperCase(),
    type: 'Devis' as const,
    date: new Date(q.createdAt).toLocaleDateString('fr-FR'),
    statut: STATUS_DB_TO_UI[q.status] ?? q.status,
    montant: q.proposedPrice ? `${Number(q.proposedPrice).toLocaleString('fr-FR')} DA` : 'Sur devis',
    produits: (q.items ?? []).map((i: any) => `${i.product?.reference ?? '?'} × ${i.quantity}`).join(', ') || '—',
    _ts: new Date(q.createdAt).getTime(),
  }));

  const historique = [...orderHist, ...quoteHist]
    .sort((a, b) => b._ts - a._ts)
    .map(({ _ts, ...rest }: any) => rest);

  const lastDate = historique[0]?.date ?? '—';

  return {
    id: c.id,               // string UUID from DB
    _dbId: c.id,
    entreprise: c.company ?? c.name,
    contact: c.name,
    telephone: phone,
    wilaya: c.wilaya ?? '',
    commune: c.commune ?? '',
    sectorId: c.sectorId ?? c.sector?.id ?? '',
    sectorName: c.sector?.name ?? '',
    adresse: c.address ?? '',
    email: c.email ?? '',
    commandes: ordersCount,
    devis: quotesCount,
    derniere: lastDate,
    active: c.active ?? true,
    deactivatedReason: c.deactivatedReason ?? null,
    deactivatedByName: c.deactivatedBy?.name ?? null,
    deactivatedAt: c.deactivatedAt ? new Date(c.deactivatedAt).toLocaleDateString('fr-FR') : null,
    historique,
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterSector, setFilterSector] = useState('all');   // filtre par secteur
  const [sortBy, setSortBy]     = useState('recent');        // tri
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [editClient, setEditClient]   = useState<ClientRecord | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientRecord | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ ...emptyClient });
  const [editForm, setEditForm] = useState({ ...emptyClient });
  const [sectors, setSectors]   = useState<{ id: string; name: string }[]>([]);
  const [showSectors, setShowSectors] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchSectors = useCallback(async () => {
    const r = await fetch('/api/sectors');
    if (r.ok) { const d = await r.json(); setSectors(d.map((s: any) => ({ id: s.id, name: s.name }))); }
  }, []);

  const fetchClients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        const records = data.map(dbClientToRecord);
        setClients(records);
        // Garde la fiche ouverte à jour en temps réel (historique, compteurs…)
        setSelected((prev) => prev ? (records.find((r: ClientRecord) => r._dbId === prev._dbId) ?? prev) : prev);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchSectors(); }, [fetchSectors]);
  // Temps réel : rafraîchit la liste + l'historique client en silence sur événement SSE
  useSSE(useCallback(() => { fetchClients(true); }, [fetchClients]));
  // Filet de sécurité : rafraîchit toutes les 15s en silence
  useEffect(() => {
    const id = setInterval(() => fetchClients(true), 15000);
    return () => clearInterval(id);
  }, [fetchClients]);

  // Ouverture directe d'une fiche via ?open=<clientId> (depuis l'historique / une notif)
  // — inclut les clients désactivés (?inactifs=true) pour voir la justif.
  useEffect(() => {
    const openId = new URLSearchParams(window.location.search).get('open');
    if (!openId) return;
    fetch('/api/clients?inactifs=true')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const found = data.find((c) => c.id === openId);
        if (found) setSelected(dbClientToRecord(found));
      })
      .catch(() => {});
  }, []);

  const parseDate = (s: string) => { const [d, m, y] = (s || '').split('/').map(Number); return new Date(y || 0, (m || 1) - 1, d || 1).getTime(); };

  const filtered = clients
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.entreprise.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.wilaya.toLowerCase().includes(q);
      const matchSector = filterSector === 'all'
        || (filterSector === 'none' ? !c.sectorId : c.sectorId === filterSector);
      return matchSearch && matchSector;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'nom':        return (a.entreprise || a.contact).localeCompare(b.entreprise || b.contact);
        case 'commandes':  return (b.commandes + b.devis) - (a.commandes + a.devis);
        case 'wilaya':     return (a.wilaya || '').localeCompare(b.wilaya || '');
        case 'recent':
        default:           return parseDate(b.derniere) - parseDate(a.derniere);
      }
    });

  const handleAdd = async () => {
    if (!addForm.contact.trim()) return;
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addForm.contact.trim(),
        company: addForm.entreprise.trim(),
        email: addForm.email.trim() || null,
        wilaya: addForm.wilaya.trim(),
        sectorId: addForm.sectorId || null,
        address: addForm.adresse.trim() || null,
        phone: addForm.telephone.trim() || null,
      }),
    });
    if (res.ok) {
      await fetchClients(true);
      setAddForm({ ...emptyClient });
      setShowAdd(false);
    }
  };

  const openEdit = (c: ClientRecord) => {
    setEditForm({ entreprise: c.entreprise, contact: c.contact, telephone: c.telephone, wilaya: c.wilaya, sectorId: c.sectorId ?? '', adresse: c.adresse, email: c.email });
    setEditClient(c);
  };

  const handleEdit = async () => {
    if (!editClient) return;
    const id = (editClient as any)._dbId ?? editClient.id;
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.contact.trim(),
        company: editForm.entreprise.trim(),
        email: editForm.email.trim() || null,
        wilaya: editForm.wilaya.trim(),
        sectorId: editForm.sectorId || null,
        address: editForm.adresse.trim() || null,
        phone: editForm.telephone.trim() || null,
      }),
    });
    if (res.ok) {
      await fetchClients(true);
      setEditClient(null);
    }
  };

  // Désactivation (avec motif). L'historique reste, admins notifiés.
  const handleDeactivate = async (c: ClientRecord, reason: string) => {
    const id = (c as any)._dbId ?? c.id;
    const res = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Désactivation impossible');
      return;
    }
    await fetchClients(true);
    setDeleteClient(null);
    setSelected(null);
  };

  // Réactiver un client désactivé
  const handleReactivate = async (c: ClientRecord) => {
    const id = (c as any)._dbId ?? c.id;
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) { await fetchClients(true); setSelected(null); }
  };

  // Suppression définitive (admin only)
  const handleDeleteDefinitif = async (c: ClientRecord) => {
    if (!window.confirm(`Supprimer DÉFINITIVEMENT ${c.entreprise || c.contact} ? Cette action est irréversible.`)) return;
    const id = (c as any)._dbId ?? c.id;
    const res = await fetch(`/api/clients/${id}?definitif=true`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Suppression impossible');
      return;
    }
    await fetchClients(true);
    setSelected(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] md:text-[22px] font-bold text-[#0F172A]">Clients</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-0.5">{loading ? 'Chargement…' : `${clients.length} clients enregistrés`}</p>
      </div>

      {/* Search + Nouveau client */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:w-auto">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><IconSearch /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="pl-9 pr-4 py-2.5 w-full sm:w-[280px] rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#263238] placeholder-[#8A9BB5] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all"
          />
        </div>

        {/* Filtre par secteur */}
        <div className="relative">
          <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#374151] cursor-pointer focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all">
            <option value="all">Tous les secteurs</option>
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="none">Sans secteur</option>
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A9BB5]" width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        {/* Tri */}
        <div className="relative">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#374151] cursor-pointer focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all">
            <option value="recent">Tri : plus récents</option>
            <option value="commandes">Tri : plus de commandes</option>
            <option value="nom">Tri : nom (A→Z)</option>
            <option value="wilaya">Tri : wilaya</option>
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A9BB5]" width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-[#374151] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors sm:ml-auto whitespace-nowrap">
          <svg width={15} height={15} fill="none" viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Importer Excel
        </button>
        <button onClick={() => setShowSectors(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-[#374151] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors whitespace-nowrap">
          Secteurs
        </button>
        <button onClick={() => { setAddForm({ ...emptyClient }); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors whitespace-nowrap" style={{ background: '#4CAF4F' }}>
          + Nouveau client
        </button>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8A9BB5]">
          <p className="text-[15px] font-semibold">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {filtered.map((c) => {
            const ac = avatarColor(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="bg-white rounded-xl border border-[#E2E8F0] p-2.5 md:p-3.5 text-left hover:border-[#4CAF4F] hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold flex-shrink-0" style={{ background: ac.bg, color: ac.text }}>
                    {initials(c.entreprise || c.contact)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="text-[13px] font-bold text-[#0F172A] truncate group-hover:text-[#4CAF4F] transition-colors">{c.entreprise || c.contact}</p>
                      <span className="bg-[#F0FDF4] text-[#166534] text-[10px] font-bold px-1.5 py-px rounded flex-shrink-0 border border-[#BBF7D0]">
                        {c.commandes} cmd
                      </span>
                      {c.devis > 0 && (
                        <span className="bg-[#F5F3FF] text-[#5B21B6] text-[10px] font-bold px-1.5 py-px rounded flex-shrink-0 border border-[#DDD6FE]">
                          {c.devis} devis
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8A9BB5] truncate">{c.contact}</p>
                  </div>
                </div>

                {c.sectorName && (
                  <span className="inline-block mb-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">{c.sectorName}</span>
                )}
                <div className="flex items-center justify-between text-[11px] text-[#ABBED1]">
                  <span className="truncate">{c.wilaya}</span>
                  <span className="flex-shrink-0 ml-2">{c.derniere}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Slide-in fiche */}
      {selected && (
        <ClientSlideIn
          client={selected}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => setDeleteClient(selected)}
          onReactivate={() => handleReactivate(selected)}
          onDeleteDefinitif={() => handleDeleteDefinitif(selected)}
          onRefresh={() => { fetchClients(); setSelected(null); }}
        />
      )}

      {/* Modal ajout */}
      {showAdd && (
        <Modal title="Nouveau client" onClose={() => setShowAdd(false)}>
          <ClientForm form={addForm} setForm={setAddForm} onSubmit={handleAdd} onClose={() => setShowAdd(false)} submitLabel="Ajouter le client" sectors={sectors} />
        </Modal>
      )}

      {/* Modal édition */}
      {editClient && (
        <Modal title={`Modifier — ${editClient.entreprise || editClient.contact}`} onClose={() => setEditClient(null)}>
          <ClientForm form={editForm} setForm={setEditForm} onSubmit={handleEdit} onClose={() => setEditClient(null)} submitLabel="Enregistrer" sectors={sectors} />
        </Modal>
      )}

      {/* Modal suppression */}
      {deleteClient && (
        <DeleteClientModal client={deleteClient} onDeactivate={(reason) => handleDeactivate(deleteClient, reason)} onClose={() => setDeleteClient(null)} />
      )}

      {/* Modal gestion des secteurs */}
      {showSectors && (
        <SectorsModal sectors={sectors} onChange={fetchSectors} onClose={() => setShowSectors(false)} />
      )}

      {showImport && (
        <ImportClientsModal
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); fetchClients(true); fetchSectors(); }}
        />
      )}
    </div>
  );
}

// ── Modal import Excel des clients ───────────────────────────────────────────
// Colonnes reconnues (souples) : Code Client · Client · Catégorie · Commune · Téléphone · Commercial
// (+ Entreprise · Email · Wilaya si présentes)
function ImportClientsModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ created: number; total: number; errors: string[] } | null>(null);

  // Normalise un en-tête ("Code Client" → "code client")
  const norm = (s: string) => String(s ?? '').trim().toLowerCase();

  const pick = (obj: any, keys: string[]) => {
    for (const k of Object.keys(obj)) {
      if (keys.includes(norm(k))) { const v = obj[k]; return v == null ? '' : String(v).trim(); }
    }
    return '';
  };

  const handleFile = async (file: File) => {
    setError(''); setResult(null); setParsing(true);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const mapped = raw.map((r) => ({
        code:       pick(r, ['code client', 'code', 'code_client']),
        client:     pick(r, ['client', 'nom', 'nom client', 'name']),
        entreprise: pick(r, ['entreprise', 'société', 'societe', 'company']),
        categorie:  pick(r, ['catégorie', 'categorie', 'secteur', 'category']),
        commune:    pick(r, ['commune', 'ville']),
        telephone:  pick(r, ['téléphone', 'telephone', 'tel', 'phone', 'tél']),
        commercial: pick(r, ['commercial', 'agent', 'responsable']),
        wilaya:     pick(r, ['wilaya']),
        email:      pick(r, ['email', 'mail', 'e-mail']),
      })).filter((r) => r.client); // ignore les lignes sans nom
      setRows(mapped);
      setFileName(file.name);
      if (mapped.length === 0) setError('Aucun client trouvé. Vérifiez que la colonne "Client" existe.');
    } catch (e) {
      console.error(e);
      setError('Impossible de lire ce fichier Excel.');
    } finally { setParsing(false); }
  };

  const doImport = async () => {
    setImporting(true); setError('');
    try {
      const res = await fetch('/api/clients/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Échec de l\'import.'); return; }
      setResult({ created: data.created ?? 0, total: data.total ?? rows.length, errors: data.errors ?? [] });
    } finally { setImporting(false); }
  };

  return (
    <Modal title="Importer des clients (Excel)" onClose={onClose}>
      <div className="space-y-4">
        {!result ? (
          <>
            <p className="text-[13px] text-[#8A9BB5] leading-relaxed">
              Chargez un fichier <b>.xlsx</b>. Colonnes reconnues : <b>Code Client, Client, Catégorie, Commune, Téléphone, Commercial</b> (+ Entreprise, Email, Wilaya si présentes).
              La colonne <b>Catégorie</b> devient le secteur d&apos;activité (créé automatiquement).
            </p>

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#CBD5E1] rounded-xl py-8 cursor-pointer hover:border-[#4CAF4F] hover:bg-[#F8FFF8] transition-colors">
              <svg width={28} height={28} fill="none" viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#8A9BB5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-[13px] font-semibold text-[#374151]">{fileName || 'Choisir un fichier Excel'}</span>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </label>

            {parsing && <p className="text-[13px] text-[#8A9BB5] text-center">Lecture du fichier…</p>}
            {error && <p className="text-[13px] text-[#EF4444] font-medium">{error}</p>}

            {rows.length > 0 && (
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#F0FDF4] border-b border-[#E2E8F0]">
                  <p className="text-[13px] font-bold text-[#166534]">{rows.length} client(s) prêt(s) à importer</p>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {rows.slice(0, 30).map((r, i) => (
                    <div key={i} className="px-4 py-2 border-b border-[#F2F4F7] last:border-b-0 text-[12px]">
                      <span className="font-semibold text-[#0F172A]">{r.client}</span>
                      <span className="text-[#8A9BB5]"> · {[r.categorie, r.commune, r.telephone].filter(Boolean).join(' · ') || '—'}</span>
                    </div>
                  ))}
                  {rows.length > 30 && <div className="px-4 py-2 text-[12px] text-[#ABBED1]">… et {rows.length - 30} autres</div>}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
              <button onClick={doImport} disabled={rows.length === 0 || importing}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] disabled:opacity-60 transition-colors">
                {importing ? 'Import en cours…' : `Importer ${rows.length || ''}`.trim()}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-3">
              <svg width={24} height={24} fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-[15px] font-bold text-[#0F172A] mb-1">{result.created} client(s) importé(s)</p>
            <p className="text-[13px] text-[#8A9BB5]">sur {result.total} ligne(s)</p>
            {result.errors.length > 0 && (
              <div className="mt-3 text-left rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-3 max-h-[120px] overflow-y-auto">
                <p className="text-[12px] font-bold text-[#9A3412] mb-1">{result.errors.length} ligne(s) ignorée(s) :</p>
                {result.errors.map((er, i) => <p key={i} className="text-[11px] text-[#9A3412]">{er}</p>)}
              </div>
            )}
            <button onClick={onDone} className="mt-5 w-full px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] transition-colors">Terminé</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Modal de gestion des secteurs d'activité (créer / renommer / supprimer)
function SectorsModal({ sectors, onChange, onClose }: {
  sectors: { id: string; name: string }[]; onChange: () => void; onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const res = await fetch('/api/sectors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    setSaving(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error ?? 'Erreur'); return; }
    setNewName(''); onChange();
  };
  const remove = async (id: string) => {
    if (!window.confirm('Supprimer ce secteur ? Les clients rattachés perdront leur secteur.')) return;
    await fetch(`/api/sectors/${id}`, { method: 'DELETE' });
    onChange();
  };

  return (
    <Modal title="Secteurs d'activité" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[12px] text-[#8A9BB5]">Créez les secteurs (pharmacie, banque, restaurant…) pour classer vos clients.</p>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nouveau secteur…"
            className="flex-1 px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] text-[#263238] focus:outline-none focus:border-[#4CAF4F]" />
          <button onClick={add} disabled={saving || !newName.trim()} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40" style={{ background: '#4CAF4F' }}>Ajouter</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectors.length === 0 ? (
            <p className="text-[13px] text-[#ABBED1]">Aucun secteur pour l'instant.</p>
          ) : sectors.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
              {s.name}
              <button onClick={() => remove(s.id)} className="text-[#1E40AF] hover:text-[#EF4444] font-bold leading-none">×</button>
            </span>
          ))}
        </div>
      </div>
    </Modal>
  );
}
