import Link from 'next/link';

// Bouton pilule avec rond fléché: au survol, le rond s'étend sur tout le bouton.
const VARIANTS = {
  'white-green': { base: 'bg-white text-[#263238]', circle: 'bg-[#4CAF4F]', hoverText: 'group-hover:text-white', arrow: '#FFFFFF' },
  'white-dark':  { base: 'bg-white text-[#263238]', circle: 'bg-[#263238]', hoverText: 'group-hover:text-white', arrow: '#FFFFFF' },
  'green-white': { base: 'bg-[#4CAF4F] text-white', circle: 'bg-white', hoverText: 'group-hover:text-[#263238]', arrow: '#4CAF4F' },
  'dark-white':  { base: 'bg-[#263238] text-white', circle: 'bg-white',     hoverText: 'group-hover:text-[#263238]', arrow: '#263238' },
} as const;

type Props = {
  children: React.ReactNode;
  variant: keyof typeof VARIANTS;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
};

export function ArrowButton({ children, variant, href, onClick, type = 'button', disabled, className = '' }: Props) {
  const v = VARIANTS[variant];
  const cls = `group relative overflow-hidden inline-flex items-center rounded-full ps-6 pe-[3.75rem] py-3 text-[15px] font-semibold active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none transition-transform duration-300 ${v.base} ${className}`;
  const inner = (
    <>
      <span className={`absolute inset-y-1.5 end-1.5 w-9 rounded-full transition-[width] duration-500 ease-out group-hover:w-[calc(100%-0.75rem)] ${v.circle}`} />
      <span className={`relative z-10 transition-colors duration-500 ${v.hoverText}`}>{children}</span>
      <svg
        width="15" height="15" viewBox="0 0 16 16" fill="none"
        className="absolute z-10 end-[1.05rem] top-1/2 -translate-y-1/2 rtl:rotate-180 transition-transform duration-500 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
        aria-hidden="true"
      >
        <path d="M3 8h10M9 4l4 4-4 4" stroke={v.arrow} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
  return href
    ? <Link href={href} onClick={onClick} className={cls}>{inner}</Link>
    : <button type={type} onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
}
