import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Star, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { getCinemaWeeksOfMonth, formatDateISO } from '@/lib/cinema-week';
import { fmtDateLocalized } from '@/lib/utils';
import type { FavoriteMovie } from '@/types/movie';

/**
 * Section qui met en avant les favoris dont la date de sortie tombe dans
 * la semaine actuellement selectionnee. N'apparait que si au moins un match.
 *
 * Deux layouts selon le nombre :
 * - 1 favori = carte "featured" horizontale (poster a gauche + info a
 *   droite), evite le sentiment "carte orpheline alignee a gauche".
 * - 2+ favoris = scroll horizontal de cartes posters, comme une mini
 *   collection.
 *
 * La section est containerisee dans un degrade subtil violet/cyan pour
 * la demarquer de la grille principale en dessous.
 */
export function FavoritesStrip() {
  const { t } = useTranslation();
  const favorites = useAppStore((s) => s.favorites);
  const openModal = useAppStore((s) => s.openModal);
  const selYear = useAppStore((s) => s.selYear);
  const selMonth = useAppStore((s) => s.selMonth);
  const selWeek = useAppStore((s) => s.selWeek);
  const selRegion = useAppStore((s) => s.selRegion);

  const matching = useMemo(() => {
    const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion);
    if (weeks.length === 0) return [];
    const wIdx = Math.min(Math.max(selWeek - 1, 0), Math.max(weeks.length - 1, 0));
    const w = weeks[wIdx];
    if (!w) return [];
    const startStr = formatDateISO(w.start);
    const endStr = formatDateISO(w.end);
    return favorites
      .filter((f) => f.release_date && f.release_date >= startStr && f.release_date <= endStr)
      .sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
  }, [favorites, selYear, selMonth, selWeek, selRegion]);

  if (matching.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 rounded-3xl overflow-hidden relative"
      aria-label={t('favorites.stripAria')}
    >
      {/* Fond degrade violet/cyan subtil pour demarquer la section */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, rgba(124, 58, 237, 0.10) 0%, rgba(34, 211, 238, 0.04) 60%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 border border-violet-500/20 rounded-3xl pointer-events-none"
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 sm:w-4 sm:h-4 fill-red-500 text-red-500" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base sm:text-lg leading-tight text-white">
              {t('favorites.stripTitle')}
            </h2>
            <p className="text-xs text-white/55 leading-tight mt-0.5">
              {t('favorites.stripCount', { count: matching.length })}
            </p>
          </div>
        </div>

        {matching.length === 1 ? (
          <FeaturedCard fav={matching[0]} onOpen={() => openModal(matching[0].id)} t={t} />
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 snap-x pb-1">
            {matching.map((f, i) => (
              <PosterCard
                key={f.id}
                fav={f}
                index={i}
                onOpen={() => openModal(f.id)}
                ariaLabel={t('favorites.viewFavorite', { title: f.title })}
              />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

interface FeaturedCardProps {
  fav: FavoriteMovie;
  onOpen: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function FeaturedCard({ fav, onOpen, t }: FeaturedCardProps) {
  const fmtDateLong = (d?: string) => fmtDateLocalized(d, { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      aria-label={t('favorites.viewFavorite', { title: fav.title })}
      className="w-full flex items-stretch gap-3 sm:gap-4 p-2 sm:p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.09] border border-white/[0.06] hover:border-violet-500/40 transition-all text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
    >
      <div className="w-[90px] sm:w-[110px] aspect-[2/3] rounded-xl overflow-hidden bg-[#13131a] shrink-0 shadow-lg shadow-black/40">
        {fav.poster_path ? (
          <img
            src={`${IMG}${fav.poster_path}`}
            srcSet={posterSrcSet(fav.poster_path)}
            sizes="110px"
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-2xl">?</div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
        <h3 className="font-bold text-base sm:text-lg leading-tight text-white line-clamp-2 group-hover:text-violet-200 transition-colors">
          {fav.title}
        </h3>
        <p className="text-violet-300 text-sm font-semibold mt-1">{fmtDateLong(fav.release_date)}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-white/55">
          {fav.vote_average > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span className="font-bold text-amber-400">{fav.vote_average.toFixed(1)}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-violet-300 font-semibold group-hover:gap-2 transition-all">
            {t('favorites.openDetails')}
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

interface PosterCardProps {
  fav: FavoriteMovie;
  index: number;
  onOpen: () => void;
  ariaLabel: string;
}

function PosterCard({ fav, index, onOpen, ariaLabel }: PosterCardProps) {
  const fmtDateShort = (d?: string) => fmtDateLocalized(d, { day: 'numeric', month: 'short' });
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.25), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      aria-label={ariaLabel}
      className="shrink-0 snap-start relative w-[120px] sm:w-[140px] aspect-[2/3] rounded-2xl overflow-hidden border border-violet-500/30 bg-[#13131a] hover:border-violet-500/70 transition-all shadow-md shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
    >
      {fav.poster_path ? (
        <img
          src={`${IMG}${fav.poster_path}`}
          srcSet={posterSrcSet(fav.poster_path)}
          sizes="140px"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04] text-white/30 text-xl">?</div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-violet-500/90 backdrop-blur-sm flex items-center justify-center shadow-md">
        <Heart className="w-3 h-3 fill-white text-white" aria-hidden="true" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="text-white text-[12px] font-bold leading-tight line-clamp-2 mb-0.5 text-left">{fav.title}</p>
        <p className="text-violet-200 text-[10px] font-semibold">{fmtDateShort(fav.release_date)}</p>
      </div>
    </motion.button>
  );
}
