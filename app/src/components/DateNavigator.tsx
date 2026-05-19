import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getCinemaWeeksOfMonth } from '@/lib/cinema-week';

export function DateNavigator() {
  const { t } = useTranslation();
  const MONTHS = t('dateNav.months', { returnObjects: true }) as string[];
  const MONTHS_FULL = t('dateNav.monthsFull', { returnObjects: true }) as string[];
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

  const canPrevMonth = !(selYear === MIN_YEAR && selMonth === 0);
  const canNextMonth = !(selYear === MAX_YEAR && selMonth === 11);

  const goPrevMonth = () => {
    if (selMonth > 0) {
      setDate(selYear, selMonth - 1, 1);
    } else if (selYear > MIN_YEAR) {
      setDate(selYear - 1, 11, 1);
    }
  };

  const goNextMonth = () => {
    if (selMonth < 11) {
      setDate(selYear, selMonth + 1, 1);
    } else if (selYear < MAX_YEAR) {
      setDate(selYear + 1, 0, 1);
    }
  };

  return (
    <div
      className="sticky z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6 nav-feather"
      style={{
        top: 'calc(4rem + env(safe-area-inset-top))',
        backgroundColor: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      {/* MOBILE : option B simple. Ligne 1 = chevrons + Mois Annee + actions.
          Ligne 2 = semaines toujours visibles, distribuees sur toute la largeur. */}
      <div className="sm:hidden">
        <div className="flex items-center gap-1 mb-2">
          <motion.button
            type="button"
            aria-label={t('dateNav.prevMonth')}
            whileTap={{ scale: 0.9 }}
            onClick={goPrevMonth}
            disabled={!canPrevMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors min-w-10 min-h-10 flex items-center justify-center disabled:opacity-25"
          >
            <ChevronLeft className="w-4 h-4 text-white/80" aria-hidden="true" />
          </motion.button>

          <span className="px-2 font-bold text-base tabular-nums select-none flex-1 text-center" aria-live="polite">
            {MONTHS_FULL[selMonth]} {selYear}
          </span>

          <motion.button
            type="button"
            aria-label={t('dateNav.nextMonth')}
            whileTap={{ scale: 0.9 }}
            onClick={goNextMonth}
            disabled={!canNextMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors min-w-10 min-h-10 flex items-center justify-center disabled:opacity-25"
          >
            <ChevronRight className="w-4 h-4 text-white/80" aria-hidden="true" />
          </motion.button>

          <div className="ml-1 flex items-center gap-1.5 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={openFilters}
              aria-label={t('grid.filters')}
              className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-colors border border-white/10 flex items-center min-w-10 min-h-10 justify-center"
            >
              <Filter className="w-4 h-4" aria-hidden="true" />
              {hasActiveFilter && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-500" aria-hidden="true" />
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={jumpToToday}
              aria-label={t('common.today')}
              className="p-2 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 active:bg-violet-500/25 transition-colors border border-violet-500/30 flex items-center min-w-10 min-h-10 justify-center"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {weeks > 0 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
              <motion.button
                key={w}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDate(selYear, selMonth, w)}
                className={`flex-1 px-2 py-2 rounded-lg text-sm font-semibold transition-all min-h-10 ${
                  w === selWeek
                    ? 'bg-violet-500/25 text-white border border-violet-500/50 shadow-md shadow-violet-500/20'
                    : 'bg-white/[0.04] text-white/70 border border-white/[0.08] hover:text-white hover:bg-white/[0.07] active:bg-white/10'
                }`}
              >
                S{w}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP : layout inline complet avec annee nav, mois scrollables,
          semaines scrollables, actions a droite. */}
      <div className="hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <motion.button
            type="button"
            aria-label={t('dateNav.prevYear')}
            whileTap={{ scale: 0.9 }}
            onClick={() => selYear > MIN_YEAR && setDate(selYear - 1, selMonth, 1)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors min-w-11 min-h-11 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-white/70" aria-hidden="true" />
          </motion.button>

          <span className="font-bold text-lg tabular-nums w-12 text-center" aria-live="polite">
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

        {/* Mois : scrollable horizontalement si pas assez de place. flex-1
            min-w-0 permet au container de se compresser au lieu de pousser
            les semaines hors champ. */}
        <div className="flex-1 min-w-0 flex items-center gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="w-px h-7 bg-gradient-to-b from-transparent via-white/25 to-transparent shrink-0" />
          <div className="flex gap-1 shrink-0 snap-x items-center">
            {MONTHS.map((m, i) => (
              <motion.button
                key={i}
                ref={i === selMonth ? activeMonthRef : undefined}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDate(selYear, i, 1)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap snap-center ${
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

        {/* Semaines : zone fixe shrink-0 a droite des mois, TOUJOURS visible
            (avant les actions). Ne se fait plus pousser hors champ par les
            boutons filtres/aujourd'hui. */}
        {weeks > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-px h-7 bg-gradient-to-b from-transparent via-white/25 to-transparent" />
            <div className="flex gap-1 items-center">
              {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
                <motion.button
                  key={w}
                  ref={w === selWeek ? activeWeekRef : undefined}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDate(selYear, selMonth, w)}
                  className={`px-3 lg:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    w === selWeek
                      ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
                      : 'text-white/65 hover:text-white hover:bg-white/5 active:bg-white/10'
                  }`}
                >
                  S{w}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={openFilters}
            aria-label={t('grid.filters')}
            className="relative px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white text-sm font-semibold transition-colors border border-white/10 flex items-center gap-1.5 min-h-11"
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('grid.filters')}</span>
            {hasActiveFilter && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" aria-hidden="true" />
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={jumpToToday}
            className="px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 text-sm font-semibold hover:bg-violet-500/20 active:bg-violet-500/25 transition-colors border border-violet-500/30 flex items-center gap-1.5 min-h-11"
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('common.today')}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
