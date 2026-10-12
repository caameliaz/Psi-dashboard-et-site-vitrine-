'use client';

import { useEffect, useRef, useState } from 'react';

// Liste dans une seule carte: les éléments entrent horizontalement l'un après l'autre
// (au moment où la carte apparaît à l'écran) jusqu'à s'aligner côte à côte.
export function SlideInList({ items }: { items: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [visible, setVisible] = useState(false);

  // Le parent remonte le composant (key) quand la référence change: l'animation se rejoue.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <ul
      ref={ref}
      className="my-3 flex flex-wrap self-start overflow-hidden rounded-2xl border border-[#E4EBF5] bg-white shadow-[0_8px_28px_rgba(38,50,56,0.08)]"
    >
      {items.map((u, i) => (
        <li
          key={u}
          className={`px-6 py-3.5 text-[14px] font-semibold text-[#263238] transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${i > 0 ? 'border-s border-[#E4EBF5]' : ''}`}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : 'translateX(-120%)',
            transitionDelay: visible ? `${i * 450}ms` : '0ms',
          }}
        >
          {u}
        </li>
      ))}
    </ul>
  );
}
