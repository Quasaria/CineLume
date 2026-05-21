import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CalendarRange } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import type { FavoriteMovie } from '@/types/movie';

/**
 * Vue annuelle stylisee : 12 mois en scroll vertical, avec les posters
 * des films suivis (favoris + watchlist) places dans leur mois de sortie.
 * Chaque mois a un gradient saisonnier et son nom geant en background.
 * Complement de WatchHistoryModal (passe) : ici c'est le futur cinephile.
 */

type Season = 'winter' | 'spring' | 'summer' | 'autumn';

function seasonForMonth(month: number): Season {
  if (month === 11 || month <= 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  return 'autumn';
}

// Gradient de fond par saison : tres subtil pour ne pas tuer les posters.
const SEASON_BG: Record<Season, string> = {
  winter: 'radial-gradient(ellipse at 30% 0%, rgba(6, 182, 212, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(99, 102, 241, 0.14) 0%, transparent 55%)',
  spring: 'radial-gradient(ellipse at 30% 0%, rgba(217, 70, 239, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(168, 85, 247, 0.14) 0%, transparent 55%)',
  summer: 'radial-gradient(ellipse at 30% 0%, rgba(251, 191, 36, 0.16) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(244, 63, 94, 0.14) 0%, transparent 55%)',
  autumn: 'radial-gradient(ellipse at 30% 0%, rgba(124, 58, 237, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(190, 18, 60, 0.12) 0%, transparent 55%)',
};

// Gradient du texte (mois geant + label) selon la saison.
const SEASON_TEXT: Record<Season, string> = {
  winter: 'from-cyan-200 via-sky-200 to-indigo-200',
  spring: 'from-fuchsia-200 via-pink-200 to-violet-200',
  summer: 'from-amber-200 via-rose-200 to-orange-200',
  autumn: 'from-violet-200 via-fuchsia-200 to-rose-200',
};

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

interface MonthBucket {
  ym: string;
  year: number;
  month: number;
  films: FavoriteMovie[];
}

export function YearCalendarModal() {
  const { t, i18n } = useTranslation();
  const isOpen = useAppStore((s) => s.isYearCalendarOpen);
  const close = useAppStore((s) => s.closeYearCalendar);
  const favorites = useAppStore((s) => s.favorites);
  const watchlist = useAppStore((s) => s.watchlist);
  const openFilm = useAppStore((s) => s.openModal);

  // Dedup favoris + watchlist par id. On veut un seul poster par film
  // meme s'il est dans les deux listes.
  const films = useMemo(() => {
    const map = new Map<number, FavoriteMovie>();
    for (const f of favorites) if (f.release_date) map.set(f.id, f);
    for (const w of watchlist) if (w.release_date && !map.has(w.id)) map.set(w.id, w);
    return Array.from(map.values());
  }, [favorites, watchlist]);

  // 12 mois a partir du mois courant. On veut le futur, pour completer
  // WatchHistory (qui est le passe). Films passes de l'annee restent
  // accessibles via l'onglet "Sortis" de la watchlist.
  const months = useMemo<MonthBucket[]>(() => {
    const now = new Date();
    const buckets: MonthBucket[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = monthKey(d.getFullYear(), d.getMonth());
      const inMonth = films
        .filter((f) => f.release_date.slice(0, 7) === ym)
        .sort((a, b) => a.release_date.localeCompare(b.release_date));
      buckets.push({ ym, year: d.getFullYear(), month: d.getMonth(), films: inMonth });
    }
    return buckets;
  }, [films]);

  // Mois non-vides uniquement. Si tout est vide, on garde au moins le
  // mois courant pour pouvoir afficher quelque chose (sera surcharge
  // par l'EmptyState global si films.length === 0).
  const visibleMonths = useMemo(() => {
    const withFilms = months.filter((m) => m.films.length > 0);
    return withFilms.length > 0 ? withFilms : [months[0]];
  }, [months]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [activeYm, setActiveYm] = useState<string | null>(null);
  useBodyScrollLock(isOpen);
  useFocusRestore(isOpen);
  useSwipeBack({ onBack: close, enabled: isOpen });

  // IntersectionObserver pour highlight le mois visible dans la mini-nav.
  // On observe les sections au scroll dans le container modale.
  useEffect(() => {
    if (!isOpen || films.length === 0) return;
    const root = contentRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveYm(visible[0].target.id.replace('year-month-', ''));
      },
      { root, threshold: [0.2, 0.5, 0.8] },
    );
    visibleMonths.forEach(({ ym }) => {
      const el = root.querySelector(`#year-month-${ym}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [isOpen, visibleMonths, films.length]);

  const scrollToMonth = (ym: string) => {
    const root = contentRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`#year-month-${ym}`);
    if (!el) return;
    // scrollTo manuel sur le container : evite scrollIntoView qui peut
    // remonter aussi le scroll du document parent.
    const top = el.offsetTop - 60;
    root.scrollTo({ top, behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-[#0a0a10] overflow-y-auto custom-scroll"
          ref={contentRef}
        >
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-violet-600/15 blur-[140px]" />
            <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-cyan-500/12 blur-[140px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-fuchsia-500/12 blur-[140px]" />
          </div>

          <div className="relative z-10">
            <div className="sticky top-0 z-30 px-4 pt-3 pb-2 bg-[#0a0a10]/80 backdrop-blur-xl border-b border-white/[0.06]">
              <div className="max-w-5xl mx-auto">
                <ModalHeader
                  title={
                    <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                      {t('yearCalendar.title')}
                    </span>
                  }
                  onBack={close}
                  backLabel={t('common.back')}
                />
              </div>
            </div>

            {films.length === 0 ? (
              <EmptyState t={t} />
            ) : (
              <>
                <div className="max-w-5xl mx-auto pb-12">
                  {visibleMonths.map(({ ym, year, month, films: monthFilms }, idx) => (
                    <MonthSection
                      key={ym}
                      ym={ym}
                      year={year}
                      month={month}
                      films={monthFilms}
                      lang={i18n.language}
                      onFilmClick={(id) => { close(); openFilm(id); }}
                      isFirst={idx === 0}
                      t={t}
                    />
                  ))}
                </div>

                {/* Mini-nav lateral, desktop uniquement. Dots cliquables
                    qui indiquent le mois visible. */}
                {visibleMonths.length > 1 && (
                  <nav
                    aria-label={t('yearCalendar.navLabel')}
                    className="hidden lg:flex fixed top-1/2 right-5 -translate-y-1/2 z-20 flex-col gap-2 p-2 rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-md"
                  >
                    {visibleMonths.map(({ ym, year, month }) => {
                      const monthShort = new Date(year, month, 1).toLocaleDateString(i18n.language || 'fr', { month: 'short' });
                      const active = activeYm === ym;
                      return (
                        <button
                          key={ym}
                          type="button"
                          onClick={() => scrollToMonth(ym)}
                          aria-label={t('yearCalendar.jumpTo', { month: `${monthShort} ${year}` })}
                          className="group relative flex items-center"
                        >
                          <span
                            className={`block rounded-full transition-all ${
                              active
                                ? 'w-3 h-3 bg-gradient-to-br from-violet-400 to-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.6)]'
                                : 'w-2 h-2 bg-white/20 group-hover:bg-white/45'
                            }`}
                          />
                          <span className="absolute right-5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-black/85 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity capitalize">
                            {monthShort} {year}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MonthSectionProps {
  ym: string;
  year: number;
  month: number;
  films: FavoriteMovie[];
  lang: string;
  onFilmClick: (id: number) => void;
  isFirst: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function MonthSection({ ym, year, month, films, lang, onFilmClick, isFirst, t }: MonthSectionProps) {
  const season = seasonForMonth(month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString(lang || 'fr', { month: 'long' });

  return (
    <motion.section
      id={`year-month-${ym}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative px-4 sm:px-8 ${isFirst ? 'pt-8' : 'pt-16'} pb-12 overflow-hidden`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: SEASON_BG[season] }}
        aria-hidden="true"
      />

      {/* Mois geant en background, en degrade saisonnier transparent.
          Le texte est purement decoratif (aria-hidden) ; le vrai label
          se trouve dans le header juste au-dessus, lisible. */}
      <div
        className="absolute inset-x-0 top-6 sm:top-10 pointer-events-none select-none flex justify-center"
        aria-hidden="true"
      >
        <h2
          className={`font-black tracking-tighter leading-none uppercase bg-gradient-to-br ${SEASON_TEXT[season]} bg-clip-text text-transparent opacity-[0.07]`}
          style={{ fontSize: 'clamp(5rem, 22vw, 16rem)' }}
        >
          {monthLabel}
        </h2>
      </div>

      <div className="relative z-10 flex items-baseline justify-between mb-7 pl-1">
        <h3 className="flex items-baseline gap-2 sm:gap-3">
          <span className={`text-base sm:text-lg font-black uppercase tracking-[0.25em] bg-gradient-to-r ${SEASON_TEXT[season]} bg-clip-text text-transparent`}>
            {monthLabel}
          </span>
          <span className="text-sm sm:text-base font-bold text-white/35 tabular-nums">
            {year}
          </span>
        </h3>
        <span className="text-[10px] uppercase tracking-wider font-bold text-white/45 tabular-nums">
          {t('yearCalendar.release', { count: films.length })}
        </span>
      </div>

      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {films.map((f, i) => {
          const day = parseInt(f.release_date.slice(8, 10), 10) || 0;
          const dayLabel = new Date(f.release_date).toLocaleDateString(lang || 'fr', { day: 'numeric', month: 'short' });
          return (
            <motion.button
              key={f.id}
              type="button"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onFilmClick(f.id)}
              aria-label={`${f.title} — ${dayLabel}`}
              className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08] hover:border-white/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {f.poster_path ? (
                <img
                  src={`${IMG}${f.poster_path}`}
                  srcSet={posterSrcSet(f.poster_path)}
                  sizes="(min-width:1024px) 220px, (min-width:640px) 30vw, 45vw"
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30 text-4xl">?</div>
              )}

              {/* Pastille du jour, top-left, en glass */}
              {day > 0 && (
                <div className="absolute top-2 left-2 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg bg-black/65 backdrop-blur-md border border-white/15">
                  <span className="text-xs font-black text-white tabular-nums leading-none">{day}</span>
                </div>
              )}

              {/* Overlay titre, visible au hover/focus */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent p-2.5 sm:p-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">{f.title}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <div className="text-center py-20 px-6 max-w-md mx-auto">
      <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/15 to-cyan-500/15 border border-white/10 flex items-center justify-center">
        <CalendarRange className="w-12 h-12 text-white/35" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{t('yearCalendar.emptyTitle')}</h3>
      <p className="text-sm text-white/55">{t('yearCalendar.emptyHint')}</p>
    </div>
  );
}
