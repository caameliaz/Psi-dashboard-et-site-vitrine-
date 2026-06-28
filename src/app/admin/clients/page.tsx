'use client';

import { useState, useRef } from 'react';
import { clientsData, ClientRecord } from '@/lib/clients-data';
import { StatusPill } from '@/components/ui/StatusPill';
import { initials } from '@/lib/utils';

function avatarColor(id: number) {
  const colors = [
    { bg: '#D1FAE5', text: '#166534' },
    { bg: '#DBEAFE', text: '#1E40AF' },
    { bg: '#FDE68A', text: '#92400E' },
    { bg: '#F3E8FF', text: '#6B21A8' },
    { bg: '#FFE4E6', text: '#9F1239' },
    { bg: '#CCFBF1', text: '#134E4A' },
  ];
  return colors[id % colors.length];
}

function ClientSlideIn({ client, onClose }: { client: ClientRecord; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>(client.photo);
  const ac = avatarColor(client.id);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const infoRows = [
      ['Fiche Client PSI', ''],
      ['', ''],
      ['Entreprise', client.entreprise],
      ['Contact', client.contact],
      ['Téléphone', client.telephone],
      ['Email', client.email],
      ['Wilaya', client.wilaya],
      ['Adresse', client.adresse],
      ['', ''],
      ['Historique', ''],
      ['Référence', 'Type', 'Date', 'Statut', 'Produits', 'Montant'],
      ...client.historique.map((h) => [h.ref, h.type, h.date, h.statut, h.produits, h.montant]),
    ];
    const ws = utils.aoa_to_sheet(infoRows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Fiche client');
    writeFile(wb, `Fiche_${client.entreprise}_PSI.xlsx`);
  };

  const exportWord = async () => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } = await import('docx');
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: 'PSI — Paper Solutions Industry', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: 'Fiche Client', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Entreprise : ', bold: true }), new TextRun(client.entreprise)] }),
          new Paragraph({ children: [new TextRun({ text: 'Contact : ', bold: true }), new TextRun(client.contact)] }),
          new Paragraph({ children: [new TextRun({ text: 'Téléphone : ', bold: true }), new TextRun(client.telephone)] }),
          new Paragraph({ children: [new TextRun({ text: 'Email : ', bold: true }), new TextRun(client.email)] }),
          new Paragraph({ children: [new TextRun({ text: 'Wilaya : ', bold: true }), new TextRun(client.wilaya)] }),
          new Paragraph({ children: [new TextRun({ text: 'Adresse : ', bold: true }), new TextRun(client.adresse)] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Historique des commandes & devis', heading: HeadingLevel.HEADING_3 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Référence', 'Type', 'Date', 'Statut', 'Produits', 'Montant'].map((h) =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })] })
                ),
              }),
              ...client.historique.map((h) =>
                new TableRow({
                  children: [h.ref, h.type, h.date, h.statut, h.produits, h.montant].map((v) =>
                    new TableCell({ children: [new Paragraph(v)] })
                  ),
                })
              ),
            ],
          }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Fiche_${client.entreprise}_PSI.docx`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="text-[15px] font-bold text-[#0F172A]">Fiche client</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Avatar + infos */}
          <div className="px-6 py-6 border-b border-[#F2F4F7]">
            <div className="flex items-start gap-4">
              {/* Avatar cliquable */}
              <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => fileRef.current?.click()}>
                {photo ? (
                  <img src={photo} alt={client.contact} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[20px] font-extrabold" style={{ background: ac.bg, color: ac.text }}>
                    {initials(client.contact)}
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-[10px] font-bold text-center leading-tight">Changer<br/>photo</span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-bold text-[#0F172A]">{client.contact}</p>
                <p className="text-[13px] font-semibold text-[#4CAF4F]">{client.entreprise}</p>
                <p className="text-[12px] text-[#8A9BB5] mt-0.5">{client.wilaya}</p>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <span className="text-[11px] text-[#8A9BB5]">Commandes</span>
                <span className="text-[22px] font-extrabold text-[#0F172A] leading-none">{client.commandes}</span>
              </div>
            </div>

            {/* Infos */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Téléphone', value: client.telephone },
                { label: 'Email', value: client.email },
                { label: 'Adresse', value: client.adresse },
                { label: 'Devis envoyés', value: String(client.devis) },
              ].map((info) => (
                <div key={info.label} className="bg-[#F8FAFC] rounded-xl p-3">
                  <p className="text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wider mb-0.5">{info.label}</p>
                  <p className="text-[12px] font-semibold text-[#0F172A] break-all">{info.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Historique */}
          <div className="px-6 py-5">
            <p className="text-[12px] font-bold text-[#8A9BB5] uppercase tracking-wider mb-3">Historique</p>
            <div className="flex flex-col gap-3">
              {client.historique.map((h) => (
                <div key={h.ref} className="bg-[#F8FAFC] rounded-xl p-3.5 border border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${h.type === 'Commande' ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#F5F3FF] text-[#5B21B6]'}`}>{h.type}</span>
                      <span className="text-[12px] font-mono text-[#8A9BB5]">{h.ref}</span>
                    </div>
                    <StatusPill status={h.statut} />
                  </div>
                  <p className="text-[12px] text-[#374151]">{h.produits}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-[#8A9BB5]">{h.date}</span>
                    <span className="text-[12px] font-bold text-[#0F172A]">{h.montant}</span>
                  </div>
                </div>
              ))}
              {client.historique.length === 0 && (
                <p className="text-[13px] text-[#8A9BB5] text-center py-6">Aucun historique</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer export */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-3">
          <span className="text-[12px] font-semibold text-[#8A9BB5] mr-auto">Exporter la fiche :</span>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white transition-colors" style={{ background: '#217346' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="white" strokeWidth="1.8"/><path d="M14 2v6h6M8 13l8 0M8 17l8 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Excel
          </button>
          <button onClick={exportWord} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white transition-colors" style={{ background: '#2B579A' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="white" strokeWidth="1.8"/><path d="M14 2v6h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><path d="M9 13l1.5 4 1.5-4 1.5 4 1.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Word
          </button>
        </div>
      </div>
    </>
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

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ClientRecord | null>(null);

  const filtered = clientsData.filter(
    (c) =>
      c.entreprise.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()) ||
      c.wilaya.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Clients</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{clientsData.length} clients enregistrés</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2"><IconSearch /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder-[#8A9BB5] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors"
        />
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8A9BB5]">
          <p className="text-[15px] font-semibold">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((c) => {
            const ac = avatarColor(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 text-left hover:border-[#4CAF4F] hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-extrabold flex-shrink-0" style={{ background: ac.bg, color: ac.text }}>
                    {initials(c.contact)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#0F172A] truncate group-hover:text-[#4CAF4F] transition-colors">{c.contact}</p>
                    <p className="text-[12px] text-[#8A9BB5] truncate">{c.entreprise}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8A9BB5] mb-3">
                  <span className="font-medium">📍 {c.wilaya}</span>
                  <span>{c.derniere}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex-1 bg-[#F0FDF4] text-[#166534] text-[11px] font-bold px-2.5 py-1 rounded-lg text-center">
                    {c.commandes} commande{c.commandes > 1 ? 's' : ''}
                  </span>
                  {c.devis > 0 && (
                    <span className="flex-1 bg-[#F5F3FF] text-[#5B21B6] text-[11px] font-bold px-2.5 py-1 rounded-lg text-center">
                      {c.devis} devis
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Slide-in */}
      {selected && <ClientSlideIn client={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
