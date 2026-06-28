'use client';

import { useState } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';

const ordersData = [
  { id: 1, nom: 'Ahmed Benali', entreprise: 'TechAlger', telephone: '+213 555 001 001', date: '24/06/2026', heure: '09:42', statut: 'Validé' },
  { id: 2, nom: 'Sara Mansouri', entreprise: 'BuroPro', telephone: '+213 555 002 002', date: '23/06/2026', heure: '14:17', statut: 'En attente' },
  { id: 3, nom: 'Karim Hadji', entreprise: 'AlgeroShop', telephone: '+213 555 003 003', date: '22/06/2026', heure: '11:05', statut: 'Contacté' },
  { id: 4, nom: 'Nadia Berber', entreprise: 'MegaDist', telephone: '+213 555 004 004', date: '21/06/2026', heure: '16:30', statut: 'Annulé' },
  { id: 5, nom: 'Mohamed Ziani', entreprise: 'PrintPlus', telephone: '+213 555 005 005', date: '20/06/2026', heure: '08:50', statut: 'Validé' },
];

const quotesData = [
  { id: 1, nom: 'Fatima Bouzid', entreprise: 'EcoMarket', telephone: '+213 555 006 006', date: '24/06/2026', heure: '10:20', statut: 'En attente' },
  { id: 2, nom: 'Youssef Amrani', entreprise: 'DigiStore', telephone: '+213 555 007 007', date: '22/06/2026', heure: '15:45', statut: 'Contacté' },
  { id: 3, nom: 'Leila Kaci', entreprise: 'FastPrint', telephone: '+213 555 008 008', date: '20/06/2026', heure: '09:10', statut: 'Validé' },
];

const ALL_STATUTS = ['En attente', 'Contacté', 'Validé', 'Annulé'];

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'commandes' | 'devis'>('commandes');
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');

  const raw = activeTab === 'commandes' ? ordersData : quotesData;

  const filtered = raw.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.nom.toLowerCase().includes(q) || r.entreprise.toLowerCase().includes(q);
    const matchStatut = filterStatut === 'all' || r.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const inputClass = "px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Demandes</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{filtered.length} resultat{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#E4EBF5' }}>
          {(['commandes', 'devis'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize" style={{ background: activeTab === tab ? '#fff' : 'transparent', color: activeTab === tab ? '#101828' : '#8A9BB5', boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={14} height={14} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher client, entreprise..." className={inputClass + " pl-8 w-[240px]"} />
        </div>
        <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className={inputClass}>
          <option value="all">Tous les statuts</option>
          {ALL_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || filterStatut !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterStatut('all'); }} className="text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151]">Effacer</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Nom', 'Entreprise', 'Telephone', 'Date', 'Heure', 'Statut'].map((h) => (
                <th key={h} className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Aucune demande trouvee</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id} className="border-t border-[#F2F4F7] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                <td className="px-6 py-4 text-[13px] font-semibold text-[#0F172A]">{row.nom}</td>
                <td className="px-6 py-4 text-[13px] text-[#8A9BB5]">{row.entreprise}</td>
                <td className="px-6 py-4 text-[13px] text-[#8A9BB5] font-mono">{row.telephone}</td>
                <td className="px-6 py-4 text-[13px] text-[#8A9BB5] tabular-nums">{row.date}</td>
                <td className="px-6 py-4 text-[12px] font-mono text-[#4CAF4F]">{row.heure}</td>
                <td className="px-6 py-4"><StatusPill status={row.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
