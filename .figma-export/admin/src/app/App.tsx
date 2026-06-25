import { useState } from "react";
import { Search, Plus, Pencil, Trash2, X, ChevronDown, ArrowUpRight, Check } from "lucide-react";

// ─── PSI Icons (paths from Figma icon set) ────────────────────────────────────

function PsiIcon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return <svg width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">{children}</svg>;
}

function IconHome({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <path d="M0.75 9.44C0.75 8.21 1.31 7.06 2.27 6.3L7.77 1.96C9.22 0.81 11.28 0.81 12.73 1.96L18.23 6.3C19.19 7.06 19.75 8.21 19.75 9.44V16C19.75 18.21 17.96 20 15.75 20H14.25C13.7 20 13.25 19.55 13.25 19V16C13.25 14.9 12.35 14 11.25 14H9.25C8.15 14 7.25 14.9 7.25 16V19C7.25 19.55 6.8 20 6.25 20H4.75C2.54 20 0.75 18.21 0.75 16V9.44Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </PsiIcon>
  );
}

function IconDocument({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <rect x="2.75" y="0.75" width="14" height="18" rx="3.5" stroke={color} strokeWidth="1.5"/>
      <path d="M6 5.5H13.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
      <path d="M6 9.5H13.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
      <path d="M6 13.5H10" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
    </PsiIcon>
  );
}

function IconLayers({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <path d="M1.5 6.5L9 2L16.5 6.5L9 11L1.5 6.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M1.5 11L9 15.5L16.5 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 8.75L9 13.25L16.5 8.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </PsiIcon>
  );
}

function IconUsers({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <circle cx="7" cy="5.5" r="3.25" stroke={color} strokeWidth="1.5"/>
      <path d="M0.75 15.5C0.75 12.6 3.52 10.25 7 10.25C10.48 10.25 13.25 12.6 13.25 15.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
      <circle cx="14.5" cy="5" r="2.75" stroke={color} strokeWidth="1.5"/>
      <path d="M16.75 13.5C17.7 14.1 18.25 14.97 18.25 16" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
    </PsiIcon>
  );
}

function IconEdit({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <path d="M14.5 1.5L16.5 3.5L10 10L7.5 10.5L8 8L14.5 1.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M0.75 17.25H17.25" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
      <path d="M12.75 2.75L15.25 5.25" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
    </PsiIcon>
  );
}

function IconKey({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <circle cx="6.5" cy="6.5" r="4.75" stroke={color} strokeWidth="1.5"/>
      <path d="M10.5 10.5L16.5 16.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
      <path d="M14 15L16.5 12.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
    </PsiIcon>
  );
}

function IconBell({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <path d="M9 1.5C5.96 1.5 3.5 3.96 3.5 7V11.5L1.5 13.5V14.5H16.5V13.5L14.5 11.5V7C14.5 3.96 12.04 1.5 9 1.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6.5 14.5C6.5 15.88 7.62 17 9 17C10.38 17 11.5 15.88 11.5 14.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
    </PsiIcon>
  );
}

function IconLogout({ color = "#717171" }: { color?: string }) {
  return (
    <PsiIcon>
      <path d="M11.5 13V15C11.5 16.66 10.16 18 8.5 18H4.5C2.84 18 1.5 16.66 1.5 15V5C1.5 3.34 2.84 2 4.5 2H8.5C10.16 2 11.5 3.34 11.5 5V7" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
      <path d="M14.5 12.5L16.79 10.21C17.18 9.82 17.18 9.18 16.79 8.79L14.5 6.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
      <path d="M16.5 10H6.5" stroke={color} strokeLinecap="round" strokeWidth="1.5"/>
    </PsiIcon>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = "login" | "dashboard" | "demandes" | "produits" | "clients" | "contenu" | "utilisateurs" | "reglages";

interface Demande {
  id: number;
  nom: string;
  entreprise: string;
  telephone: string;
  date: string;
  type: "Commande" | "Devis";
  statut: "En attente" | "Contacté" | "Validé" | "Annulé";
  produits?: string;
  notes?: string;
  contacteDate?: string;
  contacte?: boolean;
  valide?: boolean;
}

interface Produit {
  id: number;
  reference: string;
  largeur: number;
  longueur: number;
  usage: string;
  categorie: string;
  actif: boolean;
}

interface Client {
  id: number;
  entreprise: string;
  contact: string;
  telephone: string;
  wilaya: string;
  nbCommandes: number;
  derniereCommande: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const mockDemandes: Demande[] = [
  { id: 1, nom: "Ahmed Benali", entreprise: "Benali SARL", telephone: "0551 23 45 67", date: "20 juin 2024", type: "Commande", statut: "En attente", produits: "Rouleaux 80×80 mm · 50 boîtes", notes: "", contacteDate: "", contacte: false, valide: false },
  { id: 2, nom: "Sara Mansouri", entreprise: "TechStore Oran", telephone: "0661 23 45 67", date: "19 juin 2024", type: "Devis", statut: "Contacté", produits: "Papier caisse 57 mm · 100 boîtes", notes: "Intéressée par tarif dégressif à partir de 200 boîtes.", contacteDate: "2024-06-20", contacte: true, valide: false },
  { id: 3, nom: "Karim Hadji", entreprise: "Superette Hadji", telephone: "0771 23 45 67", date: "18 juin 2024", type: "Commande", statut: "Validé", produits: "Rouleaux 57×50 mm · 200 boîtes", notes: "Livraison confirmée pour le 25 juin.", contacteDate: "2024-06-18", contacte: true, valide: true },
  { id: 4, nom: "Nadia Berber", entreprise: "Pharmacie Santé+", telephone: "0551 11 22 33", date: "17 juin 2024", type: "Devis", statut: "Annulé", produits: "Étiquettes thermiques · 10 boîtes", notes: "Budget insuffisant cette période.", contacteDate: "", contacte: false, valide: false },
  { id: 5, nom: "Mohamed Ziani", entreprise: "Ziani Commerce", telephone: "0661 11 22 33", date: "16 juin 2024", type: "Commande", statut: "En attente", produits: "Rouleaux 80×70 mm · 30 boîtes", notes: "", contacteDate: "", contacte: false, valide: false },
  { id: 6, nom: "Fatima Bouzid", entreprise: "Mode & Style", telephone: "0771 11 22 33", date: "15 juin 2024", type: "Devis", statut: "Contacté", produits: "Tickets de caisse 57 mm · 50 boîtes", notes: "Rappeler mardi matin.", contacteDate: "2024-06-16", contacte: true, valide: false },
];

const mockProduits: Produit[] = [
  { id: 1, reference: "RL-57-50", largeur: 57, longueur: 50, usage: "Caisse enregistreuse", categorie: "Rouleaux Caisse", actif: true },
  { id: 2, reference: "RL-80-80", largeur: 80, longueur: 80, usage: "Terminal POS", categorie: "Rouleaux Caisse", actif: true },
  { id: 3, reference: "RL-57-80", largeur: 57, longueur: 80, usage: "Tickets restaurant", categorie: "Rouleaux Caisse", actif: true },
  { id: 4, reference: "ET-40-25", largeur: 40, longueur: 25, usage: "Étiquetage produits", categorie: "Étiquettes", actif: true },
  { id: 5, reference: "ET-50-30", largeur: 50, longueur: 30, usage: "Codes-barres", categorie: "Étiquettes", actif: false },
  { id: 6, reference: "FC-210-297", largeur: 210, longueur: 297, usage: "Fax / Automate", categorie: "Fax", actif: true },
];

const mockClients: Client[] = [
  { id: 1, entreprise: "Benali SARL", contact: "Ahmed Benali", telephone: "0551 23 45 67", wilaya: "Alger", nbCommandes: 12, derniereCommande: "20 juin 2024" },
  { id: 2, entreprise: "TechStore Oran", contact: "Sara Mansouri", telephone: "0661 23 45 67", wilaya: "Oran", nbCommandes: 5, derniereCommande: "19 juin 2024" },
  { id: 3, entreprise: "Superette Hadji", contact: "Karim Hadji", telephone: "0771 23 45 67", wilaya: "Constantine", nbCommandes: 24, derniereCommande: "18 juin 2024" },
  { id: 4, entreprise: "Pharmacie Santé+", contact: "Nadia Berber", telephone: "0551 11 22 33", wilaya: "Annaba", nbCommandes: 3, derniereCommande: "17 juin 2024" },
  { id: 5, entreprise: "Ziani Commerce", contact: "Mohamed Ziani", telephone: "0661 11 22 33", wilaya: "Tlemcen", nbCommandes: 8, derniereCommande: "16 juin 2024" },
];

const clientHistory = [
  { date: "20 juin 2024", type: "Commande" as const, statut: "En attente" as const, montant: "12 500 DA" },
  { date: "15 mai 2024", type: "Commande" as const, statut: "Validé" as const, montant: "34 200 DA" },
  { date: "2 avr. 2024", type: "Devis" as const, statut: "Validé" as const, montant: "8 900 DA" },
  { date: "18 mars 2024", type: "Commande" as const, statut: "Validé" as const, montant: "22 100 DA" },
];

let mockCategories = ["Rouleaux Caisse", "Étiquettes", "Fax", "Papier Continu"];

// ─── Status pills ─────────────────────────────────────────────────────────────

const statusConfig = {
  "En attente": { dot: "#F59E0B", text: "#92400E", bg: "#FFFBEB" },
  "Contacté":   { dot: "#3B82F6", text: "#1E40AF", bg: "#EFF6FF" },
  "Validé":     { dot: "#22C55E", text: "#166534", bg: "#F0FDF4" },
  "Annulé":     { dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2" },
};

function Pill({ statut }: { statut: Demande["statut"] }) {
  const c = statusConfig[statut];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {statut}
    </span>
  );
}

function TypeChip({ type }: { type: "Commande" | "Devis" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type === "Commande" ? "bg-[#F0FDF4] text-[#166534]" : "bg-[#F5F3FF] text-[#5B21B6]"}`}>
      {type}
    </span>
  );
}

// ─── Layout atoms ─────────────────────────────────────────────────────────────

type NavItem = { key: Page; label: string; renderIcon: (color: string) => React.ReactNode };

const navItems: NavItem[] = [
  { key: "dashboard",    label: "Dashboard",    renderIcon: (c) => <IconHome color={c} /> },
  { key: "demandes",     label: "Demandes",     renderIcon: (c) => <IconDocument color={c} /> },
  { key: "produits",     label: "Produits",     renderIcon: (c) => <IconLayers color={c} /> },
  { key: "clients",      label: "Clients",      renderIcon: (c) => <IconUsers color={c} /> },
  { key: "contenu",      label: "Contenu",      renderIcon: (c) => <IconEdit color={c} /> },
  { key: "utilisateurs", label: "Utilisateurs", renderIcon: (c) => <IconKey color={c} /> },
];

function Sidebar({ current, onNav }: { current: Page; onNav: (p: Page) => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] bg-white border-r border-[#EAECF0] flex flex-col z-20 shadow-[1px_0px_4px_0px_rgba(171,190,209,0.15)]">
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-[#E4EBF5] bg-[#F5F9FF]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#4CAF4F] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold tracking-tight">PSI</span>
          </div>
          <span className="text-[#101828] text-sm font-semibold tracking-tight">Paper Solutions</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ key, label, renderIcon }) => {
          const active = current === key;
          const iconColor = active ? "#4CAF4F" : "#8A9BB5";
          return (
            <button
              key={key}
              onClick={() => onNav(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                active
                  ? "bg-[#F0FDF4] text-[#166534] font-semibold"
                  : "text-[#8A9BB5] hover:bg-[#F5F8FC] hover:text-[#344054] font-normal"
              }`}
            >
              {renderIcon(iconColor)}
              {label}
              {active && <span className="ml-auto w-1 h-4 rounded-full bg-[#4CAF4F]" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#E4EBF5]">
        <button
          onClick={() => onNav("reglages")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg transition-colors text-left ${current === "reglages" ? "bg-[#F0FDF4]" : "hover:bg-[#F5F8FC]"}`}
        >
          <div className="w-7 h-7 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#065F46] text-[10px] font-bold flex-shrink-0">YR</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#344054] truncate">Yacine Rahali</p>
            <p className="text-[10px] text-[#98A2B3] truncate">Voir le profil</p>
          </div>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#8A9BB5] hover:bg-[#FEF2F2] hover:text-[#991B1B] transition-colors">
          <IconLogout color="#8A9BB5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

function Shell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ml-[220px] min-h-screen bg-[#F5F8FC]">
      <header className="bg-[#FAFCFF] border-b border-[#E4EBF5] px-8 h-20 flex items-center justify-between shadow-[0px_1px_3px_0px_rgba(171,190,209,0.15)]">
        <div>
          <h1 className="text-[#101828] text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-[#98A2B3] text-sm mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {action && <div>{action}</div>}
          <div className="relative">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A9BB5] hover:bg-[#EEF3FA] transition-colors">
              <IconBell color="#8A9BB5" />
            </button>
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#E53835] rounded-full border-2 border-white" />
          </div>
        </div>
      </header>
      <div className="px-8 py-7">{children}</div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", sm }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; sm?: boolean }) {
  const base = `inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors ${sm ? "text-xs px-2.5 py-1.5" : "text-sm px-3.5 py-2"}`;
  const v = {
    primary: "bg-[#4CAF4F] text-white hover:bg-[#43A046]",
    ghost: "border border-[#D0D5DD] text-[#344054] bg-white hover:bg-[#F9FAFB]",
    danger: "border border-[#FDA29B] text-[#B42318] bg-white hover:bg-[#FEF3F2]",
  }[variant];
  return <button onClick={onClick} className={`${base} ${v}`}>{children}</button>;
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E4EBF5] bg-[#F2F6FF]">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#5B7399] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TR({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-[#EAECF0] last:border-0 transition-colors ${onClick ? "cursor-pointer" : ""} ${active ? "bg-[#F0FDF4]" : "hover:bg-[#F9FAFB]"}`}
    >
      {children}
    </tr>
  );
}

function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-5 py-3.5 text-[#344054] ${mono ? "font-mono text-xs" : "text-sm"}`}>{children}</td>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors ${on ? "bg-[#4CAF4F]" : "bg-[#D0D5DD]"}`}
    >
      <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function Panel({ title, sub, onClose, children, footer }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed top-0 right-0 h-screen w-[400px] bg-white border-l border-[#EAECF0] z-30 flex flex-col shadow-[0px_4px_16px_0px_rgba(171,190,209,0.2)]">
      <div className="h-14 border-b border-[#EAECF0] flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-[#101828]">{title}</p>
          {sub && <p className="text-xs text-[#667085]">{sub}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#344054] transition-colors"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-[#EAECF0] flex-shrink-0">{footer}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#344054] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm text-[#101828] bg-white placeholder-[#98A2B3] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F]/20 transition-colors ${props.className || ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm text-[#101828] bg-white placeholder-[#98A2B3] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F]/20 transition-colors resize-none"
    />
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm text-[#101828] bg-white appearance-none focus:outline-none focus:border-[#4CAF4F] pr-8"
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
    </div>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-[0px_4px_20px_0px_rgba(171,190,209,0.22)] w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0]">
          <p className="text-sm font-semibold text-[#101828]">{title}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#EAECF0] flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-[#F0F5FC] flex items-center justify-center">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#4CAF4F] mb-5">
            <span className="text-white text-xs font-bold">PSI</span>
          </div>
          <h1 className="text-[#101828] text-xl font-semibold">Bienvenue</h1>
          <p className="text-[#667085] text-sm mt-1">Connectez-vous à l'espace administrateur</p>
        </div>

        <div className="bg-white border border-[#DDE8F5] rounded-2xl p-7 space-y-4 shadow-[0px_2px_8px_0px_rgba(171,190,209,0.18)]">
          <Field label="Adresse email">
            <Input type="email" placeholder="admin@psi-dz.com" />
          </Field>
          <Field label="Mot de passe">
            <Input type="password" placeholder="••••••••" />
          </Field>
          <button
            onClick={onLogin}
            className="w-full py-2.5 bg-[#4CAF4F] text-white text-sm font-semibold rounded-lg hover:bg-[#43A046] transition-colors mt-1"
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardPage() {
  const now = new Date();
  const heure = now.getHours();
  const salutation = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";
  const dateStr = now.toLocaleDateString("fr-DZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Shell title={`${salutation}, Yacine`} subtitle={dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}>
      <div className="grid grid-cols-[280px_1fr] gap-5 mb-6">

        {/* Aujourd'hui — card blanche épurée */}
        <div className="bg-white border border-[#E4EBF5] rounded-2xl px-6 py-6 shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)] flex flex-col overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4CAF4F] rounded-l-2xl" />
          <p className="text-[10px] font-bold text-[#7A90B0] uppercase tracking-widest mb-1">Aujourd'hui</p>
          <p className="text-sm font-semibold text-[#101828] mb-6">Mardi 24 juin 2024</p>
          <div className="space-y-4 flex-1">
            {[
              { label: "Commandes reçues", value: "7",  dot: "#4CAF4F" },
              { label: "Devis en attente", value: "3",  dot: "#F59E0B" },
              { label: "Clients contactés", value: "5", dot: "#2194F3" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                  <p className="text-xs text-[#667085]">{s.label}</p>
                </div>
                <span className="text-lg font-bold text-[#101828]">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[#F0F4FA]">
            <p className="text-[10px] text-[#98A2B3] text-center">↑ +2 commandes vs hier</p>
          </div>
        </div>

        {/* Ce mois — cercles */}
        <div className="bg-white border border-[#DDE8F5] rounded-2xl shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)] overflow-hidden">
          <div className="px-7 pt-5 pb-4 border-b border-[#F0F5FF]">
            <p className="text-[10px] font-bold text-[#7A90B0] uppercase tracking-widest mb-0.5">Ce mois-ci</p>
            <p className="text-[#101828] text-sm font-semibold">Juin 2024 · +12% vs mai</p>
          </div>
          <div className="grid grid-cols-4 divide-x divide-[#F0F5FF]">
            {[
              { label: "Commandes", value: "47", color: "#4CAF4F", pct: 78 },
              { label: "Devis", value: "18", color: "#F59E0B", pct: 45 },
              { label: "Nouveaux clients", value: "5", color: "#2194F3", pct: 33 },
              { label: "Validation", value: "68%", color: "#8B5CF6", pct: 68 },
            ].map((s) => (
              <div key={s.label} className="px-4 py-5 flex flex-col items-center gap-2.5">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#EEF3FA" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={s.color} strokeWidth="3"
                      strokeDasharray={`${s.pct * 0.88} 88`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#101828]">{s.value}</span>
                </div>
                <p className="text-[10px] text-[#7A90B0] text-center leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)]">
        <div className="px-5 py-4 border-b border-[#EAECF0] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#101828]">Dernières demandes</p>
          <Btn variant="ghost" sm><ArrowUpRight size={13} />Voir tout</Btn>
        </div>
        <Table head={["Client", "Entreprise", "Type", "Date", "Statut"]}>
          {mockDemandes.map((d) => (
            <TR key={d.id}>
              <TD><span className="font-medium text-[#101828]">{d.nom}</span></TD>
              <TD>{d.entreprise}</TD>
              <TD><TypeChip type={d.type} /></TD>
              <TD>{d.date}</TD>
              <TD><Pill statut={d.statut} /></TD>
            </TR>
          ))}
        </Table>
      </div>
    </Shell>
  );
}

// ─── Demandes ─────────────────────────────────────────────────────────────────

function DemandesPage() {
  const [tab, setTab] = useState<"Commande" | "Devis">("Commande");
  const [selected, setSelected] = useState<Demande | null>(null);
  const [draft, setDraft] = useState<Demande | null>(null);

  const rows = mockDemandes.filter((d) => d.type === tab);

  const pick = (d: Demande) => { setSelected(d); setDraft({ ...d }); };

  return (
    <Shell
      title="Demandes"
      action={
        <div className="flex gap-1 bg-[#F2F4F7] p-1 rounded-lg">
          {(["Commande", "Devis"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white text-[#344054] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}
            >
              {t === "Commande" ? "Commandes" : "Devis"}
            </button>
          ))}
        </div>
      }
    >
      <div className={selected ? "mr-[400px]" : ""}>
        <Table head={["Nom", "Entreprise", "Téléphone", "Date", "Statut"]}>
          {rows.map((d) => (
            <TR key={d.id} onClick={() => pick(d)} active={selected?.id === d.id}>
              <TD><span className="font-medium text-[#101828]">{d.nom}</span></TD>
              <TD>{d.entreprise}</TD>
              <TD><span className="font-mono text-xs text-[#667085]">{d.telephone}</span></TD>
              <TD>{d.date}</TD>
              <TD><Pill statut={d.statut} /></TD>
            </TR>
          ))}
        </Table>
      </div>

      {selected && draft && (
        <Panel
          title={selected.nom}
          sub={selected.entreprise}
          onClose={() => setSelected(null)}
          footer={<Btn onClick={() => setSelected(null)} className="w-full justify-center">Sauvegarder</Btn>}
        >
          <div className="px-6 py-5 space-y-5">
            {/* Infos */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Client</p>
              {[["Téléphone", selected.telephone], ["Date", selected.date], ["Type", ""]].map(([k, v], i) => (
                i < 2 ? (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-[#667085]">{k}</span>
                    <span className="font-medium text-[#344054]">{v}</span>
                  </div>
                ) : (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-[#667085]">Type</span>
                    <TypeChip type={selected.type} />
                  </div>
                )
              ))}
            </div>

            <div className="border-t border-[#F2F4F7]" />

            {/* Produits */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
                {selected.type === "Commande" ? "Produits" : "Description"}
              </p>
              <p className="text-sm text-[#344054] bg-[#F9FAFB] rounded-lg px-3 py-2.5">{selected.produits || "—"}</p>
            </div>

            <div className="border-t border-[#F2F4F7]" />

            {/* Suivi */}
            <div className="space-y-3.5">
              <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Suivi</p>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${draft.contacte ? "bg-[#4CAF4F] border-[#4CAF4F]" : "border-[#D0D5DD]"}`}
                  onClick={() => setDraft({ ...draft, contacte: !draft.contacte })}>
                  {draft.contacte && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm text-[#344054]">Client contacté</span>
              </label>
              {draft.contacte && (
                <Input type="date" value={draft.contacteDate} onChange={(e) => setDraft({ ...draft, contacteDate: e.target.value })} />
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${draft.valide ? "bg-[#4CAF4F] border-[#4CAF4F]" : "border-[#D0D5DD]"}`}
                  onClick={() => setDraft({ ...draft, valide: !draft.valide })}>
                  {draft.valide && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm text-[#344054]">Commande validée</span>
              </label>

              <Field label="Statut">
                <Select value={draft.statut} onChange={(v) => setDraft({ ...draft, statut: v as Demande["statut"] })}>
                  {["En attente", "Contacté", "Validé", "Annulé"].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>

              <Field label="Notes internes">
                <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Ajouter une note..." />
              </Field>
            </div>
          </div>
        </Panel>
      )}
    </Shell>
  );
}

// ─── Produits ─────────────────────────────────────────────────────────────────

function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>(mockProduits);
  const [categories, setCategories] = useState<string[]>(mockCategories);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [form, setForm] = useState<Partial<Produit>>({});
  const [newCat, setNewCat] = useState("");

  const open = (p?: Produit) => {
    setEditing(p || null);
    setForm(p ? { ...p } : { actif: true, categorie: categories[0] });
    setShowModal(true);
  };

  const save = () => {
    if (editing) setProduits(produits.map((p) => p.id === editing.id ? { ...p, ...form } as Produit : p));
    else setProduits([...produits, { ...form, id: Date.now() } as Produit]);
    setShowModal(false);
  };

  return (
    <Shell title="Produits" action={<Btn onClick={() => open()}><Plus size={14} />Nouveau produit</Btn>}>
      <div className="space-y-6">
        <Table head={["Référence", "Largeur", "Longueur", "Catégorie", "Actif", ""]}>
          {produits.map((p) => (
            <TR key={p.id}>
              <TD><span className="font-mono text-xs font-semibold text-[#101828]">{p.reference}</span></TD>
              <TD>{p.largeur} mm</TD>
              <TD>{p.longueur} m</TD>
              <TD>{p.categorie}</TD>
              <TD>
                <Toggle on={p.actif} onChange={() => setProduits(produits.map((x) => x.id === p.id ? { ...x, actif: !x.actif } : x))} />
              </TD>
              <TD>
                <div className="flex items-center gap-1">
                  <button onClick={() => open(p)} className="p-1.5 rounded hover:bg-[#F2F4F7] text-[#667085] transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => setProduits(produits.filter((x) => x.id !== p.id))} className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#667085] hover:text-[#B42318] transition-colors"><Trash2 size={13} /></button>
                </div>
              </TD>
            </TR>
          ))}
        </Table>

        {/* Catégories */}
        <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)]">
          <p className="text-sm font-semibold text-[#101828] mb-4">Catégories</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <div key={c} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg">
                <span className="text-sm text-[#344054]">{c}</span>
                <button onClick={() => setCategories(categories.filter((x) => x !== c))} className="text-[#98A2B3] hover:text-[#B42318] transition-colors"><X size={12} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Nouvelle catégorie…" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="max-w-xs" />
            <Btn variant="ghost" onClick={() => { if (newCat.trim()) { setCategories([...categories, newCat.trim()]); setNewCat(""); } }}>
              <Plus size={14} />Ajouter
            </Btn>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? "Modifier le produit" : "Nouveau produit"}
          onClose={() => setShowModal(false)}
          footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Annuler</Btn><Btn onClick={save}>Sauvegarder</Btn></>}
        >
          <Field label="Référence"><Input value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="RL-57-50" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Largeur (mm)"><Input type="number" value={form.largeur || ""} onChange={(e) => setForm({ ...form, largeur: +e.target.value })} /></Field>
            <Field label="Longueur (m)"><Input type="number" value={form.longueur || ""} onChange={(e) => setForm({ ...form, longueur: +e.target.value })} /></Field>
          </div>
          <Field label="Usage typique"><Input value={form.usage || ""} onChange={(e) => setForm({ ...form, usage: e.target.value })} /></Field>
          <Field label="Catégorie">
            <Select value={form.categorie || ""} onChange={(v) => setForm({ ...form, categorie: v })}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Toggle on={!!form.actif} onChange={() => setForm({ ...form, actif: !form.actif })} />
            <span className="text-sm text-[#344054]">Produit actif</span>
          </label>
        </Modal>
      )}
    </Shell>
  );
}

// ─── Clients ──────────────────────────────────────────────────────────────────

function ClientsPage() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Client | null>(null);

  const rows = mockClients.filter((c) =>
    `${c.entreprise} ${c.contact}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Shell title="Clients">
      <div className="flex gap-5">
        <div className={`flex-1 min-w-0 space-y-4 ${sel ? "mr-[400px]" : ""}`}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 max-w-xs" />
          </div>
          <Table head={["Entreprise", "Contact", "Téléphone", "Wilaya", "Commandes", "Dernière"]}>
            {rows.map((c) => (
              <TR key={c.id} onClick={() => setSel(c)} active={sel?.id === c.id}>
                <TD><span className="font-medium text-[#101828]">{c.entreprise}</span></TD>
                <TD>{c.contact}</TD>
                <TD><span className="font-mono text-xs text-[#667085]">{c.telephone}</span></TD>
                <TD>{c.wilaya}</TD>
                <TD>
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#F0FDF4] text-[#166534] text-xs font-semibold">{c.nbCommandes}</span>
                </TD>
                <TD>{c.derniereCommande}</TD>
              </TR>
            ))}
          </Table>
        </div>

        {sel && (
          <Panel title={sel.entreprise} sub={sel.contact} onClose={() => setSel(null)}>
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Fiche client</p>
                {[["Téléphone", sel.telephone], ["Wilaya", sel.wilaya], ["Commandes", sel.nbCommandes.toString()]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-[#667085]">{k}</span>
                    <span className="font-medium text-[#344054]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#F2F4F7]" />
              <div>
                <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-3">Historique</p>
                <div className="space-y-2">
                  {clientHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#F2F4F7] last:border-0">
                      <div className="flex items-center gap-2">
                        <TypeChip type={h.type} />
                        <span className="text-xs text-[#667085]">{h.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill statut={h.statut} />
                        <span className="text-xs font-semibold text-[#344054]">{h.montant}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </Shell>
  );
}

// ─── Contenu ──────────────────────────────────────────────────────────────────

function ContenuPage() {
  const [hero, setHero] = useState({
    titre: "Solutions d'impression thermique professionnelles",
    sousTitre: "PSI fournit des rouleaux thermiques de qualité supérieure pour vos équipements de caisse.",
  });
  const [apropos, setApropos] = useState(
    "Paper Solutions Industry (PSI) est une entreprise algérienne spécialisée dans la fabrication et la distribution de papier thermique. Fondée à Alger, nous servons des centaines de clients à travers le pays avec des produits certifiés et une livraison rapide."
  );
  const [contact, setContact] = useState({
    adresse: "Zone Industrielle, Rouiba, Alger",
    email: "contact@psi-dz.com",
    telephone: "+213 21 XX XX XX",
  });

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white border border-[#EAECF0] rounded-xl p-6 space-y-4 shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#101828]">{title}</p>
        <Btn variant="ghost" sm><Check size={12} />Sauvegarder</Btn>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  return (
    <Shell title="Contenu du site" subtitle="Modifiez les textes affichés sur le site public">
      <div className="space-y-5 max-w-2xl">
        <Section title="Section Hero">
          <Field label="Titre principal"><Input value={hero.titre} onChange={(e) => setHero({ ...hero, titre: e.target.value })} /></Field>
          <Field label="Sous-titre"><Input value={hero.sousTitre} onChange={(e) => setHero({ ...hero, sousTitre: e.target.value })} /></Field>
        </Section>

        <Section title="À propos">
          <Field label="Texte de présentation">
            <Textarea rows={5} value={apropos} onChange={(e) => setApropos(e.target.value)} />
          </Field>
        </Section>

        <Section title="Informations de contact">
          <Field label="Adresse"><Input value={contact.adresse} onChange={(e) => setContact({ ...contact, adresse: e.target.value })} /></Field>
          <Field label="Email"><Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></Field>
          <Field label="Téléphone"><Input value={contact.telephone} onChange={(e) => setContact({ ...contact, telephone: e.target.value })} /></Field>
        </Section>
      </div>
    </Shell>
  );
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

const initUsers = [
  { id: 1, nom: "Yacine Rahali", email: "yacine@psi-dz.com", role: "Admin", actif: true },
  { id: 2, nom: "Amina Khelifa", email: "amina@psi-dz.com", role: "Employé", actif: true },
  { id: 3, nom: "Omar Beloufa", email: "omar@psi-dz.com", role: "Employé", actif: false },
];

function UtilisateursPage() {
  const [users] = useState(initUsers);
  const [showModal, setShowModal] = useState(false);

  return (
    <Shell title="Utilisateurs" action={<Btn onClick={() => setShowModal(true)}><Plus size={14} />Nouvel utilisateur</Btn>}>
      <Table head={["Nom", "Email", "Rôle", "Statut", ""]}>
        {users.map((u) => (
          <TR key={u.id}>
            <TD><span className="font-medium text-[#101828]">{u.nom}</span></TD>
            <TD><span className="text-[#667085]">{u.email}</span></TD>
            <TD>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.role === "Admin" ? "bg-[#F9F5FF] text-[#6941C6]" : "bg-[#F2F4F7] text-[#344054]"}`}>
                {u.role}
              </span>
            </TD>
            <TD>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.actif ? "text-[#166534]" : "text-[#667085]"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${u.actif ? "bg-[#4CAF4F]" : "bg-[#D0D5DD]"}`} />
                {u.actif ? "Actif" : "Inactif"}
              </span>
            </TD>
            <TD>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-[#F2F4F7] text-[#667085] transition-colors"><Pencil size={13} /></button>
                <button className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#667085] hover:text-[#B42318] transition-colors"><Trash2 size={13} /></button>
              </div>
            </TD>
          </TR>
        ))}
      </Table>

      {showModal && (
        <Modal
          title="Nouvel utilisateur"
          onClose={() => setShowModal(false)}
          footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Annuler</Btn><Btn onClick={() => setShowModal(false)}>Créer</Btn></>}
        >
          <Field label="Nom complet"><Input placeholder="Prénom Nom" /></Field>
          <Field label="Email"><Input type="email" placeholder="email@psi-dz.com" /></Field>
          <Field label="Mot de passe"><Input type="password" placeholder="••••••••" /></Field>
          <Field label="Rôle">
            <Select value="Employé" onChange={() => {}}>
              <option>Admin</option>
              <option>Employé</option>
            </Select>
          </Field>
        </Modal>
      )}
    </Shell>
  );
}

// ─── Page Réglages ───────────────────────────────────────────────────────────

function ReglagesPage() {
  const [profil, setProfil] = useState({ nom: "Yacine Rahali", email: "yacine@psi-dz.com", telephone: "+213 550 00 00 00" });
  const [mdp, setMdp] = useState({ actuel: "", nouveau: "", confirmer: "" });
  const [notifs, setNotifs] = useState({ nouvelleCommande: true, nouveauDevis: true, clientContacte: false, recap: true });

  return (
    <Shell title="Réglages" subtitle="Gérez votre profil et vos préférences">
      <div className="max-w-2xl space-y-5">

        {/* Avatar + identité */}
        <div className="bg-white border border-[#E4EBF5] rounded-xl shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)] p-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#065F46] text-xl font-bold flex-shrink-0">YR</div>
            <div>
              <p className="text-base font-bold text-[#101828]">Yacine Rahali</p>
              <p className="text-sm text-[#98A2B3]">Administrateur · PSI</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="Nom complet">
              <Input value={profil.nom} onChange={(e) => setProfil({ ...profil, nom: e.target.value })} />
            </Field>
            <Field label="Adresse email">
              <Input type="email" value={profil.email} onChange={(e) => setProfil({ ...profil, email: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <Input value={profil.telephone} onChange={(e) => setProfil({ ...profil, telephone: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Btn>Sauvegarder</Btn>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="bg-white border border-[#E4EBF5] rounded-xl shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)] p-6">
          <p className="text-sm font-semibold text-[#101828] mb-4">Modifier le mot de passe</p>
          <div className="space-y-3">
            <Field label="Mot de passe actuel">
              <Input type="password" placeholder="••••••••" value={mdp.actuel} onChange={(e) => setMdp({ ...mdp, actuel: e.target.value })} />
            </Field>
            <Field label="Nouveau mot de passe">
              <Input type="password" placeholder="••••••••" value={mdp.nouveau} onChange={(e) => setMdp({ ...mdp, nouveau: e.target.value })} />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <Input type="password" placeholder="••••••••" value={mdp.confirmer} onChange={(e) => setMdp({ ...mdp, confirmer: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Btn>Mettre à jour</Btn>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-[#E4EBF5] rounded-xl shadow-[0px_1px_4px_0px_rgba(171,190,209,0.2)] p-6">
          <p className="text-sm font-semibold text-[#101828] mb-4">Notifications</p>
          <div className="space-y-4">
            {([
              { key: "nouvelleCommande", label: "Nouvelle commande reçue",     sub: "Alerté à chaque nouvelle commande" },
              { key: "nouveauDevis",     label: "Nouveau devis reçu",           sub: "Alerté à chaque nouveau devis" },
              { key: "clientContacte",  label: "Rappel client non contacté",   sub: "Après 48h sans contact" },
              { key: "recap",           label: "Récapitulatif hebdomadaire",    sub: "Résumé envoyé chaque lundi matin" },
            ] as { key: keyof typeof notifs; label: string; sub: string }[]).map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-[#344054]">{label}</p>
                  <p className="text-xs text-[#98A2B3]">{sub}</p>
                </div>
                <Toggle on={notifs[key]} onChange={() => setNotifs({ ...notifs, [key]: !notifs[key] })} />
              </div>
            ))}
          </div>
        </div>


      </div>
    </Shell>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("login");

  if (page === "login") return <LoginPage onLogin={() => setPage("dashboard")} />;

  const screens: Record<Exclude<Page, "login">, React.ReactNode> = {
    dashboard:    <DashboardPage />,
    demandes:     <DemandesPage />,
    produits:     <ProduitsPage />,
    clients:      <ClientsPage />,
    contenu:      <ContenuPage />,
    utilisateurs: <UtilisateursPage />,
    reglages:     <ReglagesPage />,
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] font-['Inter',sans-serif]">
      <Sidebar current={page} onNav={setPage} />
      {screens[page as Exclude<Page, "login">]}
    </div>
  );
}
