'use client';

import { useEffect, useState } from 'react';

// Diaporama d'UNE photo à la fois qui change toute seule (fondu), utilisé sur mobile dans la
// section "À propos" — sur ordinateur, c'est la mise en page à photos fixes qui s'affiche.
export function AboutPhotoSlider({ photos, intervalMs = 3500 }: { photos: string[]; intervalMs?: number }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % photos.length), intervalMs);
    return () => clearInterval(timer);
  }, [photos.length, intervalMs]);

  return (
    <div className="relative w-[85%] mx-auto h-[240px] rounded-3xl overflow-hidden shadow-[0_16px_48px_rgba(38,50,56,0.18)]">
      {photos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
        {photos.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />
        ))}
      </div>
    </div>
  );
}
