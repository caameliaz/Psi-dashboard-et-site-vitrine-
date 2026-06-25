import { useState } from "react";
import {
  ShoppingCart, Menu, X, Award, Globe, Shield,
  MapPin, Mail, Minus, Plus, ArrowRight, ChevronRight,
} from "lucide-react";

type Page = "home" | "cart" | "checkout";

interface Product {
  id: number;
  ref: string;
  dims: string;
  usage: string;
}

interface CartItem extends Product {
  price: number;
  qty: number;
}

const PRODUCTS: Product[] = [
  { id: 1, ref: "57/40", dims: "57mm × 40m", usage: "Terminaux bancaires, TPE" },
  { id: 2, ref: "57/50", dims: "57mm × 50m", usage: "Terminaux bancaires, caisses" },
  { id: 3, ref: "80/80", dims: "80mm × 80m", usage: "Imprimantes thermiques, commerces" },
  { id: 4, ref: "80/70", dims: "80mm × 70m", usage: "Restaurants, hôtels" },
  { id: 5, ref: "76/70", dims: "76mm × 70m", usage: "Pharmacies, laboratoires" },
  { id: 6, ref: "112/50", dims: "112mm × 50m", usage: "Banques, grandes surfaces" },
];

const UNIT_PRICE = 450;

const HERO_IMG =
  "https://images.unsplash.com/photo-1504941319307-771ebfa02a51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";
const ABOUT_IMG =
  "https://images.unsplash.com/photo-1655122878062-a9e885391a1b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600";

function RollIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="32" fill="#e8f5e9" stroke="#4caf4f" strokeWidth="2" />
      <circle cx="36" cy="36" r="20" fill="#c8e6c9" stroke="#4caf4f" strokeWidth="1.5" />
      <circle cx="36" cy="36" r="8" fill="#4caf4f" />
      <circle cx="36" cy="36" r="3.5" fill="white" />
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDone, setOrderDone] = useState(false);

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const goHome = () => { setPage("home"); setMobileOpen(false); };

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    if (page !== "home") {
      setPage("home");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 120);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...p, price: UNIT_PRICE, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  /* ──────────── NAVBAR ──────────── */
  const Navbar = () => (
    <nav className="sticky top-0 z-50 bg-white shadow-[0px_4px_8px_0px_rgba(171,190,209,0.4)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-16 py-4 flex items-center justify-between">
        {/* Logo */}
        <button onClick={goHome} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#4caf4f] rounded-[4px] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs leading-none">PSI</span>
          </div>
          <span className="font-semibold text-[#263238] text-xl tracking-tight">PSI</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-8 items-center">
          {(["Accueil", "Produits", "À propos", "Contact"] as const).map((label) => {
            const id = label === "Accueil" ? "home" : label === "Produits" ? "products" : label === "À propos" ? "about" : "contact";
            return (
              <button
                key={label}
                onClick={() => (label === "Accueil" ? goHome() : scrollTo(id))}
                className="font-medium text-[#4d4d4d] text-base hover:text-[#4caf4f] transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage("cart")}
            className="relative p-2 text-[#4d4d4d] hover:text-[#4caf4f] transition-colors"
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#4caf4f] text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => scrollTo("products")}
            className="hidden md:flex items-center gap-2 bg-[#4caf4f] text-white font-medium text-base px-6 py-3 rounded-[4px] hover:bg-[#43a046] transition-colors"
          >
            Commander
            <ArrowRight size={16} />
          </button>
          <button
            className="md:hidden text-[#4d4d4d]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#abbed1]/40 px-6 py-5 flex flex-col gap-4">
          {(["Accueil", "Produits", "À propos", "Contact"] as const).map((label) => {
            const id = label === "Accueil" ? "home" : label === "Produits" ? "products" : label === "À propos" ? "about" : "contact";
            return (
              <button
                key={label}
                onClick={() => (label === "Accueil" ? goHome() : scrollTo(id))}
                className="font-medium text-[#4d4d4d] text-base text-left py-1 hover:text-[#4caf4f] transition-colors"
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={() => { setMobileOpen(false); scrollTo("products"); }}
            className="bg-[#4caf4f] text-white font-medium py-3 rounded-[4px] text-center hover:bg-[#43a046] transition-colors"
          >
            Commander
          </button>
        </div>
      )}
    </nav>
  );

  /* ──────────── HOME PAGE ──────────── */
  const HomePage = () => (
    <>
      {/* Hero */}
      <section
        className="relative min-h-[50vh] md:min-h-[88vh] flex items-center bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_IMG}')` }}
      >
        <div className="absolute inset-0 bg-[#263238]/78" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 py-14 md:py-24 w-full">
          <div className="max-w-2xl mx-auto md:mx-0 text-center md:text-left">
            <h1 className="font-bold text-white text-5xl lg:text-7xl leading-tight mb-3 tracking-tight">
              PSI
            </h1>
            <p className="font-normal text-[#c8e6c9] text-base md:text-2xl leading-relaxed mb-8">
              Spécialiste du papier thermique professionnel en Algérie
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center md:items-start">
              <button
                onClick={() => scrollTo("products")}
                className="w-full sm:w-auto bg-[#4caf4f] text-white font-medium text-sm md:text-base px-6 md:px-8 py-3 md:py-4 rounded-[4px] inline-flex items-center justify-center gap-2 hover:bg-[#43a046] transition-colors shadow-[0px_4px_8px_0px_rgba(76,175,79,0.4)]"
              >
                Voir nos produits
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => setPage("checkout")}
                className="w-full sm:w-auto border-2 border-white text-white font-medium text-sm md:text-base px-6 md:px-8 py-3 md:py-4 rounded-[4px] inline-flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                Demander un devis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <h2 className="font-semibold text-[#4d4d4d] text-3xl lg:text-4xl text-center mb-8">
            Nos Produits
          </h2>

          {/* Filter pills */}
          <div className="flex gap-3 justify-center mb-10 flex-wrap">
            <button className="px-5 py-2 rounded-full font-medium text-sm bg-[#4caf4f] text-white border border-[#4caf4f]">
              Papier thermique
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {PRODUCTS.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-[10px] shadow-[0px_4px_8px_0px_rgba(171,190,209,0.4)] p-4 md:p-6 flex flex-col gap-3 md:gap-4 hover:shadow-[0px_8px_16px_0px_rgba(171,190,209,0.4)] transition-shadow"
              >
                <div className="w-full h-40 bg-[#f5f7fa] rounded-[6px] flex items-center justify-center">
                  <RollIcon />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-[#263238] text-xl">Réf. {p.ref}</p>
                  <p className="font-medium text-[#4d4d4d] text-sm">{p.dims}</p>
                  <p className="font-normal text-[#717171] text-sm">{p.usage}</p>
                </div>
                <button
                  onClick={() => addToCart(p)}
                  className="mt-auto bg-[#4caf4f] text-white font-medium text-xs md:text-sm px-3 md:px-6 py-2.5 md:py-3 rounded-[4px] hover:bg-[#43a046] transition-colors flex items-center justify-center gap-1.5 w-full"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Ajouter au panier</span>
                  <span className="sm:hidden">Ajouter</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality */}
      <section className="py-16 bg-[#ebf4ff]">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
            {/* Left text */}
            <div className="lg:w-2/5 text-center lg:text-left">
              <h2 className="font-semibold text-[#4d4d4d] text-2xl lg:text-3xl leading-snug mb-3">
                Notre engagement<br />
                <span className="text-[#4caf4f]">qualité & conformité</span>
              </h2>
              <p className="font-normal text-[#717171] text-base leading-relaxed">
                Des produits sélectionnés pour leur fiabilité et leur conformité aux standards européens les plus exigeants.
              </p>
            </div>

            {/* Right grid */}
            <div className="lg:w-3/5 grid grid-cols-3 gap-4 w-full">
              {[
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4caf4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ),
                  value: "55 gr/m²",
                  label: "Papier Premium",
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4caf4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  ),
                  value: "Allemagne",
                  label: "Origine Europe",
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4caf4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  ),
                  value: "BPA Free",
                  label: "Sécurité Sanitaire",
                },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-2">
                  <div className="shrink-0 w-9 h-9 rounded-[8px] bg-white border border-[#c8dff7] shadow-[0px_2px_4px_0px_rgba(171,190,209,0.5)] flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-bold text-[#263238] text-base leading-tight">{item.value}</p>
                    <p className="font-normal text-[#717171] text-xs mt-0.5">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-semibold text-[#4d4d4d] text-3xl lg:text-4xl mb-6">
                À propos de PSI
              </h2>
              <p className="font-normal text-[#717171] text-base leading-relaxed mb-4">
                PSI (Paper Solutions Industry) est une entreprise algérienne spécialisée dans la transformation et la distribution de papier thermique professionnel. Basée à Alger, nous servons commerces, banques, restaurants et pharmacies à travers tout le territoire national.
              </p>
              <p className="font-normal text-[#717171] text-base leading-relaxed mb-4">
                Nous nous approvisionnons exclusivement auprès de fournisseurs européens certifiés, garantissant à nos clients des produits de qualité supérieure, conformes aux normes sanitaires les plus strictes.
              </p>
              <p className="font-normal text-[#717171] text-base leading-relaxed">
                Notre mission est d'offrir des solutions papier fiables, rapides et accessibles à tous les professionnels qui en ont besoin, avec un service client réactif et de proximité.
              </p>
            </div>
            <div>
              <div className="rounded-[10px] overflow-hidden shadow-[0px_8px_16px_0px_rgba(171,190,209,0.4)] h-80">
                <img
                  src={ABOUT_IMG}
                  alt="Usine PSI"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="py-20 bg-[#4caf4f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 text-center">
          <h2 className="font-semibold text-white text-3xl lg:text-4xl mb-4">
            Besoin d'un devis personnalisé ?
          </h2>
          <p className="font-normal text-[#e8f5e9] text-base mb-10">
            Contactez notre équipe commerciale pour obtenir une offre adaptée à vos besoins.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <a
              href="mailto:contact@psi-algerie.com"
              className="bg-white text-[#4caf4f] font-medium text-base px-8 py-4 rounded-[4px] inline-flex items-center gap-2 hover:bg-[#f5f7fa] transition-colors shadow-[0px_4px_8px_0px_rgba(0,0,0,0.1)]"
            >
              Nous contacter
            </a>
            <button
              onClick={() => setPage("checkout")}
              className="border-2 border-white text-white font-medium text-base px-8 py-4 rounded-[4px] inline-flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              Demander un devis
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center text-[#e8f5e9] text-sm">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="shrink-0" />
              <span>Centre des affaires El Qods, Niveau M1, Chéraga, Alger</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={15} className="shrink-0" />
              <a href="mailto:contact@psi-algerie.com" className="hover:text-white transition-colors">
                contact@psi-algerie.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#263238] text-white py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#4caf4f] rounded-[4px] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">PSI</span>
                </div>
                <span className="font-bold text-xl">PSI</span>
              </div>
              <p className="text-[#89939e] text-sm leading-relaxed">
                Spécialiste du papier thermique professionnel en Algérie.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white text-base mb-4">Liens rapides</h4>
              <ul className="flex flex-col gap-2">
                {[
                  { label: "Accueil", action: () => goHome() },
                  { label: "Produits", action: () => scrollTo("products") },
                  { label: "À propos", action: () => scrollTo("about") },
                  { label: "Contact", action: () => scrollTo("contact") },
                ].map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={l.action}
                      className="text-[#89939e] text-sm hover:text-[#4caf4f] transition-colors"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-base mb-4">Contact</h4>
              <div className="flex flex-col gap-3 text-[#89939e] text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-[#4caf4f]" />
                  <span>Centre des affaires El Qods, Niveau M1, Chéraga, Alger</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} className="shrink-0 text-[#4caf4f]" />
                  <a
                    href="mailto:contact@psi-algerie.com"
                    className="hover:text-[#4caf4f] transition-colors"
                  >
                    contact@psi-algerie.com
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-[#4d4d4d] pt-6 text-center text-[#89939e] text-sm">
            © {new Date().getFullYear()} PSI — Paper Solutions Industry. Tous droits réservés.
          </div>
        </div>
      </footer>
    </>
  );

  /* ──────────── CART PAGE ──────────── */
  const CartPage = () => (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={goHome}
          className="mb-6 flex items-center gap-2 bg-white border border-[#abbed1] text-[#4d4d4d] font-medium text-sm px-4 py-2 rounded-[4px] shadow-[0px_2px_4px_0px_rgba(171,190,209,0.6)] hover:border-[#4caf4f] hover:text-[#4caf4f] transition-colors"
        >
          <ChevronRight size={15} className="rotate-180" />
          Retour à l'accueil
        </button>
        <h1 className="font-semibold text-[#263238] text-3xl mb-8">Mon panier</h1>

        {cart.length === 0 ? (
          <div className="bg-white rounded-[10px] shadow-[0px_4px_8px_0px_rgba(171,190,209,0.4)] p-16 text-center">
            <ShoppingCart size={48} className="text-[#abbed1] mx-auto mb-4" />
            <p className="text-[#717171] text-base mb-6">Votre panier est vide.</p>
            <button
              onClick={() => scrollTo("products")}
              className="bg-[#4caf4f] text-white font-medium px-8 py-3 rounded-[4px] hover:bg-[#43a046] transition-colors"
            >
              Voir les produits
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-[10px] shadow-[0px_4px_8px_0px_rgba(171,190,209,0.4)] overflow-hidden mb-6">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-[#f5f7fa] text-[#89939e] text-xs font-medium uppercase tracking-wide">
                <div className="col-span-5">Produit</div>
                <div className="col-span-3 text-center">Qté</div>
                <div className="col-span-2 text-right">P.U.</div>
                <div className="col-span-2 text-right">Sous-total</div>
              </div>

              {cart.map((item, i) => (
                <div
                  key={item.id}
                  className={`px-6 py-4 flex sm:grid sm:grid-cols-12 sm:gap-4 items-center gap-4 flex-wrap ${i < cart.length - 1 ? "border-b border-[#abbed1]/30" : ""}`}
                >
                  <div className="sm:col-span-5 flex-1 min-w-[140px]">
                    <p className="font-semibold text-[#263238] text-base">Réf. {item.ref}</p>
                    <p className="text-[#717171] text-sm">{item.dims}</p>
                  </div>
                  <div className="sm:col-span-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-8 h-8 rounded-full border border-[#abbed1] flex items-center justify-center text-[#4d4d4d] hover:border-[#4caf4f] hover:text-[#4caf4f] transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="font-medium text-[#263238] w-5 text-center text-base">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-8 h-8 rounded-full border border-[#abbed1] flex items-center justify-center text-[#4d4d4d] hover:border-[#4caf4f] hover:text-[#4caf4f] transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="sm:col-span-2 text-right text-[#717171] text-sm whitespace-nowrap">
                    {item.price.toLocaleString("fr-DZ")} DA
                  </div>
                  <div className="sm:col-span-2 text-right font-semibold text-[#263238] whitespace-nowrap">
                    {(item.price * item.qty).toLocaleString("fr-DZ")} DA
                  </div>
                </div>
              ))}

              {/* Total row */}
              <div className="px-6 py-4 bg-[#f5f7fa] border-t border-[#abbed1]/40 flex items-center justify-between">
                <span className="font-semibold text-[#263238] text-lg">Total</span>
                <span className="font-bold text-[#4caf4f] text-2xl">
                  {totalPrice.toLocaleString("fr-DZ")} DA
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setPage("checkout")}
                className="flex-1 bg-[#4caf4f] text-white font-medium py-4 rounded-[4px] hover:bg-[#43a046] transition-colors flex items-center justify-center gap-2"
              >
                Confirmer la commande
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setPage("checkout")}
                className="flex-1 border-2 border-[#4caf4f] text-[#4caf4f] font-medium py-4 rounded-[4px] hover:bg-[#e8f5e9] transition-colors text-center"
              >
                Demander un devis personnalisé
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ──────────── CHECKOUT PAGE ──────────── */
  const CheckoutPage = () => {
    const [form, setForm] = useState({
      nom: "", entreprise: "", telephone: "", wilaya: "", message: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setOrderDone(true);
    };

    if (orderDone) {
      return (
        <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center px-6">
          <div className="bg-white rounded-[10px] shadow-[0px_8px_16px_0px_rgba(171,190,209,0.4)] p-12 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-[#e8f5e9] rounded-full flex items-center justify-center mx-auto mb-6">
              <Award size={30} className="text-[#4caf4f]" />
            </div>
            <h2 className="font-semibold text-[#263238] text-2xl mb-3">Commande envoyée !</h2>
            <p className="text-[#717171] text-base leading-relaxed mb-8">
              Notre équipe vous contactera dans les plus brefs délais.
            </p>
            <button
              onClick={() => { setOrderDone(false); goHome(); }}
              className="bg-[#4caf4f] text-white font-medium px-8 py-3 rounded-[4px] hover:bg-[#43a046] transition-colors w-full"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }

    const fields = [
      { key: "nom", label: "Nom complet", placeholder: "Votre nom et prénom", type: "text" },
      { key: "entreprise", label: "Nom de l'entreprise", placeholder: "Votre entreprise", type: "text" },
      { key: "telephone", label: "Téléphone", placeholder: "+213 XXX XXX XXX", type: "tel" },
      { key: "wilaya", label: "Wilaya", placeholder: "Ex : Alger, Oran, Constantine…", type: "text" },
    ];

    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <div className="max-w-xl mx-auto px-6 py-12">
          <button
            onClick={() => setPage("cart")}
            className="mb-6 flex items-center gap-2 bg-white border border-[#abbed1] text-[#4d4d4d] font-medium text-sm px-4 py-2 rounded-[4px] shadow-[0px_2px_4px_0px_rgba(171,190,209,0.6)] hover:border-[#4caf4f] hover:text-[#4caf4f] transition-colors"
          >
            <ChevronRight size={15} className="rotate-180" />
            Retour au panier
          </button>
          <h1 className="font-semibold text-[#263238] text-3xl mb-6">Envoyer la commande</h1>
          <p className="text-[#717171] text-sm mb-8">
            Remplissez le formulaire ci-dessous et notre équipe vous recontactera rapidement.
          </p>

          <div className="bg-white rounded-[10px] shadow-[0px_4px_8px_0px_rgba(171,190,209,0.4)] p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block font-medium text-[#4d4d4d] text-sm mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    required
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-4 py-3 border border-[#abbed1] rounded-[4px] text-[#263238] text-sm placeholder:text-[#89939e] focus:outline-none focus:border-[#4caf4f] focus:ring-1 focus:ring-[#4caf4f]/30 transition-colors bg-white"
                  />
                </div>
              ))}

              <div>
                <label className="block font-medium text-[#4d4d4d] text-sm mb-1.5">Message</label>
                <textarea
                  placeholder="Décrivez vos besoins, les quantités souhaitées, vos conditions de livraison…"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#abbed1] rounded-[4px] text-[#263238] text-sm placeholder:text-[#89939e] focus:outline-none focus:border-[#4caf4f] focus:ring-1 focus:ring-[#4caf4f]/30 transition-colors resize-none bg-white"
                />
              </div>

              <button
                type="submit"
                className="bg-[#4caf4f] text-white font-medium text-base py-4 rounded-[4px] hover:bg-[#43a046] transition-colors mt-1 flex items-center justify-center gap-2"
              >
                Envoyer la commande
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {page === "home" && <HomePage />}
      {page === "cart" && <CartPage />}
      {page === "checkout" && <CheckoutPage />}
    </div>
  );
}
