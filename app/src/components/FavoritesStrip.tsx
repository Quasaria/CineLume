import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Star, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { getCinemaWeeksOfMonth, formatDateISO } from '@/lib/cinema-week';
import { fmtDateLocalized } from '@/lib/utils';
import type { FavoriteMovie } from '@/types/movie';

/**
 * Section qui met en avant les favoris dont la date de sortie tombe dans
 * la semaine actuellement selectionnee.
 *
 * Layout unifie : stack vertical de cartes 'featured', meme presentation
 * que tu en ais 1 ou 10. Chaque carte = poster a gauche + info a droite
 * (countdown, titre, date, note, synopsis en desktop, CTA).
 *
 * Mobile : pas de synopsis (manque de place), reste compact poster + titre
 * + date/note + CTA.
 */

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function daysUntil(dateStr: string | null | undefined): number | null {
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownLabel(
  days: number | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (days === null) return null;
  if (days < 0) return null;
  if (days === 0) return t('favorites.countdownToday');
  if (days === 1) return t('favorites.countdownTomorrow');
  return t('favorites.countdownDays', { count: days });
}

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
      className="favorites-strip mb-6"
      aria-label={t('favorites.stripAria')}
    >
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4 fill-red-500 text-red-500 shrink-0" aria-hidden="true" />
        <h2 className="font-bold text-sm tracking-wide uppercase text-violet-300">
          {t('favorites.stripTitle')}
        </h2>
        <span className="text-xs text-white/50 font-medium">
          · {t('favorites.stripCount', { count: matching.length })}
        </span>
      </div>

      <div className="space-y-3">
        {matching.map((fav, i) => (
          <FeaturedCard
            key={fav.id}
            fav={fav}
            index={i}
            onOpen={() => openModal(fav.id)}
            t={t}
          />
        ))}
      </div>
    </motion.section>
  );
}

interface FeaturedCardProps {
  fav: FavoriteMovie;
  index: number;
  onOpen: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function FeaturedCard({ fav, index, onOpen, t }: FeaturedCardProps) {
  const fmtDateLong = (d?: string) => fmtDateLocalized(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const days = daysUntil(fav.release_date);
  const countdown = countdownLabel(days, t);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      aria-label={t('favorites.viewFavorite', { title: fav.title })}
      className="favorites-featured w-full flex items-stretch gap-3 sm:gap-5 p-3 sm:p-4 rounded-2xl text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
    >
      {/* Poster a gauche */}
      <div className="w-[88px] sm:w-[112px] aspect-[2/3] rounded-xl overflow-hidden bg-[#13131a] shrink-0 shadow-xl shadow-black/40 ring-1 ring-white/10">
        {fav.poster_path ? (
          <img
            src={`${IMG}${fav.poster_path}`}
            srcSet={posterSrcSet(fav.poster_path)}
            sizes="112px"
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-2xl">?</div>
        )}
      </div>

      {/* Info a droite : utilise tout l'espace dispo */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1 gap-2">
        <div className="min-w-0">
          {countdown && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-200 text-[11px] font-bold uppercase tracking-wider border border-violet-500/40 mb-1.5">
              {countdown}
            </span>
          )}
          <h3 className="favorites-featured-title font-bold text-base sm:text-xl leading-tight line-clamp-2 mb-1">
            {fav.title}
          </h3>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white/60 mb-2">
            <span>{fmtDateLong(fav.release_date)}</span>
            {fav.vote_average > 0 && (
              <>
                <span className="text-white/30">·</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" aria-hidden="true" />
                  <span className="font-bold text-amber-400">{fav.vote_average.toFixed(1)}</span>
                </span>
              </>
            )}
          </div>
          {/* Synopsis visible UNIQUEMENT en desktop : sur mobile la place
              manque, on garde compact. Si pas d'overview (favoris pre-
              migration), on n'affiche rien. */}
          {fav.overview && (
            <p className="favorites-featured-overview hidden sm:block text-sm text-white/55 line-clamp-2 leading-snug">
              {fav.overview}
            </p>
          )}
        </div>

        <span className="self-start inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 group-hover:from-violet-500 group-hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-violet-500/30 transition-all">
          {t('favorites.openDetails')}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </span>
      </div>
    </motion.button>
  );
}
