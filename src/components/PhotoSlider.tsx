'use client';

import { useEffect, useRef, useState } from 'react';

// Diaporama de photos pour la carte d'une catégorie (accueil) : défilement automatique doux,
// pause au survol, glissement du doigt sur mobile, petits points cliquables.
// Aucune requête réseau : les URLs des photos sont fournies par la page (déjà versionnées,
// donc mises en cache par le navigateur) — les photos suivantes ne se chargent qu'à l'approche.
// Pas de défilement automatique si l'utilisateur a demandé « moins d'animations ».
export function PhotoSlider({
  photos,
  alt,
  intervalMs = 4000,
  imgClassName = '',
}: {
  photos: string[];
  alt: string;
  intervalMs?: number;
  imgClassName?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = photos.length;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, paused, reduceMotion, intervalMs]);

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      {photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === index ? alt : ''}
          aria-hidden={i !== index}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      ))}

      {count > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Photo ${i + 1} sur ${count}`}
              // Le diaporama est dans un lien : un clic sur un point ne doit pas ouvrir la page.
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIndex(i); }}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-[#4CAF4F]' : 'w-1.5 bg-[#ABBED1]/70 hover:bg-[#4CAF4F]/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
