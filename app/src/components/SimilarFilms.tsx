import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getSimilarMovies, IMG, posterSrcSet } from '@/lib/tmdb';
import { useAppStore } from '@/store/appStore';

interface SimilarFilmsProps {
  movieId: number;
}

/**
 * Section "Films similaires" dans la modale : 6 affiches en grille
 * cliquables qui re-ouvrent la modale du film selectionne. Utilise
 * TMDB /movie/{id}/recommendations qui est generalement plus pertinent
 * que /similar.
 */
export function SimilarFilms({ movieId }: SimilarFilmsProps) {
  const { t } = useTranslation();
  const openModal = useAppStore((s) => s.openModal);

  const { data, isLoading } = useQuery({
    queryKey: ['similar', movieId],
    queryFn: ({ signal }) => getSimilarMovies(movieId, signal),
    staleTime: 1000 * 60 * 60 * 6, // 6h
  });

  if (isLoading) return null;
  const films = (data?.results || []).filter((f) => !!f.poster_path).slice(0, 6);
  if (films.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="font-bold text-white text-sm sm:text-base mb-3">{t('modal.similarFilms')}</h3>
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
    </section>
  );
}
