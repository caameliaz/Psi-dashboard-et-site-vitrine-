'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
interface ClientRecord {
  id: string | number;
  _dbId?: string;
  entreprise: string;
  contact: string;
  telephone: string;
  wilaya: string;
  adresse: string;
  email: string;
  photo?: string;
  commandes: number;
  devis: number;
  derniere: string;
  historique: Array<{
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
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { Modal } from '@/components/ui/Modal';
import { WilayaSelect } from '@/components/ui/WilayaSelect';

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
  entreprise: '', contact: '', telephone: '', wilaya: '', adresse: '', email: '',
};

function ClientForm({ form, setForm, onSubmit, onClose, submitLabel }: {
  form: typeof emptyClient;
  setForm: (f: typeof emptyClient) => void;
  onSubmit: () => void;
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
      <div>
        <label className={labelClass}>Wilaya</label>
        <WilayaSelect value={form.wilaya} onChange={(v) => setForm({ ...form, wilaya: v })} />
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

  const handleSubmit = () => {
    if (!produits.trim()) return;
    // En mode mock, on ferme juste — le branchement DB viendra plus tard
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] max-w-[92vw] p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-bold text-[#0F172A]">Nouvelle demande</h3>
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
          <button onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors"
            style={{ background: '#4CAF4F' }}>
            Créer la {type.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientSlideIn({ client, onClose, onEdit, onDelete }: {
  client: ClientRecord; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>(client.photo);
  const [selectedRequest, setSelectedRequest] = useState<RequestDetail | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const ac = avatarColor(client.id);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const waHref = `https://wa.me/${client.telephone.replace(/\s/g, '').replace('+', '')}`;
  const callHref = `tel:${client.telephone.replace(/\s/g, '')}`;
  const emailHref = client.email ? `mailto:${client.email}` : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full bg-white z-50 shadow-2xl flex flex-col overflow-hidden" style={{ width: '46vw', minWidth: 500 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <p className="text-[13px] font-semibold text-[#8A9BB5]">Fiche client</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] text-[#ABBED1] hover:text-[#374151] transition-colors">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Profil */}
          <div className="px-6 pt-6 pb-5 border-b border-[#F2F4F7]">
            <div className="flex items-start gap-4 mb-5">
              {/* Avatar cliquable */}
              <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => fileRef.current?.click()}>
                {photo ? (
                  <img src={photo} alt={client.contact} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[20px] font-extrabold" style={{ background: ac.bg, color: ac.text }}>
                    {initials(client.entreprise || client.contact)}
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-[10px] font-bold text-center leading-tight">Photo</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

              <div className="flex-1 min-w-0">
                <p className="text-[20px] font-extrabold text-[#0F172A] leading-tight">{client.entreprise || client.contact}</p>
                <p className="text-[14px] font-semibold text-[#4CAF4F] mt-0.5">{client.entreprise ? client.contact : ''}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[12px] text-[#8A9BB5]">{client.wilaya}</span>
                  {client.adresse && <><span className="text-[#E2E8F0]">·</span><span className="text-[12px] text-[#ABBED1] truncate">{client.adresse}</span></>}
                </div>
              </div>
            </div>

            {/* Stats inline */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 rounded-xl border border-[#F2F4F7] px-4 py-3 text-center">
                <p className="text-[22px] font-extrabold text-[#0F172A] leading-none">{client.commandes}</p>
                <p className="text-[11px] text-[#8A9BB5] mt-1">Commandes</p>
              </div>
              <div className="flex-1 rounded-xl border border-[#F2F4F7] px-4 py-3 text-center">
                <p className="text-[22px] font-extrabold text-[#8B5CF6] leading-none">{client.devis}</p>
                <p className="text-[11px] text-[#8A9BB5] mt-1">Devis</p>
              </div>
              <div className="flex-1 rounded-xl border border-[#F2F4F7] px-4 py-3 text-center">
                <p className="text-[13px] font-bold text-[#0F172A] leading-none">{client.derniere}</p>
                <p className="text-[11px] text-[#8A9BB5] mt-1">Dernière cmd</p>
              </div>
            </div>

            {/* Infos contact à plat */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#8A9BB5" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <span className="text-[13px] text-[#374151] font-medium">{client.telephone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-3">
                  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#8A9BB5" strokeWidth="1.6"/><path d="M22 6l-10 7L2 6" stroke="#8A9BB5" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  <span className="text-[13px] text-[#374151] font-medium">{client.email}</span>
                </div>
              )}
            </div>

            {/* Boutons contact */}
            <div className="flex gap-2 mt-4">
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white"
                style={{ background: '#25D366' }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.522 5.854L.057 23.714a.5.5 0 00.61.639l5.963-1.562A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.862 9.862 0 012.106 12C2.106 6.53 6.53 2.106 12 2.106c5.471 0 9.894 4.424 9.894 9.894 0 5.471-4.423 9.894-9.894 9.894z"/></svg>
                WhatsApp
              </a>
              <a href={callHref} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC] transition-colors">
                <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.08 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                Appeler
              </a>
              {emailHref && (
                <a href={emailHref} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC] transition-colors">
                  <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.6"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  Email
                </a>
              )}
            </div>
          </div>

          {/* Historique commandes */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">Historique</p>
              <button onClick={() => setShowNewOrder(true)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
                style={{ background: '#4CAF4F' }}>
                Nouvelle demande
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {client.historique.map((h) => {
                const detail: RequestDetail = {
                  ref: h.ref, type: h.type, date: h.date, statut: h.statut,
                  montant: h.montant, produits: h.produits,
                  client: client.contact, entreprise: client.entreprise,
                  telephone: client.telephone, wilaya: client.wilaya,
                  adresse: client.adresse, email: client.email,
                };
                const isCmd = h.type === 'Commande';
                return (
                  <button key={h.ref} onClick={() => setSelectedRequest(detail)}
                    className="w-full text-left rounded-xl border border-[#F2F4F7] hover:border-[#4CAF4F] transition-all px-4 py-3 flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: isCmd ? '#F0FDF4' : '#F5F3FF', color: isCmd ? '#166534' : '#5B21B6' }}>{h.type}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-mono text-[#8A9BB5]">{h.ref}</p>
                      <p className="text-[12px] text-[#374151] truncate">{h.produits}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[13px] font-bold text-[#0F172A]">{h.montant}</p>
                      <p className="text-[11px] text-[#ABBED1]">{h.date}</p>
                    </div>
                    <StatusPill status={h.statut} />
                  </button>
                );
              })}
              {client.historique.length === 0 && (
                <p className="text-[13px] text-[#8A9BB5] text-center py-8">Aucune commande</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F2F4F7] flex items-center gap-3">
          <button onClick={() => { onClose(); onDelete(); }} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-[#EF4444] border border-[#FECACA] hover:bg-[#FEF2F2] transition-colors">
            Supprimer
          </button>
          <div className="flex-1" />
          <button onClick={() => { onClose(); onEdit(); }} className="px-4 py-2 rounded-lg text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
            Modifier
          </button>
        </div>
      </div>

      {selectedRequest && <RequestPanel item={selectedRequest} onClose={() => setSelectedRequest(null)} />}
      {showNewOrder && <NewOrderForm client={client} onClose={() => setShowNewOrder(false)} />}
    </>
  );
}

function DeleteClientModal({ client, onDelete, onClose }: { client: ClientRecord; onDelete: () => void; onClose: () => void }) {
  return (
    <Modal title="Supprimer le client" onClose={onClose}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
          <svg width={22} height={22} fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p className="text-[14px] font-bold text-[#0F172A] mb-1">Supprimer <span className="text-[#EF4444]">{client.entreprise || client.contact}</span> ?</p>
        <p className="text-[12px] text-[#8A9BB5] mb-5">La fiche client et tout son historique seront supprimés.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={onDelete} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-colors">Supprimer</button>
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
    ref: o.id.slice(0, 8).toUpperCase(),
    type: 'Commande' as const,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    statut: STATUS_DB_TO_UI[o.status] ?? o.status,
    montant: `${(o.items ?? []).reduce((acc: number, i: any) => acc + i.quantity * (i.unitPrice ?? 0), 0).toLocaleString('fr-FR')} DA`,
    produits: (o.items ?? []).map((i: any) => `${i.product?.reference ?? '?'} × ${i.quantity}`).join(', ') || '—',
    _ts: new Date(o.createdAt).getTime(),
  }));
  const quoteHist = (c.quotes ?? []).map((q: any) => ({
    ref: q.id.slice(0, 8).toUpperCase(),
    type: 'Devis' as const,
    date: new Date(q.createdAt).toLocaleDateString('fr-FR'),
    statut: STATUS_DB_TO_UI[q.status] ?? q.status,
    montant: 'Sur devis',
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
    adresse: c.address ?? '',
    email: c.email ?? '',
    commandes: ordersCount,
    devis: quotesCount,
    derniere: lastDate,
    historique,
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [editClient, setEditClient]   = useState<ClientRecord | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientRecord | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ ...emptyClient });
  const [editForm, setEditForm] = useState({ ...emptyClient });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.map(dbClientToRecord));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = clients.filter(
    (c) =>
      c.entreprise.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()) ||
      c.wilaya.toLowerCase().includes(search.toLowerCase())
  );

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
        address: addForm.adresse.trim() || null,
        phone: addForm.telephone.trim() || null,
      }),
    });
    if (res.ok) {
      await fetchClients();
      setAddForm({ ...emptyClient });
      setShowAdd(false);
    }
  };

  const openEdit = (c: ClientRecord) => {
    setEditForm({ entreprise: c.entreprise, contact: c.contact, telephone: c.telephone, wilaya: c.wilaya, adresse: c.adresse, email: c.email });
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
        address: editForm.adresse.trim() || null,
        phone: editForm.telephone.trim() || null,
      }),
    });
    if (res.ok) {
      await fetchClients();
      setEditClient(null);
    }
  };

  const handleDelete = async (c: ClientRecord) => {
    const id = (c as any)._dbId ?? c.id;
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchClients();
    }
    setDeleteClient(null);
    setSelected(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Clients</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{loading ? 'Chargement…' : `${clients.length} clients enregistrés`}</p>
        </div>
        <button onClick={() => { setAddForm({ ...emptyClient }); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors" style={{ background: '#4CAF4F' }}>
          + Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2"><IconSearch /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#263238] placeholder-[#8A9BB5] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all"
        />
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8A9BB5]">
          <p className="text-[15px] font-semibold">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {filtered.map((c) => {
            const ac = avatarColor(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-[#4CAF4F] hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-extrabold flex-shrink-0" style={{ background: ac.bg, color: ac.text }}>
                    {initials(c.entreprise || c.contact)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0F172A] truncate group-hover:text-[#4CAF4F] transition-colors">{c.entreprise || c.contact}</p>
                    <p className="text-[11px] text-[#8A9BB5] truncate">{c.contact}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#ABBED1] mb-2.5">
                  <span>{c.wilaya}</span>
                  <span>{c.derniere}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="flex-1 bg-[#F0FDF4] text-[#166534] text-[10px] font-bold px-2 py-1 rounded-md text-center">
                    {c.commandes} cmd
                  </span>
                  {c.devis > 0 && (
                    <span className="flex-1 bg-[#F5F3FF] text-[#5B21B6] text-[10px] font-bold px-2 py-1 rounded-md text-center">
                      {c.devis} devis
                    </span>
                  )}
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
        />
      )}

      {/* Modal ajout */}
      {showAdd && (
        <Modal title="Nouveau client" onClose={() => setShowAdd(false)}>
          <ClientForm form={addForm} setForm={setAddForm} onSubmit={handleAdd} onClose={() => setShowAdd(false)} submitLabel="Ajouter le client" />
        </Modal>
      )}

      {/* Modal édition */}
      {editClient && (
        <Modal title={`Modifier — ${editClient.entreprise || editClient.contact}`} onClose={() => setEditClient(null)}>
          <ClientForm form={editForm} setForm={setEditForm} onSubmit={handleEdit} onClose={() => setEditClient(null)} submitLabel="Enregistrer" />
        </Modal>
      )}

      {/* Modal suppression */}
      {deleteClient && (
        <DeleteClientModal client={deleteClient} onDelete={() => handleDelete(deleteClient)} onClose={() => setDeleteClient(null)} />
      )}
    </div>
  );
}
