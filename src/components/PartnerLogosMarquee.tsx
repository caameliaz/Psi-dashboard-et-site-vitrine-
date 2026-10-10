// Bande de logos clients qui défile horizontalement en continu (effet "marquee"),
// activable/désactivable depuis Contenu > Logos clients (clé SiteContent
// "about_logos_enabled") — remplace alors la fonctionnalité précédente (photos
// qui défilent) dans la section "À propos".
export type PartnerLogo = { id: string; name: string; photo: string | null };

export function PartnerLogosMarquee({ logos }: { logos: PartnerLogo[] }) {
  if (logos.length === 0) return null;

  // La bande défile de -50% à 0 : la 2e moitié doit être identique à la 1ère pour boucler sans
  // saut. Avec peu de logos, une seule moitié est plus étroite que l'écran — on verrait du vide
  // avant que la 2e moitié n'apparaisse. On répète donc la liste assez de fois pour qu'une
  // moitié dépasse largement la largeur d'un écran, quel que soit le nombre de logos.
  const MIN_REPEATS = 8;
  const half = Array.from({ length: MIN_REPEATS }, () => logos).flat();
  const track = [...half, ...half];
  // Durée proportionnelle au nombre d'éléments (plutôt qu'une durée fixe) : la piste a été
  // élargie ×8 pour boucler sans vide (cf. commentaire ci-dessus), donc la durée doit suivre
  // sinon la vitesse de défilement réelle est aussi multipliée par 8 — chaque logo avance
  // toujours au même rythme, quel que soit le nombre de répétitions nécessaires.
  const SECONDS_PER_ITEM = 3.5;
  const durationS = half.length * SECONDS_PER_ITEM;

  return (
    <div className="relative w-full overflow-hidden py-8 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className="marquee-track flex w-max gap-16 hover:[animation-play-state:paused]"
        style={{ animation: `marquee ${durationS}s linear infinite` }}
      >
        {track.map((logo, i) => (
          <div key={`${logo.id}-${i}`} className="group flex shrink-0 items-center gap-3 h-10" title={logo.name}>
            {logo.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.photo}
                alt=""
                className="h-full w-auto max-w-[44px] object-contain grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
              />
            ) : (
              // Client sans logo : badge initiales (2 premières lettres du nom).
              <div className="w-9 h-9 rounded-full bg-[#F5F7FA] border border-[#E2E8F0] flex items-center justify-center text-[12px] font-bold text-[#8A9BB5] shrink-0 transition-colors duration-300 group-hover:text-[#263238]">
                {logo.name.trim().slice(0, 2).toUpperCase()}
              </div>
            )}
            {/* Inter (chargée dans layout.tsx) : alternative la plus proche de "Google Sans"
                (non distribuée publiquement) pour le nom du client. */}
            <span
              className="text-[15px] font-bold text-[#263238]/70 whitespace-nowrap transition-colors duration-300 group-hover:text-[#263238]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
