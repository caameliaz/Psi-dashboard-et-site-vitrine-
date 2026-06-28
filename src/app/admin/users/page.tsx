'use client';

import { useState } from 'react';
import { initials } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

interface User {
  id: number;
  nom: string;
  email: string;
  role: 'Admin' | 'Employe';
  statut: 'Actif' | 'Inactif';
}

const initialUsers: User[] = [
  { id: 1, nom: 'Yacine Rahali', email: 'yacine@psi.dz', role: 'Admin', statut: 'Actif' },
  { id: 2, nom: 'Amira Bensaid', email: 'amira@psi.dz', role: 'Employe', statut: 'Actif' },
  { id: 3, nom: 'Tariq Meziane', email: 'tariq@psi.dz', role: 'Employe', statut: 'Actif' },
  { id: 4, nom: 'Samia Oukil', email: 'samia@psi.dz', role: 'Employe', statut: 'Inactif' },
];

const emptyForm = { nom: '', email: '', role: 'Employe' as 'Admin' | 'Employe', motdepasse: '' };

function avatarColor(role: string) {
  return role === 'Admin'
    ? { bg: '#F3E8FF', text: '#6B21A8' }
    : { bg: '#D1FAE5', text: '#166534' };
}

function RoleBadge({ role }: { role: 'Admin' | 'Employe' }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={role === 'Admin' ? { background: '#F3E8FF', color: '#6B21A8' } : { background: '#F2F4F7', color: '#374151' }}>
      {role === 'Admin' ? 'Admin' : 'Employé'}
    </span>
  );
}

function StatutBadge({ statut }: { statut: 'Actif' | 'Inactif' }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={statut === 'Actif' ? { background: '#F0FDF4', color: '#166534' } : { background: '#F2F4F7', color: '#6B7280' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statut === 'Actif' ? '#22C55E' : '#9CA3AF' }} />
      {statut}
    </span>
  );
}

function UserForm({ form, setForm, onSubmit, onClose, submitLabel, isEdit }: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel: string;
  isEdit?: boolean;
}) {
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nom complet</label>
        <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Prénom Nom" className={inputClass} />
      </div>
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@psi.dz" className={inputClass} />
      </div>
      {!isEdit && (
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Mot de passe temporaire</label>
          <input type="password" value={form.motdepasse} onChange={(e) => setForm({ ...form, motdepasse: e.target.value })} placeholder="••••••••" className={inputClass} />
        </div>
      )}
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Role</label>
        <div className="flex gap-3">
          {(['Admin', 'Employe'] as const).map((r) => (
            <button key={r} onClick={() => setForm({ ...form, role: r })} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all" style={form.role === r ? { background: r === 'Admin' ? '#F3E8FF' : '#F0FDF4', borderColor: r === 'Admin' ? '#7C3AED' : '#4CAF4F', color: r === 'Admin' ? '#6B21A8' : '#166534' } : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#8A9BB5' }}>
              {r === 'Admin' ? 'Admin' : 'Employé'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
        <button onClick={onSubmit} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>{submitLabel}</button>
      </div>
    </div>
  );
}

function DeleteUserModal({ user, onDeactivate, onDelete, onClose }: { user: User; onDeactivate: () => void; onDelete: () => void; onClose: () => void }) {
  const [step, setStep] = useState<'choice' | 'confirm'>('choice');
  if (step === 'confirm') {
    return (
      <Modal title="Suppression definitive" onClose={onClose}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
            <svg width={22} height={22} fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className="text-[14px] font-bold text-[#0F172A] mb-1">Supprimer <span className="text-[#EF4444]">{user.nom}</span> ?</p>
          <p className="text-[12px] text-[#8A9BB5] mb-5">Ce compte sera definitivement supprime. Cette action est irreversible.</p>
          <div className="flex gap-3">
            <button onClick={() => setStep('choice')} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Retour</button>
            <button onClick={onDelete} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-colors">Supprimer</button>
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="Que voulez-vous faire ?" onClose={onClose}>
      <p className="text-[13px] text-[#8A9BB5] mb-5">Utilisateur : <span className="font-semibold text-[#0F172A]">{user.nom}</span></p>
      <div className="flex flex-col gap-3">
        <button onClick={onDeactivate} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-left hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-all group">
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#92400E]">Desactiver le compte</p>
          <p className="text-[11px] text-[#8A9BB5]">L&apos;utilisateur ne peut plus se connecter mais reste en historique</p>
        </button>
        <button onClick={() => setStep('confirm')} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-left hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-all group">
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#991B1B]">Supprimer definitivement</p>
          <p className="text-[11px] text-[#8A9BB5]">Efface le compte — irreversible</p>
        </button>
        <button onClick={onClose} className="px-4 py-2 text-sm text-[#8A9BB5] hover:text-[#374151] transition-colors">Annuler</button>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'Admin' | 'Employe'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [addForm, setAddForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleAdd = () => {
    if (!addForm.nom.trim() || !addForm.email.trim()) return;
    setUsers((p) => [...p, { id: Date.now(), nom: addForm.nom, email: addForm.email, role: addForm.role, statut: 'Actif' }]);
    setAddForm(emptyForm);
    setShowAdd(false);
  };

  const openEdit = (u: User) => {
    setEditForm({ nom: u.nom, email: u.email, role: u.role, motdepasse: '' });
    setEditUser(u);
  };

  const handleEdit = () => {
    if (!editUser) return;
    setUsers((p) => p.map((x) => x.id === editUser.id ? { ...x, nom: editForm.nom, email: editForm.email, role: editForm.role } : x));
    setEditUser(null);
  };

  const handleDeactivate = () => {
    if (!deleteUser) return;
    setUsers((p) => p.map((x) => x.id === deleteUser.id ? { ...x, statut: 'Inactif' } : x));
    setDeleteUser(null);
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    setUsers((p) => p.filter((x) => x.id !== deleteUser.id));
    setDeleteUser(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.nom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const inputClass = "px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Utilisateurs</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{filteredUsers.length} compte{filteredUsers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setAddForm(emptyForm); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#4CAF4F' }}>
          + Nouvel utilisateur
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={14} height={14} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, email..." className={inputClass + " pl-8 w-[220px]"} />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as typeof filterRole)} className={inputClass}>
          <option value="all">Tous les roles</option>
          <option value="Admin">Admin</option>
          <option value="Employe">Employe</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Nom', 'Email', 'Role', 'Statut', 'Actions'].map((h) => (
                <th key={h} className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-14 text-center text-[13px] text-[#8A9BB5]">Aucun utilisateur trouve</td></tr>
            ) : filteredUsers.map((u) => {
              const ac = avatarColor(u.role);
              return (
                <tr key={u.id} className="border-t border-[#F2F4F7] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: ac.bg, color: ac.text }}>{initials(u.nom)}</div>
                      <span className="text-[13px] font-semibold text-[#0F172A]">{u.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[#8A9BB5]">{u.email}</td>
                  <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-6 py-4"><StatutBadge statut={u.statut} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(u)} className="hover:opacity-70 transition-opacity">
                        <svg width={15} height={15} fill="none"><path d="M10.5 1.5L12.5 3.5L6 10L3.5 10.5L4 8L10.5 1.5Z" stroke="#8A9BB5" strokeWidth="1.5" strokeLinejoin="round"/><path d="M0.75 13.25H13.25" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.5"/></svg>
                      </button>
                      <button onClick={() => setDeleteUser(u)} className="hover:opacity-70 transition-opacity">
                        <svg width={15} height={15} fill="none"><path d="M1.5 3.5H12.5" stroke="#EF4444" strokeLinecap="round" strokeWidth="1.5"/><path d="M5 3.5V2.5C5 1.95 5.45 1.5 6 1.5H8C8.55 1.5 9 1.95 9 2.5V3.5" stroke="#EF4444" strokeLinecap="round" strokeWidth="1.5"/><path d="M2.5 3.5L3 12C3 12.55 3.45 13 4 13H10C10.55 13 11 12.55 11 12L11.5 3.5" stroke="#EF4444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && <Modal title="Nouvel utilisateur" onClose={() => setShowAdd(false)}><UserForm form={addForm} setForm={setAddForm} onSubmit={handleAdd} onClose={() => setShowAdd(false)} submitLabel="Creer le compte" /></Modal>}
      {editUser && <Modal title="Modifier l'utilisateur" onClose={() => setEditUser(null)}><UserForm form={editForm} setForm={setEditForm} onSubmit={handleEdit} onClose={() => setEditUser(null)} submitLabel="Enregistrer" isEdit /></Modal>}
      {deleteUser && <DeleteUserModal user={deleteUser} onDeactivate={handleDeactivate} onDelete={handleDelete} onClose={() => setDeleteUser(null)} />}
    </div>
  );
}
