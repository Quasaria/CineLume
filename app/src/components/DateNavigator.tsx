import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);
  const monthGridRef = useRef<HTMLDivElement>(null);
  // Index focuse du clavier dans la grille des 12 mois (pour la nav fleches).
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
  // Position dynamique du popup picker : null tant qu'on n'a pas mesure
  // le trigger. Le popup n'est rendu que quand pickerPos est non-null,
  // ce qui evite le flash au top:0 avant que useLayoutEffect ait calcule.
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // useLayoutEffect (et pas useEffect) pour calculer la position AVANT que
  // le browser peinte le popup. Evite le flash visuel ou il apparaitrait
  // au top:0 puis sauterait a la bonne position.
  useLayoutEffect(() => {
    if (!pickerOpen) {
      setPickerPos(null);
      return;
    }
    // Hauteur estimee du popup picker (4 rangees de mois ~44px + year nav
    // ~36px + paddings + gaps). Sert a decider si on l'affiche au-dessus
    // ou en-dessous du trigger selon la place disponible.
    const ESTIMATED_HEIGHT = 220;
    let rafId: number | null = null;

    function updatePos() {
      const trigger = pickerTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      // Skip si trigger detache du DOM (rect a 0)
      if (rect.width === 0 && rect.height === 0) return;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const width = Math.min(280, viewportW - 24);
      const triggerCenter = rect.left + rect.width / 2;
      let left = triggerCenter - width / 2;
      left = Math.max(12, Math.min(viewportW - width - 12, left));
      // Si pas assez de place en-dessous (iPhone SE petit ecran), on
      // affiche le popup AU-DESSUS du trigger
      const spaceBelow = viewportH - rect.bottom;
      const top = spaceBelow >= ESTIMATED_HEIGHT
        ? rect.bottom + 6
        : Math.max(12, rect.top - ESTIMATED_HEIGHT - 6);
      setPickerPos({ top, left, width });
    }

    // Throttle via requestAnimationFrame : evite de spam setState sur
    // chaque event scroll (qui fire ~60-120 fois par seconde).
    function scheduleUpdate() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updatePos();
      });
    }

    updatePos();
    window.addEventListener('scroll', scheduleUpdate, { capture: true, passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate, { capture: true });
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [pickerOpen]);

  // Si l'user rotate son ecran de portrait (mobile, picker visible) vers
  // paysage tablette/desktop (>= md:768), le picker DOM disparait via
  // .md:hidden mais l'etat pickerOpen reste true (orphan). Ferme proactivement
  // pour eviter le desync.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setPickerOpen(false);
    }
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
  // de changer d'annee). Pose aussi le focus clavier sur le mois courant
  // pour que les touches fleche prennent le relais immediatement.
  // Quand on ferme, on restore le focus sur le trigger.
  const wasPickerOpen = useRef(false);
  useEffect(() => {
    if (pickerOpen) {
      setPickerYear(selYear);
      setFocusedMonth(selMonth);
    } else {
      setFocusedMonth(null);
      if (wasPickerOpen.current) {
        pickerTriggerRef.current?.focus();
      }
    }
    wasPickerOpen.current = pickerOpen;
  }, [pickerOpen, selYear, selMonth]);

  // Quand focusedMonth change, on focus reellement le bouton correspondant
  // pour les screen readers et pour que Enter active le bon mois.
  useEffect(() => {
    if (focusedMonth === null || !monthGridRef.current) return;
    const btn = monthGridRef.current.querySelector<HTMLButtonElement>(`button[data-month="${focusedMonth}"]`);
    btn?.focus();
  }, [focusedMonth]);

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
              ref={pickerTriggerRef}
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
              {pickerOpen && pickerPos && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  role="dialog"
                  aria-label={t('common.today')}
                  // Position fixed mais mise a jour dynamique via le useEffect
                  // ci-dessus (scroll + resize). Le popup suit toujours le
                  // trigger meme quand l'user scroll apres ouverture, et est
                  // centre horizontalement sur le trigger avec clamp viewport.
                  className="fixed z-40 rounded-2xl border border-white/10 shadow-2xl shadow-black/40 p-3"
                  style={{
                    top: pickerPos.top,
                    left: pickerPos.left,
                    width: pickerPos.width,
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

                  {/* Grille des 12 mois. Nav clavier : fleches deplacent
                      le focus dans la grille (gauche/droite/haut/bas par
                      pas de 1/4), Home/End = debut/fin de ligne, Enter
                      via le onClick standard. */}
                  <div
                    ref={monthGridRef}
                    role="grid"
                    aria-label={t('common.today')}
                    className="grid grid-cols-4 gap-1.5"
                    onKeyDown={(e) => {
                      if (focusedMonth === null) return;
                      let next = focusedMonth;
                      if (e.key === 'ArrowRight') next = Math.min(11, focusedMonth + 1);
                      else if (e.key === 'ArrowLeft') next = Math.max(0, focusedMonth - 1);
                      else if (e.key === 'ArrowDown') next = Math.min(11, focusedMonth + 4);
                      else if (e.key === 'ArrowUp') next = Math.max(0, focusedMonth - 4);
                      else if (e.key === 'Home') next = focusedMonth - (focusedMonth % 4);
                      else if (e.key === 'End') next = focusedMonth - (focusedMonth % 4) + 3;
                      else return;
                      e.preventDefault();
                      setFocusedMonth(next);
                    }}
                  >
                    {MONTHS.map((m, i) => {
                      const isSelected = i === selMonth && pickerYear === selYear;
                      const isToday = i === currentMonth && pickerYear === currentYear;
                      return (
                        <button
                          key={i}
                          type="button"
                          data-month={i}
                          role="gridcell"
                          tabIndex={focusedMonth === i ? 0 : -1}
                          aria-current={isSelected ? 'date' : undefined}
                          onClick={() => {
                            setDate(pickerYear, i, 1);
                            setPickerOpen(false);
                          }}
                          className={`min-h-11 rounded-lg text-sm font-semibold transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
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
