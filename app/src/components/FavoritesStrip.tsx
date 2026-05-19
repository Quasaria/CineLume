import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { getCinemaWeeksOfMonth, formatDateISO } from '@/lib/cinema-week';
import { fmtDateLocalized } from '@/lib/utils';

/**
 * Strip horizontal des favoris dont la date de sortie tombe dans la semaine
 * actuellement selectionnee. N'apparait que si au moins un favori match.
 * Sert a creer un sentiment "l'app me connait" sans dupliquer la grille
 * (le film est aussi present plus bas, mais ici il est mis en avant pour
 * souligner que l'user l'a like).
 */
export function FavoritesStrip() {
  const { t } = useTranslation();
  const favorites = useAppStore((s) => s.favorites);
  const openModal = useAppStore((s) => s.openModal);
  const selYear = useAppStore((s) => s.selYear);
  const selMonth = useAppStore((s) => s.selMonth);
  const selWeek = useAppStore((s) => s.selWeek);
  const selRegion = useAppStore((s) => s.selRegion);

  const fmtDate = (d?: string) => fmtDateLocalized(d, { day: 'numeric', month: 'short' });

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
      className="mb-6"
      aria-label={t('favorites.stripAria')}
    >
      <h2 className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-violet-300 uppercase tracking-wider mb-3">
        <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" aria-hidden="true" />
        {t('favorites.stripTitle')}
        <span className="text-white/40 normal-case tracking-normal font-medium">({matching.length})</span>
      </h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 snap-x">
        {matching.map((f, i) => (
          <motion.button
            key={f.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openModal(f.id)}
            aria-label={t('favorites.viewFavorite', { title: f.title })}
            className="shrink-0 snap-start relative w-[112px] sm:w-[124px] aspect-[2/3] rounded-2xl overflow-hidden border-2 border-violet-500/40 bg-[#13131a] shadow-lg shadow-violet-500/20 hover:border-violet-500/70 hover:shadow-violet-500/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            {f.poster_path ? (
              <img
                src={`${IMG}${f.poster_path}`}
                srcSet={posterSrcSet(f.poster_path)}
                sizes="124px"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04] text-white/30 text-xl">?</div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-violet-500/85 backdrop-blur-sm flex items-center justify-center shadow-md">
              <Heart className="w-3 h-3 fill-white text-white" aria-hidden="true" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-white text-[12px] font-bold leading-tight line-clamp-2 mb-0.5 text-left">{f.title}</p>
              <p className="text-violet-200/90 text-[10px] font-medium">{fmtDate(f.release_date)}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
