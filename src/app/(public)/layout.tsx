import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartSummary } from '@/components/CartSummary';

const WHATSAPP_NUMBER = '213770150656';
const WHATSAPP_MSG = encodeURIComponent('Bonjour, je souhaite obtenir des informations sur vos produits PSI.');

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <CartSummary />
      <Footer />

      {/* Bouton WhatsApp flottant */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.5)] hover:scale-110 transition-transform"
        style={{ background: '#25D366' }}
        aria-label="Nous contacter sur WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.663 4.61 1.816 6.51L4 29l7.697-1.794A12.94 12.94 0 0016 28c6.627 0 12-5.373 12-12S22.627 3 16 3z" fill="white"/>
          <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.06 3.15 5 4.42.7.3 1.24.48 1.67.62.7.22 1.34.19 1.84.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="#25D366"/>
        </svg>
      </a>
    </div>
  );
}
