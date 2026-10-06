'use client';

import { useEffect, useState } from 'react';

const SLIDES = ['/photo%202.avif', '/images/about-tpe.jpg', '/images/about-livraison.jpg'];

// Carrousel d'images qui glissent, défilement automatique (pause au survol).
export function AboutCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [paused]);

  const go = (d: number) => setIndex((i) => (i + d + SLIDES.length) % SLIDES.length);

  return (
    <div
      className="relative w-full aspect-[4/3] overflow-hidden rounded-3xl shadow-[0_16px_48px_rgba(38,50,56,0.18)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Piste forcée en LTR: les images défilent toujours dans le même sens, même en arabe */}
      <div
        dir="ltr"
        className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className="h-full w-full shrink-0 object-cover"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#263238]/45 via-transparent to-transparent" />

      <div className="absolute bottom-4 inset-x-4 flex items-center justify-between">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-500 ${i === index ? 'w-7 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              aria-label={d < 0 ? 'Précédent' : 'Suivant'}
              onClick={() => go(d)}
              className="w-10 h-10 rounded-full border border-white/40 bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-[#263238] active:scale-95 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={d < 0 ? 'rotate-180 rtl:rotate-0' : 'rtl:rotate-180'}>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
