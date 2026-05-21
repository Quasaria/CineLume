import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getSimilarMovies, IMG, posterSrcSet } from '@/lib/tmdb';
import { useAppStore } from '@/store/appStore';

interface SimilarFilmsProps {
  movieId: number;
}

/**
 * Section "Films similaires" dans la modale : 6 affiches en grille
 * cliquables, retractable derriere un bouton collapsible. Par defaut
 * replie pour ne pas surcharger visuellement la modale (l'user
 * deplie quand il en a besoin).
 */
export function SimilarFilms({ movieId }: SimilarFilmsProps) {
  const { t } = useTranslation();
  const openModal = useAppStore((s) => s.openModal);
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['similar', movieId],
    queryFn: ({ signal }) => getSimilarMovies(movieId, signal),
    enabled: expanded, // ne fetch que quand on ouvre la section
    staleTime: 1000 * 60 * 60 * 6, // 6h
  });

  const films = (data?.results || []).filter((f) => !!f.poster_path).slice(0, 6);

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="similar-films-content"
        className="w-full flex items-center justify-between gap-2 py-2 px-3 -mx-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors group"
      >
        <h3 className="font-bold text-white text-sm sm:text-base">{t('modal.similarFilms')}</h3>
        <ChevronDown
          className={`w-5 h-5 text-white/60 group-hover:text-white shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="similar-films-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {isLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] rounded-xl bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : films.length === 0 ? (
                <p className="text-sm text-white/50 italic">{t('modal.noSimilar')}</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {films.map((f, i) => (
                    <motion.button
                      key={f.id}
                      type="button"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.3 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => openModal(f.id)}
                      aria-label={f.title}
                      className="aspect-[2/3] rounded-xl overflow-hidden bg-[#13131a] border border-white/[0.06] hover:border-violet-500/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] group"
                    >
                      <img
                        src={`${IMG}${f.poster_path}`}
                        srcSet={posterSrcSet(f.poster_path)}
                        sizes="(max-width: 640px) 30vw, 120px"
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
