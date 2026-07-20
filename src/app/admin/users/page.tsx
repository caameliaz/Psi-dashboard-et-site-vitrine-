'use client';

import { useState, useEffect, useCallback } from 'react';
import { initials } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { AdminSelect } from '@/components/ui/AdminSelect';

const ALL_PERMISSIONS = [
  { key: 'voir_commandes',     label: 'Voir les commandes & devis',    short: 'Voir commandes'      },
  { key: 'modifier_statuts',   label: 'Modifier les statuts',          short: 'Modifier statuts'    },
  { key: 'assign_commandes',   label: 'Assigner les commandes & devis', short: 'Assigner'           },
  { key: 'reassigner_client',  label: 'Ré-assigner une demande à un autre client', short: 'Ré-assigner client' },
  { key: 'voir_clients',       label: 'Voir les fiches clients',        short: 'Voir clients'        },
  { key: 'modifier_clients',   label: 'Modifier / ajouter des clients', short: 'Modifier clients'   },
  { key: 'voir_produits',      label: 'Voir les produits',              short: 'Voir produits'       },
  { key: 'modifier_produits',  label: 'Modifier les produits',          short: 'Modifier produits'  },
  { key: 'voir_historique',    label: "Voir l'historique",              short: 'Voir historique'     },
  { key: 'modifier_contenu',   label: 'Modifier le contenu du site',   short: 'Modifier contenu'    },
  { key: 'gerer_utilisateurs', label: 'Gérer les utilisateurs',         short: 'Gérer utilisateurs' },
] as const;

type PermKey = typeof ALL_PERMISSIONS[number]['key'];

const ADMIN_PERMS: PermKey[]   = ALL_PERMISSIONS.map((p) => p.key);
const EMPLOYE_PERMS: PermKey[] = ['voir_commandes', 'modifier_statuts', 'voir_clients', 'voir_produits', 'voir_historique'];

interface CustomRole { id: string; nom: string; permissions: PermKey[]; }

interface User {
  id: number;
  nom: string;
  email: string;
  role: 'Admin' | 'Employe';
  statut: 'Actif' | 'Inactif';
  permissions: PermKey[];
  resetRequested?: boolean;
}

function dbUserToUser(u: any): User {
  return {
    id: u.id,
    nom: u.name ?? '—',
    email: u.email ?? '—',
    role: u.role === 'ADMIN' ? 'Admin' : 'Employe',
    statut: u.active ? 'Actif' : 'Inactif',
    resetRequested: !!u.resetRequested,
    permissions: u.role === 'ADMIN'
      ? [...ADMIN_PERMS]
      : (u.permissions?.length ? u.permissions : [...EMPLOYE_PERMS]),
  };
}


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

/* ─── Overlay création de rôle personnalisé ─── */
function RoleCreatorOverlay({ onClose, onCreate }: { onClose: () => void; onCreate: (role: CustomRole) => void }) {
  const [nom, setNom] = useState('');
  const [perms, setPerms] = useState<PermKey[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);

  const toggle = (key: PermKey) =>
    setPerms((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);

  const handleCreate = () => {
    if (!nom.trim()) return;
    onCreate({ id: Date.now().toString(), nom: nom.trim(), permissions: perms });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[480px] max-h-[90vh] flex flex-col overflow-hidden mx-4"
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex-shrink-0">
          <h3 className="text-[15px] font-bold text-[#0F172A]">Nouveau rôle</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors text-lg">&#x2715;</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Titre du rôle</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex : Gestionnaire commercial…"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-semibold text-[#374151]">Autorisations</label>
              <div className="flex gap-2">
                <button onClick={() => setPerms([...ADMIN_PERMS])} className="text-[11px] font-semibold text-[#4CAF4F] hover:underline">Tout</button>
                <span className="text-[#E2E8F0]">·</span>
                <button onClick={() => setPerms([])} className="text-[11px] font-semibold text-[#8A9BB5] hover:underline">Aucun</button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = perms.includes(perm.key);
                return (
                  <div key={perm.key} onClick={() => toggle(perm.key)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
                    style={{ background: checked ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${checked ? '#BBF7D0' : '#F2F4F7'}` }}>
                    <div className="w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all"
                      style={{ background: checked ? '#4CAF4F' : 'white', borderColor: checked ? '#4CAF4F' : '#D1D5DB' }}>
                      {checked && <svg width={8} height={8} viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: checked ? '#166534' : '#374151' }}>{perm.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
            <button onClick={handleCreate} disabled={!nom.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: '#4CAF4F' }}>
              Créer le rôle
            </button>
          </div>
        </div>
      </div>
    </div>
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

/* ─── Formulaire de création (une seule étape) ─── */
interface AddFormData { nom: string; email: string; role: string; motdepasse: string; permissions: PermKey[]; }

function CreateUserForm({ onSubmit, onClose, customRoles, onAddCustomRole, onDeleteRole }: {
  onSubmit: (data: AddFormData) => void;
  onClose: () => void;
  customRoles: CustomRole[];
  onAddCustomRole: (role: CustomRole) => void;
  onDeleteRole: (id: string) => void;
}) {
  const [data, setData] = useState<AddFormData>({ nom: '', email: '', role: 'Employe', motdepasse: genPassword(), permissions: [...EMPLOYE_PERMS] });
  const [showRoleCreator, setShowRoleCreator] = useState(false);

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";

  const selectRole = (roleId: string) => {
    if (roleId === 'Admin') {
      setData({ ...data, role: 'Admin', permissions: [...ADMIN_PERMS] });
    } else if (roleId === 'Employe') {
      setData({ ...data, role: 'Employe', permissions: [...EMPLOYE_PERMS] });
    } else {
      const cr = customRoles.find((r) => r.id === roleId);
      setData({ ...data, role: roleId, permissions: cr ? [...cr.permissions] : [] });
    }
  };

  const togglePerm = (perm: PermKey) => {
    if (data.role === 'Admin') return;
    setData((d) => ({
      ...d,
      permissions: d.permissions.includes(perm)
        ? d.permissions.filter((p) => p !== perm)
        : [...d.permissions, perm],
    }));
  };

  const handleCreateRole = (role: CustomRole) => {
    onAddCustomRole(role);
    setData({ ...data, role: role.id, permissions: [...role.permissions] });
    setShowRoleCreator(false);
  };

  const isAdmin   = data.role === 'Admin';
  const showPerms = !isAdmin;

  const allRoles = [
    { id: 'Admin',   label: 'Admin',   custom: false, color: { active: { background: '#F3E8FF', borderColor: '#7C3AED', color: '#6B21A8' } } },
    { id: 'Employe', label: 'Employé', custom: false, color: { active: { background: '#F0FDF4', borderColor: '#4CAF4F', color: '#166534' } } },
    ...customRoles.map((cr) => ({ id: cr.id, label: cr.nom, custom: true, color: { active: { background: '#EFF6FF', borderColor: '#3B82F6', color: '#1D4ED8' } } })),
  ];

  return (
    <>
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

        {/* Rôle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-semibold text-[#374151]">Rôle</label>
            <button onClick={() => setShowRoleCreator(true)} className="text-[11px] font-semibold text-[#4CAF4F] hover:underline">
              + Ajouter un rôle
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allRoles.map((r) => {
              const isActive = data.role === r.id;
              return (
                <div key={r.id} className="relative inline-flex">
                  <button onClick={() => selectRole(r.id)}
                    className={`py-2 rounded-xl text-[13px] font-semibold border-2 transition-all ${r.custom ? 'pl-3 pr-7' : 'px-3'}`}
                    style={isActive ? r.color.active : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#8A9BB5' }}>
                    {r.label}
                  </button>
                  {r.custom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteRole(r.id); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 text-[11px] font-bold leading-none opacity-60 hover:opacity-100 transition-opacity"
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Autorisations inline (grille 3 colonnes) — toujours rendu, animé par max-height */}
          <div style={{
            maxHeight: showPerms ? '400px' : '0',
            opacity: showPerms ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.28s ease, opacity 0.2s ease',
            marginTop: showPerms ? '12px' : '0',
          }}>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-widest">Autorisations</span>
                <div className="flex gap-2">
                  <button onClick={() => setData((d) => ({ ...d, permissions: [...ADMIN_PERMS] }))} className="text-[10px] font-semibold text-[#4CAF4F] hover:underline">Tout</button>
                  <span className="text-[#E2E8F0]">·</span>
                  <button onClick={() => setData((d) => ({ ...d, permissions: [] }))} className="text-[10px] font-semibold text-[#8A9BB5] hover:underline">Aucun</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_PERMISSIONS.map((perm) => {
                  const checked = data.permissions.includes(perm.key);
                  return (
                    <button key={perm.key} onClick={() => togglePerm(perm.key)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-left transition-all"
                      style={{ background: checked ? '#F0FDF4' : 'white', border: `1.5px solid ${checked ? '#4CAF4F' : '#E2E8F0'}`, color: checked ? '#166534' : '#6B7280' }}>
                      <div className="w-3 h-3 rounded flex-shrink-0 border flex items-center justify-center"
                        style={{ background: checked ? '#4CAF4F' : 'white', borderColor: checked ? '#4CAF4F' : '#D1D5DB' }}>
                        {checked && <svg width={7} height={7} viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7.5L8 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      {perm.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button
            onClick={() => { if (data.nom.trim() && data.email.trim()) onSubmit(data); }}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white"
            style={{ background: '#4CAF4F' }}>
            Créer le compte
          </button>
        </div>
      </div>

      {showRoleCreator && (
        <RoleCreatorOverlay onClose={() => setShowRoleCreator(false)} onCreate={handleCreateRole} />
      )}
    </>
  );
}

/* ─── Formulaire de modification ─── */
/* ─── Fiche utilisateur (slide-in) ─── */
function UserSlideIn({ user, onClose, onDelete, onPermChange, customRoles, onSaveProfile, onResetPassword, initialEditing = false }: {
  user: User; onClose: () => void; onDelete: () => void;
  onPermChange: (userId: number, perm: PermKey, value: boolean) => void;
  customRoles: CustomRole[];
  onSaveProfile: (user: User, data: { name: string; email: string; role: string; password?: string; permissions: PermKey[] }) => Promise<void>;
  onResetPassword: (user: User) => Promise<void>;
  initialEditing?: boolean;
}) {
  const ac = avatarColor(user.role);
  const isAdmin = user.role === 'Admin';

  // Édition inline (même page) : bouton "Modifier" → champs éditables
  const [editing, setEditing] = useState(initialEditing);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fNom, setFNom] = useState(user.nom);
  const [fEmail, setFEmail] = useState(user.email);
  const [fRole, setFRole] = useState<string>(user.role); // 'Admin' | 'Employe' | id rôle perso
  const [fPwd, setFPwd] = useState('');

  const inputCls = "w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[14px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";

  const startEdit = () => { setFNom(user.nom); setFEmail(user.email); setFRole(user.role); setFPwd(''); setEditing(true); };

  const roleOptions = [
    { id: 'Admin', label: 'Admin' },
    { id: 'Employe', label: 'Employé' },
    ...customRoles.map((cr) => ({ id: cr.id, label: cr.nom })),
  ];

  const save = async () => {
    setSaving(true);
    try {
      // Détermine les permissions selon le rôle choisi
      let role = fRole;
      let permissions: PermKey[];
      if (fRole === 'Admin') { permissions = [...ADMIN_PERMS]; }
      else if (fRole === 'Employe') { permissions = user.role === 'Employe' ? [...user.permissions] : [...EMPLOYE_PERMS]; }
      else {
        const cr = customRoles.find((r) => r.id === fRole);
        permissions = cr ? [...cr.permissions] : [...user.permissions];
        role = 'Employe'; // un rôle perso = un employé avec un set de permissions
      }
      await onSaveProfile(user, { name: fNom, email: fEmail, role, password: fPwd || undefined, permissions });
      setEditing(false);
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full bg-white z-50 shadow-2xl flex flex-col overflow-hidden" style={{ width: '42vw', minWidth: 440 }}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 className="text-[17px] font-bold text-[#0F172A]">{editing ? 'Modifier l’utilisateur' : 'Profil utilisateur'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[22px] font-extrabold flex-shrink-0" style={{ background: ac.bg, color: ac.text }}>{initials(editing ? fNom : user.nom)}</div>
            {editing ? (
              <div className="flex-1 flex flex-col gap-2">
                <input value={fNom} onChange={(e) => setFNom(e.target.value)} placeholder="Prénom Nom" className={inputCls} />
                <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="email@psi.dz" className={inputCls} />
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#8A9BB5] w-12">Rôle</span>
                  <div className="relative flex-1">
                    <select value={fRole} onChange={(e) => setFRole(e.target.value)}
                      className={inputCls + ' appearance-none pr-8 cursor-pointer'}>
                      {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A9BB5]" width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
                <input value={fPwd} onChange={(e) => setFPwd(e.target.value)} placeholder="Nouveau mot de passe (laisser vide pour garder)" className={inputCls + ' font-mono text-[12px]'} />
              </div>
            ) : (
              <div>
                <p className="text-[18px] font-bold text-[#0F172A]">{user.nom}</p>
                <p className="text-[13px] text-[#8A9BB5] mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleBadge role={user.role} />
                  <StatutBadge statut={user.statut} />
                </div>
              </div>
            )}
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

          {/* Sécurité : réinitialiser le mot de passe */}
          <div className="h-px bg-[#F2F4F7]" />
          <div>
            <p className="text-[12px] font-bold text-[#8A9BB5] uppercase tracking-widest mb-3">Sécurité</p>
            {user.resetRequested && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]">
                <svg width={16} height={16} fill="none" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EA580C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-[12px] font-semibold text-[#9A3412]">Cet utilisateur a demandé une réinitialisation de mot de passe.</span>
              </div>
            )}
            <button
              onClick={async () => { setResetting(true); try { await onResetPassword(user); } finally { setResetting(false); } }}
              disabled={resetting}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors disabled:opacity-60">
              {resetting ? 'Génération…' : '🔑 Réinitialiser le mot de passe'}
            </button>
            <p className="text-[11px] text-[#ABBED1] mt-2">Un nouveau mot de passe sera généré et affiché (à transmettre à l&apos;utilisateur).</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-white transition-colors">Annuler</button>
              <button onClick={save} disabled={saving || !fNom.trim() || !fEmail.trim()} className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] disabled:opacity-60 transition-colors">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-white transition-colors">Modifier</button>
              <button onClick={() => { onClose(); onDelete(); }} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#EF4444] border border-[#FECACA] hover:bg-[#FEF2F2] transition-colors">Supprimer</button>
            </>
          )}
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
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [profilUser, setProfilUser] = useState<User | null>(null);
  const [profilEditing, setProfilEditing] = useState(false);
  const [newCreds, setNewCreds]     = useState<{ nom: string; email: string; password: string } | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);

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

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setCustomRoles(data.map((r: any) => ({ id: r.id, nom: r.name, permissions: r.permissions })));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  const handlePermChange = (userId: string | number, perm: PermKey, value: boolean) => {
    let newPerms: PermKey[] = [];
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      newPerms = value ? [...new Set([...u.permissions, perm])] : u.permissions.filter((p) => p !== perm);
      return { ...u, permissions: newPerms };
    }));
    setProfilUser((prev) => {
      if (!prev || prev.id !== userId) return prev;
      newPerms = value ? [...new Set([...prev.permissions, perm])] : prev.permissions.filter((p) => p !== perm);
      return { ...prev, permissions: newPerms };
    });
    fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: newPerms }),
    });
  };

  const handleAdd = async (data: AddFormData) => {
    const dbRole = data.role === 'Admin' ? 'ADMIN' : 'EMPLOYEE';
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.nom,
        email: data.email,
        password: data.motdepasse,
        role: dbRole,
        permissions: dbRole === 'ADMIN' ? [] : data.permissions,
      }),
    });
    if (res.ok) {
      await fetchUsers();
      setShowAdd(false);
      setNewCreds({ nom: data.nom, email: data.email, password: data.motdepasse });
    }
  };

  // Réinitialise le mot de passe d'un user → génère un nouveau mdp, l'applique, l'affiche (copiable)
  const handleResetPassword = async (u: User) => {
    const newPwd = genPassword();
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPwd }),
    });
    if (res.ok) {
      await fetchUsers();
      setProfilUser((prev) => prev && prev.id === u.id ? { ...prev, resetRequested: false } : prev);
      setNewCreds({ nom: u.nom, email: u.email, password: newPwd });
    } else {
      alert('Échec de la réinitialisation.');
    }
  };

  const handleAddCustomRole = async (role: CustomRole) => {
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: role.nom, permissions: role.permissions }),
    });
    if (res.ok) {
      const saved = await res.json();
      setCustomRoles((prev) => [...prev, { id: saved.id, nom: saved.name, permissions: saved.permissions }]);
    }
  };

  const handleDeleteCustomRole = async (id: string) => {
    await fetch(`/api/roles/${id}`, { method: 'DELETE' });
    setCustomRoles((prev) => prev.filter((r) => r.id !== id));
  };

  // Édition inline depuis le panneau profil (reste sur la même page)
  const handleSaveProfile = async (u: User, data: { name: string; email: string; role: string; password?: string; permissions: PermKey[] }) => {
    const roleDb = data.role === 'Admin' ? 'ADMIN' : 'EMPLOYEE';
    await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name, email: data.email, role: roleDb,
        ...(data.password ? { password: data.password } : {}),
        ...(roleDb === 'EMPLOYEE' ? { permissions: data.permissions } : {}),
      }),
    });
    await fetchUsers();
    // Met à jour le panneau ouvert avec les nouvelles valeurs
    const uiRole = roleDb === 'ADMIN' ? 'Admin' : 'Employe';
    setProfilUser((prev) => prev && prev.id === u.id
      ? { ...prev, nom: data.name, email: data.email, role: uiRole, permissions: roleDb === 'ADMIN' ? [...ADMIN_PERMS] : data.permissions }
      : prev);
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
    const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Impossible de supprimer cet utilisateur.");
      return;
    }
    await fetchUsers();
    setDeleteUser(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.nom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    let matchRole = filterRole === 'all' || u.role === filterRole;
    if (!matchRole) {
      const cr = customRoles.find((r) => r.id === filterRole);
      if (cr) matchRole = u.role === 'Employe' && cr.permissions.length === u.permissions.length && cr.permissions.every((p) => u.permissions.includes(p));
    }
    return matchSearch && matchRole;
  });

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#0F172A]">Utilisateurs</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-0.5">{loading ? 'Chargement…' : `${filteredUsers.length} compte${filteredUsers.length !== 1 ? 's' : ''}`}</p>
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
          options={[
            { value: 'all', label: 'Tous les rôles' },
            { value: 'Admin', label: 'Admin' },
            { value: 'Employe', label: 'Employé' },
            ...customRoles.map((cr) => ({ value: cr.id, label: cr.nom })),
          ]} />
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl text-[13px] font-bold text-white ml-auto" style={{ background: '#4CAF4F' }}>
          + Nouvel utilisateur
        </button>
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
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[18px] font-extrabold" style={{ background: ac.bg, color: ac.text }}>
                      {initials(u.nom)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {u.resetRequested && (
                        <span title="Mot de passe oublié — réinitialisation demandée" className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]">🔑 Reset</span>
                      )}
                      <StatutBadge statut={u.statut} />
                    </div>
                  </div>

                  <p className="text-[15px] font-bold text-[#0F172A] leading-tight group-hover:text-[#4CAF4F] transition-colors">{u.nom}</p>
                  <p className="text-[11px] text-[#8A9BB5] mt-0.5 truncate">{u.email}</p>

                  <div className="h-px bg-[#F2F4F7] my-3" />

                  <div className="flex items-center justify-between">
                    <RoleBadge role={u.role} />
                    <span className="text-[11px] text-[#ABBED1]">
                      <span className="font-bold text-[#374151]">{u.permissions.length}</span>/{ALL_PERMISSIONS.length} droits
                    </span>
                  </div>

                  <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setProfilEditing(true); setProfilUser(u); }}
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
        <UserSlideIn user={profilUser} onClose={() => { setProfilUser(null); setProfilEditing(false); }}
          onDelete={() => setDeleteUser(profilUser)}
          onPermChange={handlePermChange}
          customRoles={customRoles}
          initialEditing={profilEditing}
          onSaveProfile={handleSaveProfile}
          onResetPassword={handleResetPassword} />
      )}

      {showAdd && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowAdd(false)}>
          <CreateUserForm
            onSubmit={handleAdd}
            onClose={() => setShowAdd(false)}
            customRoles={customRoles}
            onAddCustomRole={handleAddCustomRole}
            onDeleteRole={handleDeleteCustomRole}
          />
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
