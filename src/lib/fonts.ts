// Polices du site (partagées par les layouts racine : site public, dashboard, pages de documents).
import { Open_Sans, Noto_Serif, Playfair_Display, Inter } from 'next/font/google';

export const openSans = Open_Sans({ subsets: ['latin'], variable: '--font-open-sans' });
export const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif' });
export const playfairDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
// « Google Sans » n'est pas distribuée publiquement (police interne Google, absente de Google
// Fonts) — Inter est l'alternative la plus proche visuellement et librement utilisable.
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
