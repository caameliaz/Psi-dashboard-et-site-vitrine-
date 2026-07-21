// Aperçu visuel d'une référence : rectangle paysage + largeur/longueur en dessous.
export function FormatPreview({ width, length, color = '#9AA5B1', compact = false, scale = 1 }: { width: number; length: number; color?: string; compact?: boolean; scale?: number }) {
  const rectW = (compact ? 40 : 52) * scale;
  const rectH = (compact ? 26 : 34) * scale;
  const fontSize = Math.round(10 * scale);

  return (
    <div className="flex flex-col items-center" style={{ gap: 4 * scale }}>
      <div className="rounded-[3px] border-2 flex-shrink-0" style={{ width: rectW, height: rectH, borderColor: color, background: '#fff' }} />
      <span className="font-bold leading-none whitespace-nowrap" style={{ color, fontSize }}>{length} × {width}mm</span>
    </div>
  );
}
