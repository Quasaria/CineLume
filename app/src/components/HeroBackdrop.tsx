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
      className="absolute top-0 left-0 right-0 h-[340px] sm:h-[600px] overflow-hidden pointer-events-none"
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
            className="hero-bg-img hero-mask absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>

      {/* Grain : meme masque pour la coherence */}
      <div className="hero-stage-grain hero-mask absolute inset-0 mix-blend-overlay opacity-25 pointer-events-none" />

      {/* Darkening interne au blob : sur la portion basse (40% -> 100%) on
          ajoute un linear-gradient, MASQUE par le meme mask radial.
          Resultat : la zone d'overlay epouse la forme du blob, jamais de
          bord rectangulaire visible. La couleur du gradient s'adapte au
          theme (sombre en dark, lavende en light) via .hero-darkening. */}
      <div className="hero-mask hero-darkening absolute inset-0 pointer-events-none" />
    </div>
  );
}
