'use client';

import { useEffect, useRef, useState } from 'react';

// Fait apparaître son contenu en glissant vers sa place au scroll (une seule
// fois). Généralisation du pattern utilisé pour la section Qualité.
export function Reveal({
  children,
  delayMs = 0,
  y = 24,
  x = 0,
  className = '',
}: {
  children: React.ReactNode;
  delayMs?: number;
  y?: number;
  x?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0, 0)' : `translate(${x}px, ${y}px)`,
        transitionDelay: visible ? `${delayMs}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
}
