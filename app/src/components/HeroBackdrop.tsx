import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';
const CYCLE_MS = 7000;

function heroSrcSet(url: string): string {
  const match = url.match(/\/t\/p\/[^/]+(\/.+)$/);
  if (!match) return '';
  const path = match[1];
  return [`${TMDB_IMG_BASE}/w780${path} 780w`, `${TMDB_IMG_BASE}/w1280${path} 1280w`].join(', ');
}

interface HeroBackdropProps {
  backdrops?: string[];
}

export function HeroBackdrop({ backdrops = [] }: HeroBackdropProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [backdrops.join('|')]);

  useEffect(() => {
    if (backdrops.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % backdrops.length);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [backdrops.length]);

  const currentBackdrop = backdrops[idx];

  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 right-0 h-[300px] sm:h-[560px] overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <AnimatePresence mode="popLayout">
        {currentBackdrop && (
          <motion.img
            key={currentBackdrop}
            src={currentBackdrop}
            srcSet={heroSrcSet(currentBackdrop)}
            sizes="100vw"
            alt=""
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1.08 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{
              opacity: { duration: 1.8, ease: 'easeInOut' },
              scale: { duration: CYCLE_MS / 1000 + 3, ease: 'linear' },
            }}
            className="hero-bg-img absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>

      {/* Grain subtil pour la texture */}
      <div className="hero-stage-grain absolute inset-0 mix-blend-overlay opacity-25" />

      {/* Fade bas : transition douce de l'image vers le bg de la page sur 60%
          de la hauteur. C'est ce qui evite l'effet "boite". */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-b from-transparent via-[var(--bg)]/60 to-[var(--bg)]" />

      {/* Fade lateral : les bords gauche/droit fondent dans le bg pour eviter
          un cadre rectangulaire net. */}
      <div className="absolute inset-y-0 left-0 w-12 sm:w-32 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/40 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-12 sm:w-32 bg-gradient-to-l from-[var(--bg)] via-[var(--bg)]/40 to-transparent" />

      {/* Fade haut : tres leger pour assombrir un poil derriere la navbar et
          assurer la lisibilite des icones. */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--bg)]/30 to-transparent" />
    </div>
  );
}
