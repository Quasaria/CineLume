import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar, Filter, ChevronDown } from 'lucide-react';
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
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion).length;
  const hasActiveFilter = selRegion !== 'FR' || !!selGenre || selReleaseMode !== 'theater' || !!selProvider || !!selectedPerson;

  const activeMonthRef = useRef<HTMLButtonElement>(null);
  const activeWeekRef = useRef<HTMLButtonElement>(null);
  // Skip le scrollIntoView au premier mount : sinon on declenche un scroll
  // smooth de la page entiere des le load alors que l'user n'a rien fait.
  const monthFirstMountRef = useRef(true);
  const weekFirstMountRef = useRef(true);

  // Popover mois/annee sur mobile : tap sur le nom du mois ouvre une grille
  // de 12 mois + chevrons d'annee. Permet d'aller a n'importe quel mois en
  // 1-2 taps au lieu d'enchainer les chevrons.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selYear);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (weeks > 0 && selWeek > weeks) {
      setDate(selYear, selMonth, weeks);
    }
  }, [weeks, selWeek, selYear, selMonth, setDate]);

  useEffect(() => {
    if (monthFirstMountRef.current) {
      monthFirstMountRef.current = false;
      return;
    }
    activeMonthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selMonth, selYear]);

  useEffect(() => {
    if (weekFirstMountRef.current) {
      weekFirstMountRef.current = false;
      return;
    }
    activeWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selWeek]);

  // Synchronise l'annee du picker avec la selection courante quand on
  // l'ouvre (pas pendant qu'on navigue dans le picker, sinon impossible
  // de changer d'annee).
  useEffect(() => {
    if (pickerOpen) setPickerYear(selYear);
  }, [pickerOpen, selYear]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

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
        // 96% au lieu de 92% : sans ca, sur un backdrop hero bien colore
        // (carte meteo rouge/vert par exemple), les couleurs traversaient
        // le blur et le saturate(140%) les amplifiait, rendant les boutons
        // illisibles. On enleve aussi le saturate qui exagerait ce probleme.
        backgroundColor: 'color-mix(in srgb, var(--bg) 96%, transparent)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* MOBILE + TABLETTE PORTRAIT (< md:768) : option B compacte.
          Ligne 1 = chevrons + Mois Annee tappable + actions. Ligne 2 =
          semaines. Tap sur le nom du mois ouvre un picker grille 12 mois
          avec navigation d'annee, pour aller a n'importe quel mois en
          1-2 taps. */}
      <div className="md:hidden">
        <div className="flex items-center gap-1 mb-2">
          <motion.button
            type="button"
            aria-label={t('dateNav.prevMonth')}
            whileTap={{ scale: 0.9 }}
            onClick={goPrevMonth}
            disabled={!canPrevMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors min-w-11 min-h-11 flex items-center justify-center disabled:opacity-25"
          >
            <ChevronLeft className="w-4 h-4 text-white/80" aria-hidden="true" />
          </motion.button>

          {/* Trigger du picker : occupe le flex-1, ressemble a un bouton
              chip pour signaler qu'il est interactif. */}
          <div ref={pickerRef} className="relative flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              aria-label={`${MONTHS_FULL[selMonth]} ${selYear}`}
              className={`min-h-11 px-3 inline-flex items-center gap-1.5 rounded-xl font-bold text-base tabular-nums transition-colors ${
                pickerOpen
                  ? 'bg-white/10 text-white'
                  : 'text-white hover:bg-white/5 active:bg-white/10'
              }`}
            >
              <span>{MONTHS_FULL[selMonth]} {selYear}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/55 transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  role="dialog"
                  aria-label={t('common.today')}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40 rounded-2xl border border-white/10 shadow-2xl shadow-black/40 p-3"
                  style={{
                    // Sur les screens <320px, clamp pour ne pas overflow.
                    width: 'min(280px, calc(100vw - 32px))',
                    backgroundColor: 'color-mix(in srgb, var(--surface) 98%, transparent)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  }}
                >
                  {/* Nav annee */}
                  <div className="flex items-center justify-between mb-2.5">
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => Math.max(MIN_YEAR, y - 1))}
                      disabled={pickerYear <= MIN_YEAR}
                      aria-label={t('dateNav.prevYear')}
                      className="min-w-9 min-h-9 flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 text-white/75 disabled:opacity-25"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span className="font-bold text-base tabular-nums text-white" aria-live="polite">{pickerYear}</span>
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => Math.min(MAX_YEAR, y + 1))}
                      disabled={pickerYear >= MAX_YEAR}
                      aria-label={t('dateNav.nextYear')}
                      className="min-w-9 min-h-9 flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 text-white/75 disabled:opacity-25"
                    >
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Grille des 12 mois */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {MONTHS.map((m, i) => {
                      const isSelected = i === selMonth && pickerYear === selYear;
                      const isToday = i === currentMonth && pickerYear === currentYear;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setDate(pickerYear, i, 1);
                            setPickerOpen(false);
                          }}
                          className={`min-h-11 rounded-lg text-sm font-semibold transition-colors relative ${
                            isSelected
                              ? 'bg-violet-500/25 text-white border border-violet-500/50'
                              : 'bg-white/[0.04] text-white/80 hover:bg-white/[0.08] active:bg-white/10 border border-transparent'
                          }`}
                        >
                          {m}
                          {isToday && !isSelected && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            aria-label={t('dateNav.nextMonth')}
            whileTap={{ scale: 0.9 }}
            onClick={goNextMonth}
            disabled={!canNextMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors min-w-11 min-h-11 flex items-center justify-center disabled:opacity-25"
          >
            <ChevronRight className="w-4 h-4 text-white/80" aria-hidden="true" />
          </motion.button>

          <div className="ml-1 flex items-center gap-1.5 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={openFilters}
              aria-label={t('grid.filters')}
              className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-colors border border-white/10 flex items-center min-w-11 min-h-11 justify-center"
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
              className="p-2 rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 active:bg-violet-500/25 transition-colors border border-violet-500/30 flex items-center min-w-11 min-h-11 justify-center"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {weeks > 0 && (
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
              <motion.button
                key={w}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDate(selYear, selMonth, w)}
                aria-pressed={w === selWeek}
                className={`min-w-[52px] px-3 py-2 rounded-lg text-sm font-semibold transition-all min-h-11 ${
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

      {/* DESKTOP (md:768+) : layout inline complet avec annee nav, mois
          scrollables, semaines visibles a droite, actions tout a droite. */}
      <div className="hidden md:flex items-center gap-3">
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
