'use client';

import { useState, useEffect, useCallback } from 'react';
import { initials } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { AdminSelect } from '@/components/ui/AdminSelect';

const ALL_PERMISSIONS = [
  { key: 'voir_commandes',     label: 'Voir les commandes & devis' },
  { key: 'modifier_statuts',   label: 'Modifier les statuts' },
  { key: 'voir_clients',       label: 'Voir les fiches clients' },
  { key: 'modifier_clients',   label: 'Modifier / ajouter des clients' },
  { key: 'voir_produits',      label: 'Voir les produits' },
  { key: 'modifier_produits',  label: 'Modifier les produits' },
  { key: 'voir_historique',    label: "Voir l'historique" },
  { key: 'modifier_contenu',   label: 'Modifier le contenu du site' },
  { key: 'gerer_utilisateurs', label: 'Gérer les utilisateurs' },
] as const;

type PermKey = typeof ALL_PERMISSIONS[number]['key'];

const ADMIN_PERMS: PermKey[]   = ALL_PERMISSIONS.map((p) => p.key);
const EMPLOYE_PERMS: PermKey[] = ['voir_commandes', 'modifier_statuts', 'voir_clients', 'voir_produits', 'voir_historique'];

interface User {
  id: number;
  nom: string;
  email: string;
  role: 'Admin' | 'Employe';
  statut: 'Actif' | 'Inactif';
  permissions: PermKey[];
}

function dbUserToUser(u: any): User {
  return {
    id: u.id,
    nom: u.name ?? '—',
    email: u.email ?? '—',
    role: u.role === 'ADMIN' ? 'Admin' : 'Employe',
    statut: u.active ? 'Actif' : 'Inactif',
    permissions: u.role === 'ADMIN' ? [...ADMIN_PERMS] : [...EMPLOYE_PERMS],
  };
}

const emptyForm = { nom: '', email: '', role: 'Employe' as 'Admin' | 'Employe', motdepasse: '' };

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function avatarColor(role: string) {
  return role === 'Admin' ? { bg: '#F3E8FF', text: '#6B21A8' } : { bg: '#D1FAE5', text: '#166534' };
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
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statut === 'Actif' ? '#4CAF4F' : '#9CA3AF' }} />
      {statut}
    </span>
  );
}

function PermToggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
      style={{ background: checked ? '#4CAF4F' : '#fff', borderColor: checked ? '#4CAF4F' : '#D1D5DB', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {checked && (
        <svg width={10} height={10} viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

/* ─── Modal identifiants après création ─── */
function CredsModal({ nom, email, password, onClose }: { nom: string; email: string; password: string; onClose: () => void }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPwd, setCopiedPwd]     = useState(false);

  const copy = (text: string, which: 'email' | 'pwd') => {
    navigator.clipboard.writeText(text);
    if (which === 'email') { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 1800); }
    else                   { setCopiedPwd(true);   setTimeout(() => setCopiedPwd(false), 1800); }
  };

  return (
    <Modal title="Compte créé" onClose={onClose}>
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-3">
          <svg width={22} height={22} fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#4CAF4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p className="text-[15px] font-bold text-[#0F172A]">{nom} peut maintenant se connecter</p>
        <p className="text-[12px] text-[#8A9BB5] mt-1">Transmettez ces identifiants de manière sécurisée.</p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { label: 'Email', value: email, which: 'email' as const, copied: copiedEmail },
          { label: 'Mot de passe temporaire', value: password, which: 'pwd' as const, copied: copiedPwd },
        ].map(({ label, value, which, copied }) => (
          <div key={which}>
            <p className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-widest mb-1.5">{label}</p>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="flex-1 text-[14px] font-mono text-[#0F172A] select-all">{value}</span>
              <button onClick={() => copy(value, which)} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                style={{ background: copied ? '#F0FDF4' : '#F2F4F7', color: copied ? '#166534' : '#374151' }}>
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#ABBED1] text-center mb-4">L&apos;utilisateur devra changer son mot de passe à la première connexion.</p>
      <button onClick={onClose} className="w-full px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
        Fermer
      </button>
    </Modal>
  );
}

/* ─── Formulaire de création (multi-étapes) ─── */
interface AddFormData { nom: string; email: string; role: 'Admin' | 'Employe'; motdepasse: string; permissions: PermKey[]; }

function CreateUserForm({ onSubmit, onClose }: { onSubmit: (data: AddFormData) => void; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState<AddFormData>({ nom: '', email: '', role: 'Employe', motdepasse: genPassword(), permissions: [...EMPLOYE_PERMS] });

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";

  const setRole = (role: 'Admin' | 'Employe') => {
    setData({ ...data, role, permissions: role === 'Admin' ? [...ADMIN_PERMS] : [...EMPLOYE_PERMS] });
  };

  const togglePerm = (perm: PermKey) => {
    const isAdmin = data.role === 'Admin';
    if (isAdmin) return;
    setData((d) => ({
      ...d,
      permissions: d.permissions.includes(perm)
        ? d.permissions.filter((p) => p !== perm)
        : [...d.permissions, perm],
    }));
  };

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nom complet</label>
          <input value={data.nom} onChange={(e) => setData({ ...data, nom: e.target.value })} placeholder="Prénom Nom" className={inputClass} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Email</label>
          <input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="email@psi.dz" className={inputClass} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Mot de passe temporaire</label>
          <div className="flex gap-2">
            <input value={data.motdepasse} onChange={(e) => setData({ ...data, motdepasse: e.target.value })} className={`${inputClass} font-mono`} />
            <button onClick={() => setData({ ...data, motdepasse: genPassword() })} className="flex-shrink-0 px-3 py-2 rounded-xl border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">
              ↻
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Rôle</label>
          <div className="flex gap-3">
            {(['Admin', 'Employe'] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all"
                style={data.role === r ? { background: r === 'Admin' ? '#F3E8FF' : '#F0FDF4', borderColor: r === 'Admin' ? '#7C3AED' : '#4CAF4F', color: r === 'Admin' ? '#6B21A8' : '#166534' } : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#8A9BB5' }}>
                {r === 'Admin' ? 'Admin' : 'Employé'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={() => { if (data.nom.trim() && data.email.trim()) setStep(2); }} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
            Suivant — Autorisations
          </button>
        </div>
      </div>
    );
  }

  // Step 2 : permissions
  const isAdmin = data.role === 'Admin';
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold text-[#8A9BB5] uppercase tracking-widest">Autorisations</p>
        {!isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setData({ ...data, permissions: [...ADMIN_PERMS] })} className="text-[11px] font-semibold text-[#4CAF4F] hover:underline">Tout cocher</button>
            <span className="text-[#E2E8F0]">·</span>
            <button onClick={() => setData({ ...data, permissions: [] })} className="text-[11px] font-semibold text-[#8A9BB5] hover:underline">Tout décocher</button>
          </div>
        )}
        {isAdmin && <span className="text-[11px] text-[#ABBED1]">Toutes (Admin)</span>}
      </div>

      <div className="flex flex-col gap-2 mb-5">
        {ALL_PERMISSIONS.map((perm) => {
          const checked = data.permissions.includes(perm.key);
          return (
            <div key={perm.key} onClick={() => togglePerm(perm.key)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{ background: checked ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${checked ? '#BBF7D0' : '#F2F4F7'}`, cursor: isAdmin ? 'default' : 'pointer' }}>
              <PermToggle checked={checked} onChange={() => togglePerm(perm.key)} disabled={isAdmin} />
              <span className="text-[13px] font-medium" style={{ color: checked ? '#166534' : '#374151' }}>{perm.label}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Retour</button>
        <button onClick={() => onSubmit(data)} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>Créer le compte</button>
      </div>
    </div>
  );
}

/* ─── Formulaire de modification ─── */
function EditUserForm({ form, setForm, onSubmit, onClose }: {
  form: typeof emptyForm; setForm: (f: typeof emptyForm) => void; onSubmit: () => void; onClose: () => void;
}) {
  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";
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
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Rôle</label>
        <div className="flex gap-3">
          {(['Admin', 'Employe'] as const).map((r) => (
            <button key={r} onClick={() => setForm({ ...form, role: r })} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all"
              style={form.role === r ? { background: r === 'Admin' ? '#F3E8FF' : '#F0FDF4', borderColor: r === 'Admin' ? '#7C3AED' : '#4CAF4F', color: r === 'Admin' ? '#6B21A8' : '#166534' } : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#8A9BB5' }}>
              {r === 'Admin' ? 'Admin' : 'Employé'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
        <button onClick={onSubmit} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>Enregistrer</button>
      </div>
    </div>
  );
}

/* ─── Fiche utilisateur (slide-in) ─── */
function UserSlideIn({ user, onClose, onEdit, onDelete, onPermChange }: {
  user: User; onClose: () => void; onEdit: () => void; onDelete: () => void;
  onPermChange: (userId: number, perm: PermKey, value: boolean) => void;
}) {
  const ac = avatarColor(user.role);
  const isAdmin = user.role === 'Admin';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full bg-white z-50 shadow-2xl flex flex-col overflow-hidden" style={{ width: '42vw', minWidth: 440 }}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="text-[17px] font-bold text-[#0F172A]">Profil utilisateur</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[22px] font-extrabold flex-shrink-0" style={{ background: ac.bg, color: ac.text }}>{initials(user.nom)}</div>
            <div>
              <p className="text-[18px] font-bold text-[#0F172A]">{user.nom}</p>
              <p className="text-[13px] text-[#8A9BB5] mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.role} />
                <StatutBadge statut={user.statut} />
              </div>
            </div>
          </div>

          <div className="h-px bg-[#F2F4F7]" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-[#8A9BB5] uppercase tracking-widest">Autorisations</p>
              {isAdmin && <span className="text-[11px] text-[#ABBED1]">Toutes les autorisations (Admin)</span>}
              {!isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => ALL_PERMISSIONS.forEach((p) => onPermChange(user.id, p.key, true))} className="text-[11px] font-semibold text-[#4CAF4F] hover:underline">Tout cocher</button>
                  <span className="text-[#E2E8F0]">·</span>
                  <button onClick={() => ALL_PERMISSIONS.forEach((p) => onPermChange(user.id, p.key, false))} className="text-[11px] font-semibold text-[#8A9BB5] hover:underline">Tout décocher</button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = user.permissions.includes(perm.key);
                return (
                  <div key={perm.key} onClick={() => !isAdmin && onPermChange(user.id, perm.key, !checked)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{ background: checked ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${checked ? '#BBF7D0' : '#F2F4F7'}`, cursor: isAdmin ? 'default' : 'pointer' }}>
                    <PermToggle checked={checked} onChange={() => onPermChange(user.id, perm.key, !checked)} disabled={isAdmin} />
                    <span className="text-[13px] font-medium" style={{ color: checked ? '#166534' : '#374151' }}>{perm.label}</span>
                  </div>
                );
              })}
            </div>
            {!isAdmin && <p className="text-[11px] text-[#ABBED1] mt-3">Les modifications sont appliquées immédiatement.</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
          <button onClick={() => { onClose(); onEdit(); }} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-white transition-colors">Modifier</button>
          <button onClick={() => { onClose(); onDelete(); }} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#EF4444] border border-[#FECACA] hover:bg-[#FEF2F2] transition-colors">Supprimer</button>
        </div>
      </div>
    </>
  );
}

/* ─── Modal suppression ─── */
function DeleteUserModal({ user, onDeactivate, onDelete, onClose }: { user: User; onDeactivate: () => void; onDelete: () => void; onClose: () => void }) {
  const [step, setStep] = useState<'choice' | 'confirm'>('choice');
  if (step === 'confirm') {
    return (
      <Modal title="Suppression définitive" onClose={onClose}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
            <svg width={22} height={22} fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className="text-[14px] font-bold text-[#0F172A] mb-1">Supprimer <span className="text-[#EF4444]">{user.nom}</span> ?</p>
          <p className="text-[12px] text-[#8A9BB5] mb-5">Ce compte sera définitivement supprimé.</p>
          <div className="flex gap-3">
            <button onClick={() => setStep('choice')} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151]">Retour</button>
            <button onClick={onDelete} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#EF4444]">Supprimer</button>
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
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#92400E]">Désactiver le compte</p>
          <p className="text-[11px] text-[#8A9BB5]">L&apos;utilisateur ne peut plus se connecter mais reste en historique</p>
        </button>
        <button onClick={() => setStep('confirm')} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-left hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-all group">
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#991B1B]">Supprimer définitivement</p>
          <p className="text-[11px] text-[#8A9BB5]">Efface le compte — irréversible</p>
        </button>
        <button onClick={onClose} className="px-4 py-2 text-sm text-[#8A9BB5] hover:text-[#374151]">Annuler</button>
      </div>
    </Modal>
  );
}

/* ─── Page principale ─── */
export default function UsersPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAdd, setShowAdd]       = useState(false);
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [profilUser, setProfilUser] = useState<User | null>(null);
  const [editForm, setEditForm]     = useState(emptyForm);
  const [newCreds, setNewCreds]     = useState<{ nom: string; email: string; password: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map(dbUserToUser));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handlePermChange = (userId: string | number, perm: PermKey, value: boolean) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      const perms = value ? [...new Set([...u.permissions, perm])] : u.permissions.filter((p) => p !== perm);
      return { ...u, permissions: perms };
    }));
    setProfilUser((prev) => {
      if (!prev || prev.id !== userId) return prev;
      const perms = value ? [...new Set([...prev.permissions, perm])] : prev.permissions.filter((p) => p !== perm);
      return { ...prev, permissions: perms };
    });
  };

  const handleAdd = async (data: AddFormData) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.nom,
        email: data.email,
        password: data.motdepasse,
        role: data.role === 'Admin' ? 'ADMIN' : 'EMPLOYEE',
      }),
    });
    if (res.ok) {
      await fetchUsers();
      setShowAdd(false);
      setNewCreds({ nom: data.nom, email: data.email, password: data.motdepasse });
    }
  };

  const openEdit = (u: User) => {
    setEditForm({ nom: u.nom, email: u.email, role: u.role, motdepasse: '' });
    setEditUser(u);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    await fetch(`/api/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.nom,
        email: editForm.email,
        role: editForm.role === 'Admin' ? 'ADMIN' : 'EMPLOYEE',
        ...(editForm.motdepasse ? { password: editForm.motdepasse } : {}),
      }),
    });
    await fetchUsers();
    setEditUser(null);
  };

  const handleDeactivate = async () => {
    if (!deleteUser) return;
    await fetch(`/api/users/${deleteUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    });
    await fetchUsers();
    setDeleteUser(null);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' });
    await fetchUsers();
    setDeleteUser(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (!q || u.nom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      && (filterRole === 'all' || u.role === filterRole);
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Utilisateurs</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{loading ? 'Chargement…' : `${filteredUsers.length} compte${filteredUsers.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
          Nouvel utilisateur
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={14} height={14} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, email..."
            className="px-3 py-2 pl-8 w-[220px] rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all" />
        </div>
        <AdminSelect value={filterRole} onChange={setFilterRole}
          options={[{ value: 'all', label: 'Tous les rôles' }, { value: 'Admin', label: 'Admin' }, { value: 'Employe', label: 'Employé' }]} />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="py-20 text-center text-[13px] text-[#8A9BB5]">Aucun utilisateur trouvé</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {filteredUsers.map((u) => {
            const ac = avatarColor(u.role);
            const isInactif = u.statut === 'Inactif';
            return (
              <div key={u.id} onClick={() => setProfilUser(u)}
                className="bg-white rounded-2xl border border-[#E2E8F0] cursor-pointer transition-all hover:border-[#4CAF4F] hover:shadow-md group overflow-hidden"
                style={{ opacity: isInactif ? 0.6 : 1 }}>

                <div className="p-5">
                  {/* Avatar + statut */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[18px] font-extrabold" style={{ background: ac.bg, color: ac.text }}>
                      {initials(u.nom)}
                    </div>
                    <StatutBadge statut={u.statut} />
                  </div>

                  {/* Nom + email */}
                  <p className="text-[15px] font-bold text-[#0F172A] leading-tight group-hover:text-[#4CAF4F] transition-colors">{u.nom}</p>
                  <p className="text-[11px] text-[#8A9BB5] mt-0.5 truncate">{u.email}</p>

                  {/* Séparateur */}
                  <div className="h-px bg-[#F2F4F7] my-3" />

                  {/* Rôle + autorisations */}
                  <div className="flex items-center justify-between">
                    <RoleBadge role={u.role} />
                    <span className="text-[11px] text-[#ABBED1]">
                      <span className="font-bold text-[#374151]">{u.permissions.length}</span>/{ALL_PERMISSIONS.length} droits
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(u)}
                      className="flex-1 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">
                      Modifier
                    </button>
                    <button onClick={() => setDeleteUser(u)}
                      className="flex-1 py-1.5 rounded-lg border border-[#FECACA] text-[11px] font-semibold text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profilUser && (
        <UserSlideIn user={profilUser} onClose={() => setProfilUser(null)}
          onEdit={() => openEdit(profilUser)} onDelete={() => setDeleteUser(profilUser)}
          onPermChange={handlePermChange} />
      )}

      {showAdd && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowAdd(false)}>
          <CreateUserForm onSubmit={handleAdd} onClose={() => setShowAdd(false)} />
        </Modal>
      )}

      {editUser && (
        <Modal title="Modifier l'utilisateur" onClose={() => setEditUser(null)}>
          <EditUserForm form={editForm} setForm={setEditForm} onSubmit={handleEdit} onClose={() => setEditUser(null)} />
        </Modal>
      )}

      {deleteUser && (
        <DeleteUserModal user={deleteUser} onDeactivate={handleDeactivate} onDelete={handleDelete} onClose={() => setDeleteUser(null)} />
      )}

      {newCreds && (
        <CredsModal nom={newCreds.nom} email={newCreds.email} password={newCreds.password} onClose={() => setNewCreds(null)} />
      )}
    </div>
  );
}
