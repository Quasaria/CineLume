import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getCinemaWeeksOfMonth } from '@/lib/cinema-week';

export function DateNavigator() {
  const { t } = useTranslation();
  const MONTHS = t('dateNav.months', { returnObjects: true }) as string[];
  const { selYear, selMonth, selWeek, selRegion, setDate, jumpToToday } = useAppStore();
  const now = new Date();
  const MIN_YEAR = now.getFullYear() - 1;
  const MAX_YEAR = now.getFullYear() + 2;

  const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion).length;

  useEffect(() => {
    if (weeks > 0 && selWeek > weeks) {
      setDate(selYear, selMonth, weeks);
    }
  }, [weeks, selWeek, selYear, selMonth, setDate]);

  return (
    <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6 bg-[var(--bg)]/85 backdrop-blur-lg border-b border-white/[0.06]">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
      <motion.button
        type="button"
        aria-label={t('dateNav.prevYear')}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => selYear > MIN_YEAR && setDate(selYear - 1, selMonth, 1)}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors shrink-0"
      >
        <ChevronLeft className="w-4 h-4 text-white/70" aria-hidden="true" />
      </motion.button>

      <span className="font-bold text-lg tabular-nums w-12 text-center shrink-0" aria-live="polite">
        {selYear}
      </span>

      <motion.button
        type="button"
        aria-label={t('dateNav.nextYear')}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => selYear < MAX_YEAR && setDate(selYear + 1, selMonth, 1)}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors shrink-0"
      >
        <ChevronRight className="w-4 h-4 text-white/70" aria-hidden="true" />
      </motion.button>

      <div className="w-px h-7 bg-gradient-to-b from-transparent via-white/25 to-transparent mx-2 shrink-0" />

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {MONTHS.map((m, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDate(selYear, i, 1)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              i === selMonth
                ? 'bg-white text-black'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {m}
          </motion.button>
        ))}
      </div>

      <div className="w-px h-7 bg-gradient-to-b from-transparent via-white/25 to-transparent mx-2 shrink-0" />

      <div className="flex gap-1">
        {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
          <motion.button
            key={w}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDate(selYear, selMonth, w)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              w === selWeek
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            S{w}
          </motion.button>
        ))}
      </div>

      <div className="w-px h-7 bg-gradient-to-b from-transparent via-white/25 to-transparent mx-2 shrink-0" />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={jumpToToday}
        className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 transition-colors border border-violet-500/20 flex items-center gap-1.5"
      >
        <Calendar className="w-3 h-3" aria-hidden="true" />
        {t('common.today')}
      </motion.button>
      </div>
    </div>
  );
}
