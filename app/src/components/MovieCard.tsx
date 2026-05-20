import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Heart, Star } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import type { Movie } from '@/types/movie';

interface MovieCardProps {
  movie: Movie;
  index: number;
  viewMode: 'grid' | 'list';
}

export function MovieCard({ movie, index, viewMode }: MovieCardProps) {
  const { t } = useTranslation();
  const { isFav, toggleFav, openModal } = useAppStore();
  const fav = isFav(movie.id);
  const fmtDate = (d?: string) => fmtDateLocalized(d);

  if (viewMode === 'list') {
    return (
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`${movie.title}, ${fmtDate(movie.release_date)}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer group active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        onClick={() => openModal(movie.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(movie.id);
          }
        }}
      >
        <div className="w-20 h-28 rounded-xl overflow-hidden bg-white/5 shrink-0 relative">
          <img
            src={`${IMG}${movie.poster_path}`}
            srcSet={posterSrcSet(movie.poster_path)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0 py-1">
          <h3 className="text-white font-bold text-base mb-1 truncate group-hover:text-violet-300 transition-colors">
            {movie.title}
          </h3>
          <p className="text-white/70 text-xs font-medium mb-2">{fmtDate(movie.release_date)}</p>
          <div className="flex items-center gap-2">
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={fav ? t('favorites.remove', { title: movie.title }) : t('favorites.addToFav', { title: movie.title })}
          aria-pressed={fav}
          onClick={(e) => {
            e.stopPropagation();
            toggleFav({
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path,
              release_date: movie.release_date,
              vote_average: movie.vote_average,
              overview: movie.overview,
              genre_ids: movie.genre_ids,
            });
          }}
          className={`min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/15 transition-all self-center shrink-0 ${
            fav ? 'text-red-500' : 'text-white/60'
          }`}
        >
          <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      layout
      className="movie-card"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${movie.title}, ${fmtDate(movie.release_date)}`}
        className="relative rounded-2xl overflow-hidden bg-[#13131a] border border-white/[0.06] cursor-pointer group aspect-[2/3] movie-card-inner transition-transform duration-150 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        onClick={() => openModal(movie.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(movie.id);
          }
        }}
      >
        <motion.button
          type="button"
          aria-label={fav ? t('favorites.remove', { title: movie.title }) : t('favorites.addToFav', { title: movie.title })}
          aria-pressed={fav}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFav({
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path,
              release_date: movie.release_date,
              vote_average: movie.vote_average,
              overview: movie.overview,
              genre_ids: movie.genre_ids,
            });
          }}
          className={`absolute top-2 left-2 z-20 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/65 active:bg-black/80 transition-all ${
            fav ? 'text-red-500' : 'text-white/90'
          }`}
        >
          <Heart className={`w-[18px] h-[18px] ${fav ? 'fill-current' : ''}`} aria-hidden="true" />
        </motion.button>

        {movie.vote_average > 0 && (
          <div className="absolute top-2 right-2 z-20 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" aria-hidden="true" />
            <span className="text-amber-400 text-xs font-bold">{movie.vote_average.toFixed(1)}</span>
          </div>
        )}

        <img
          src={`${IMG}${movie.poster_path}`}
          srcSet={posterSrcSet(movie.poster_path)}
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />

        {/* Bottom info bar : titre + date toujours visibles. Sur hover (desktop),
            on revele aussi un extrait du synopsis qui slide-up depuis le bas. */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="text-white font-bold text-base sm:text-[15px] leading-tight mb-1 line-clamp-2 group-hover:text-violet-300 transition-colors">
            {movie.title}
          </h3>
          <p className="text-white/70 text-xs font-medium">{fmtDate(movie.release_date)}</p>
          {movie.overview && (
            <p className="text-white/65 text-[11px] leading-snug line-clamp-3 mt-1.5 max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 group-focus-within:max-h-20 group-focus-within:opacity-100 transition-all duration-300 overflow-hidden">
              {movie.overview}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
