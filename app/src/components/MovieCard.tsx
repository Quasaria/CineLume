import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Heart, Star } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import type { Movie } from '@/types/movie';

interface MovieCardProps {
  movie: Movie;
  index: number;
  viewMode: 'grid' | 'list';
}

export function MovieCard({ movie, index, viewMode }: MovieCardProps) {
  const { t, i18n } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _lang = i18n.language; // re-render quand la langue change
  const { isFav, toggleFav, openModal } = useAppStore();
  const fav = isFav(movie.id);
  const fmtDate = (d?: string) => fmtDateLocalized(d);

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer group"
        onClick={() => openModal(movie.id)}
      >
        <div className="w-20 h-28 rounded-xl overflow-hidden bg-white/5 shrink-0 relative">
          <img
            src={`${IMG}${movie.poster_path}`}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0 py-1">
          <h3 className="text-white font-bold text-base mb-1 truncate group-hover:text-violet-300 transition-colors">
            {movie.title}
          </h3>
          <p className="text-white/40 text-xs font-medium mb-2">{fmtDate(movie.release_date)}</p>
          <div className="flex items-center gap-2">
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                <Star className="w-3 h-3 fill-amber-400" />
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
            });
          }}
          className={`p-2 rounded-full hover:bg-white/10 transition-all self-center shrink-0 ${
            fav ? 'text-red-500' : 'text-white/50'
          }`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} aria-hidden="true" />
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
        className="relative rounded-2xl overflow-hidden bg-[#13131a] border border-white/[0.06] cursor-pointer group aspect-[2/3] movie-card-inner"
        onClick={() => openModal(movie.id)}
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
            });
          }}
          className={`absolute top-2 left-2 z-20 p-2.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all ${
            fav ? 'text-red-500' : 'text-white/80'
          }`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} aria-hidden="true" />
        </motion.button>

        {movie.vote_average > 0 && (
          <div className="absolute top-2.5 right-2.5 z-20 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-amber-400 text-xs font-bold">{movie.vote_average.toFixed(1)}</span>
          </div>
        )}

        <img
          src={`${IMG}${movie.poster_path}`}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="text-white font-bold text-sm sm:text-base leading-tight mb-0.5 line-clamp-2 group-hover:text-violet-300 transition-colors">
            {movie.title}
          </h3>
          <p className="text-white/40 text-[10px] sm:text-xs font-medium">{fmtDate(movie.release_date)}</p>
        </div>
      </div>
    </motion.div>
  );
}
