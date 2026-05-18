import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getCinemaWeeksOfMonth } from '@/lib/cinema-week';

export function DateNavigator() {
  const { t } = useTranslation();
  const MONTHS = t('dateNav.months', { returnObjects: true }) as string[];
  const {
    selYear, selMonth, selWeek, selRegion, setDate, jumpToToday,
    openFilters, selGenre, selReleaseMode, selProvider, selectedPerson,
  } = useAppStore();
  const now = new Date();
  const MIN_YEAR = now.getFullYear() - 1;
  const MAX_YEAR = now.getFullYear() + 2;

  const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion).length;
  const hasActiveFilter = selRegion !== 'FR' || !!selGenre || selReleaseMode !== 'theater' || !!selProvider || !!selectedPerson;

  const activeMonthRef = useRef<HTMLButtonElement>(null);
  const activeWeekRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (weeks > 0 && selWeek > weeks) {
      setDate(selYear, selMonth, weeks);
    }
  }, [weeks, selWeek, selYear, selMonth, setDate]);

  useEffect(() => {
    activeMonthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selMonth, selYear]);

  useEffect(() => {
    activeWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selWeek]);

  return (
    <div
      className="sticky z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 sm:py-3 mb-6 bg-[var(--bg)]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/20"
      style={{ top: 'calc(4rem + env(safe-area-inset-top))' }}
    >
      {/* Mobile : 3 lignes (annee+actions, mois, semaines).
          Desktop : 1 ligne avec tout. */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
        {/* Annee (ligne 1 a gauche) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <motion.button
            type="button"
            aria-label={t('dateNav.prevYear')}
            whileTap={{ scale: 0.9 }}
            onClick={() => selYear > MIN_YEAR && setDate(selYear - 1, selMonth, 1)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors min-w-11 min-h-11 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-white/70" aria-hidden="true" />
          </motion.button>

          <span className="font-bold text-base sm:text-lg tabular-nums w-11 sm:w-12 text-center" aria-live="polite">
            {selYear}
          </span>

          <motion.button
            type="button"
            aria-label={t('dateNav.nextYear')}
            whileTap={{ scale: 0.9 }}
            onClick={() => selYear < MAX_YEAR && setDate(selYear + 1, selMonth, 1)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors min-w-11 min-h-11 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-white/70" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Actions (ligne 1 a droite mobile, tout a droite desktop) */}
        <div className="ml-auto flex items-center gap-2 shrink-0 sm:order-last">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={openFilters}
            aria-label={t('grid.filters')}
            className="relative px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-colors border border-white/10 flex items-center gap-1.5 min-w-11 min-h-11"
          >
            <Filter className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('grid.filters')}</span>
            {hasActiveFilter && (
              <span className="absolute sm:relative top-1.5 right-1.5 sm:top-auto sm:right-auto w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full bg-violet-500" aria-hidden="true" />
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={jumpToToday}
            className="px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 text-xs sm:text-sm font-semibold hover:bg-violet-500/20 active:bg-violet-500/25 transition-colors border border-violet-500/30 flex items-center gap-1.5 min-w-11 min-h-11"
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('common.today')}</span>
          </motion.button>
        </div>

        {/* Mois (ligne 2 sur mobile, inline desktop avec divider) */}
        <div className="w-full sm:w-auto sm:flex-1 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:order-2">
          <div className="hidden sm:block w-px h-7 bg-gradient-to-b from-transparent via-white/25 to-transparent shrink-0" />
          <div className="flex gap-1 shrink-0 snap-x">
            {MONTHS.map((m, i) => (
              <motion.button
                key={i}
                ref={i === selMonth ? activeMonthRef : undefined}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDate(selYear, i, 1)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-10 snap-center ${
                  i === selMonth
                    ? 'bg-white text-black shadow-md'
                    : 'text-white/75 hover:text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                {m}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Semaines (ligne 3 sur mobile, inline desktop avec divider) */}
        <div className="w-full sm:w-auto flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:order-3">
          <div className="hidden sm:block w-px h-7 bg-gradient-to-b from-transparent via-white/25 to-transparent shrink-0" />
          <div className="flex gap-1 shrink-0 snap-x">
            {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
              <motion.button
                key={w}
                ref={w === selWeek ? activeWeekRef : undefined}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDate(selYear, selMonth, w)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-10 snap-center ${
                  w === selWeek
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/75 hover:text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                S{w}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
