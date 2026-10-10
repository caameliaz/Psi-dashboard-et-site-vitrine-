'use client';

import { useEffect, useRef, useState } from 'react';

// Anime un nombre de 0 jusqu'à sa valeur finale quand il entre dans le viewport (une seule
// fois), au lieu d'afficher la valeur directement — utilisé pour les chiffres clés de la
// section "À propos" (ex: "+100", "+37"). Préserve tout préfixe/suffixe non numérique (signe
// +, %, etc.) ; si la valeur ne contient pas de nombre, elle est affichée telle quelle.
export function AnimatedNumber({ value, durationMs = 1200 }: { value: string; durationMs?: number }) {
  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  const target = match ? parseInt(match[2], 10) : 0;
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!match) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          setDisplay(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `match`/`target` dérivés de `value`, déjà couverts par sa propre identité
  }, [value, durationMs]);

  if (!match) return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{match[1]}{display}{match[3]}</span>;
}
