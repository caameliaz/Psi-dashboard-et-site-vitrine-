'use client';

import { useState, useEffect } from 'react';
import { pushSupported, isPushEnabled, enablePush, disablePush } from '@/lib/push-client';

// Section "Notifications système" — activer/désactiver les push sur cet appareil
function PushSection() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setSupported(pushSupported());
    isPushEnabled().then(setEnabled);
  }, []);

  const toggle = async () => {
    setBusy(true); setMsg('');
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        setMsg('Notifications désactivées sur cet appareil.');
      } else {
        const r = await enablePush();
        if (r === 'ok') { setEnabled(true); setMsg('Notifications activées ! Vous les recevrez même app fermée.'); }
        else if (r === 'denied') setMsg('Permission refusée. Autorisez les notifications dans les réglages du navigateur.');
        else if (r === 'unsupported') setMsg('Non disponible sur cet appareil/navigateur (ou en local sans HTTPS).');
        else setMsg('Échec de l\'activation. Réessayez.');
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm col-span-2">
      <div className="px-6 py-4 border-b border-[#F2F4F7] bg-[#F8FAFC]">
        <h2 className="text-[15px] font-bold text-[#0F172A]">Notifications système</h2>
      </div>
      <div className="px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[13px] text-[#374151]">Recevez une notification sur cet appareil (même l&apos;app fermée) pour chaque nouvelle commande, devis ou assignation.</p>
            <p className="text-[11px] text-[#ABBED1] mt-1">Sur iPhone : ajoutez d&apos;abord le site à l&apos;écran d&apos;accueil. Ne marche qu&apos;en HTTPS (site en ligne).</p>
          </div>
          {enabled ? (
            // Déjà activées : pastille "actives" + petit lien discret pour désactiver
            // (plus de gros bouton rouge, qui alourdissait la page).
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF4F]" /> Activées
              </span>
              <button onClick={toggle} disabled={busy}
                className="text-[12px] font-semibold text-[#8A9BB5] hover:text-[#EF4444] transition-colors disabled:opacity-60">
                {busy ? '…' : 'Désactiver'}
              </button>
            </div>
          ) : (
            <button onClick={toggle} disabled={busy || !supported}
              className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] transition-colors flex-shrink-0 disabled:opacity-60">
              {busy ? '…' : 'Activer les notifications'}
            </button>
          )}
        </div>
        {!supported && <p className="text-[12px] text-[#F59E0B] font-medium mt-3">Cet appareil/navigateur ne supporte pas les notifications push.</p>}
        {msg && <p className="text-[12px] text-[#374151] font-medium mt-3">{msg}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-[#F2F4F7] bg-[#F8FAFC]">
        <h2 className="text-[15px] font-bold text-[#0F172A]">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState('');
  const [depuis, setDepuis] = useState('');
  const [savedInfo, setSavedInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  // Préférences emails récap (admins uniquement)
  const [recapDaily, setRecapDaily] = useState(true);
  const [recapWeekly, setRecapWeekly] = useState(true);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [savedPwd, setSavedPwd] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Charge le vrai utilisateur connecté
  useEffect(() => {
    fetch('/api/profile').then((r) => r.ok ? r.json() : null).then((u) => {
      if (!u) return;
      setNom(u.name ?? ''); setEmail(u.email ?? ''); setTelephone(u.phone ?? '');
      setRole(u.role === 'ADMIN' ? 'Admin' : 'Employé');
      setDepuis(u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '');
      setRecapDaily(u.recapDaily ?? true);
      setRecapWeekly(u.recapWeekly ?? true);
    }).catch(() => {});
  }, []);

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] text-[#263238] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all";
  const labelClass = "block text-[12px] font-semibold text-[#374151] mb-1.5";

  const handleSaveInfo = async () => {
    setInfoError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nom, phone: telephone }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); setInfoError(e.error ?? 'Échec.'); return; }
    setSavedInfo(true);
    setTimeout(() => setSavedInfo(false), 2500);
  };

  // Enregistre immédiatement le choix (pas besoin de cliquer "Enregistrer")
  const saveRecapPref = async (patch: { recapDaily?: boolean; recapWeekly?: boolean }) => {
    if (patch.recapDaily !== undefined) setRecapDaily(patch.recapDaily);
    if (patch.recapWeekly !== undefined) setRecapWeekly(patch.recapWeekly);
    await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {});
  };

  const handleSavePwd = async () => {
    setPwdError('');
    if (!currentPwd) return setPwdError('Entrez votre mot de passe actuel.');
    if (newPwd.length < 6) return setPwdError('Le nouveau mot de passe doit faire au moins 6 caractères.');
    if (newPwd !== confirmPwd) return setPwdError('Les mots de passe ne correspondent pas.');
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); return setPwdError(e.error ?? 'Échec.'); }
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setSavedPwd(true);
    setTimeout(() => setSavedPwd(false), 2500);
  };

  function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9BB5] hover:text-[#374151] transition-colors">
        {show ? (
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        ) : (
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
        )}
      </button>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#0F172A]">Mon profil</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-0.5">Gérez vos informations personnelles et votre mot de passe</p>
      </div>

      {/* Avatar + infos rapides */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 mb-5 flex items-center gap-6 col-span-2">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[28px] font-extrabold flex-shrink-0" style={{ background: '#D1FAE5', color: '#166534' }}>
          {(nom || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <p className="text-[20px] font-bold text-[#0F172A]">{nom || '…'}</p>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F3E8FF] text-[#6B21A8]">{role}</span>
            {depuis && <span className="text-[11px] text-[#ABBED1]">Membre depuis {depuis}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">

        {/* Infos personnelles */}
        <Section title="Informations personnelles">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nom complet</label>
                <input value={nom} onChange={(e) => setNom(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={email} disabled className={inputClass + ' bg-[#F8FAFC] text-[#8A9BB5]'} />
            </div>
            <div>
              <label className={labelClass}>Rôle</label>
              <div className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] text-[#8A9BB5] select-none">
                {role} — non modifiable
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              {infoError && <span className="text-[13px] font-semibold text-[#EF4444]">{infoError}</span>}
              {savedInfo && <span className="text-[13px] font-semibold text-[#4CAF4F]">Modifications enregistrées</span>}
              <button onClick={handleSaveInfo} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>
                Enregistrer
              </button>
            </div>
          </div>
        </Section>

        {/* Mot de passe */}
        <Section title="Changer le mot de passe">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Mot de passe actuel</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="••••••••" className={inputClass + ' pr-10'} />
                <EyeBtn show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nouveau mot de passe</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Min. 6 caractères" className={inputClass + ' pr-10'} />
                <EyeBtn show={showNew} onToggle={() => setShowNew(v => !v)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Confirmer le nouveau mot de passe</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" className={inputClass + ' pr-10'} />
                <EyeBtn show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
              </div>
            </div>
            {pwdError && <p className="text-[13px] text-[#EF4444] font-medium">{pwdError}</p>}
            <div className="flex items-center justify-end gap-3 pt-1">
              {savedPwd && <span className="text-[13px] font-semibold text-[#4CAF4F]">Mot de passe modifié</span>}
              <button onClick={handleSavePwd} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>
                Mettre à jour
              </button>
            </div>
          </div>
        </Section>

        <PushSection />

        {/* Emails récapitulatifs — admins uniquement (eux seuls les reçoivent) */}
        {/* Récaps : réglage réservé aux ADMINS. Pour un employé, c'est l'admin
            qui décide via la permission « Recevoir les récaps par email ». */}
        {role === 'Admin' && (
          <Section title="Emails récapitulatifs">
            <div className="flex flex-col gap-3">
              <RecapToggle
                checked={recapDaily}
                onChange={() => saveRecapPref({ recapDaily: !recapDaily })}
                titre="Récap quotidien"
                detail="Chaque jour à 20h — les commandes et devis de la journée"
              />
              <RecapToggle
                checked={recapWeekly}
                onChange={() => saveRecapPref({ recapWeekly: !recapWeekly })}
                titre="Bilan hebdomadaire"
                detail="Chaque jeudi à 23h59 — le bilan de la semaine"
              />
              <p className="text-[12px] text-[#8A9BB5] mt-1">
                Les modifications sont enregistrées immédiatement.
              </p>
            </div>
          </Section>
        )}

      </div>
    </div>
  );
}

// Ligne "récap" avec interrupteur (même style que les toggles de l'app)
function RecapToggle({ checked, onChange, titre, detail }: {
  checked: boolean; onChange: () => void; titre: string; detail: string;
}) {
  return (
    <button
      onClick={onChange}
      className="flex items-center justify-between gap-4 w-full text-left px-4 py-3 rounded-xl border transition-colors"
      style={{ background: checked ? '#F0FDF4' : '#F8FAFC', borderColor: checked ? '#BBF7D0' : '#E2E8F0' }}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-bold" style={{ color: checked ? '#166534' : '#374151' }}>{titre}</span>
        <span className="block text-[12px] text-[#8A9BB5] mt-0.5">{detail}</span>
      </span>
      <span
        className="relative flex-shrink-0 rounded-full transition-colors duration-200"
        style={{ width: 40, height: 24, background: checked ? '#4CAF4F' : '#D0D5DD' }}
      >
        <span
          className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0px)' }}
        />
      </span>
    </button>
  );
}
