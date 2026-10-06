'use client';

import { useEffect, useRef, useState } from 'react';

// Titre dont le soulignement vert se remplit à mesure qu'on défile.
export function ScrollUnderline({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const vh = window.innerHeight;
      // 0 quand le titre entre par le bas (85% de l'écran), 1 quand il atteint 5%.
      setProgress(Math.min(1, Math.max(0, (vh * 0.85 - top) / (vh * 0.8))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <h2 ref={ref} className={`relative inline-block pb-4 ${className}`}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        className="absolute bottom-0 start-0 w-full h-3 overflow-visible rtl:-scale-x-100"
      >
        <path
          d="M1 10 Q 45 -3 99 7"
          pathLength={1}
          fill="none"
          stroke="#4CAF4F"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray="1 2"
          strokeDashoffset={1 - progress}
        />
      </svg>
    </h2>
  );
}
