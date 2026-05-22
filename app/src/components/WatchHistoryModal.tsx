import { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Eye, Flame, Calendar, Sparkles, Film, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import { computeWatchStats, dateKey } from '@/lib/watchStats';
import { fmtDateLocalized } from '@/lib/utils';
import { getGenres, IMG, posterSrcSet } from '@/lib/tmdb';
import type { SeenMovie } from '@/types/movie';

/**
 * Vue calendrier/dashboard plein ecran de l'historique de visionnage.
 * Acces depuis le burger menu. Design premium qui s'inscrit dans la DA :
 * - gradient violet -> fuchsia -> cyan en accents
 * - glass morphism cards
 * - calendrier mois-par-mois avec les affiches des films dans les
 *   jours correspondants
 * Toute la modale est scrollable d'un bloc (pas de sub-scrolls).
 */
export function WatchHistoryModal() {
  const { t, i18n } = useTranslation();
  const isOpen = useAppStore((s) => s.isWatchHistoryOpen);
  const close = useAppStore((s) => s.closeWatchHistory);
  const seen = useAppStore((s) => s.seen);
  const openFilm = useAppStore((s) => s.openModal);

  const stats = useMemo(() => computeWatchStats(seen), [seen]);

  // Genres : on fetch la map id -> name de TMDB pour afficher les noms
  // (sinon on aurait juste des ids 28, 12, etc.).
  const { data: genresData } = useQuery({
    queryKey: ['genres', i18n.language],
    queryFn: ({ signal }) => getGenres(signal),
    enabled: isOpen,
    staleTime: 1000 * 60 * 60 * 24,
  });
  const genreMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of genresData || []) m.set(g.id, g.name);
    return m;
  }, [genresData]);

  const contentRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isOpen);
  useFocusRestore(isOpen);
  useSwipeBack({ onBack: close, enabled: isOpen });

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
          {/* Ambient color blobs en arriere-plan pour donner du relief */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-violet-600/20 blur-[120px]" />
            <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-cyan-500/15 blur-[120px]" />
            <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-fuchsia-500/15 blur-[120px]" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-4 pt-3 pb-12">
            <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-[#0a0a10]/70 backdrop-blur-xl mb-2">
              <ModalHeader
                title={
                  <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                    {t('watchHistory.title')}
                  </span>
                }
                onBack={close}
                backLabel={t('common.back')}
              />
            </div>

            {seen.length === 0 ? (
              <EmptyState t={t} />
            ) : (
              <>
                <HeroStat stats={stats} t={t} />
                <StatGrid stats={stats} t={t} i18n={i18n.language} />
                {stats.topGenres.length > 0 && genreMap.size > 0 && (
                  <GenreBreakdown topGenres={stats.topGenres} genreMap={genreMap} total={stats.total} t={t} />
                )}
                <CalendarMonths
                  byMonth={stats.byMonth}
                  lang={i18n.language}
                  openFilm={(id) => { close(); openFilm(id); }}
                  t={t}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/15 to-cyan-500/15 border border-white/10 flex items-center justify-center">
        <Eye className="w-12 h-12 text-white/35" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{t('watchHistory.emptyTitle')}</h3>
      <p className="text-sm text-white/55 max-w-xs mx-auto">{t('watchHistory.emptyHint')}</p>
    </div>
  );
}

interface HeroStatProps {
  stats: ReturnType<typeof computeWatchStats>;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function HeroStat({ stats, t }: HeroStatProps) {
  // dateKey local plutot que toISOString() qui shifte d'1 jour pour les
  // films marques tard le soir (timezone UTC vs locale).
  const firstDate = stats.firstWatchAt ? fmtDateLocalized(dateKey(stats.firstWatchAt), { month: 'long', year: 'numeric' }) : null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl border border-white/10 p-6 mb-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(217, 70, 239, 0.08) 50%, rgba(6, 182, 212, 0.12) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-white/55 mb-2 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          {t('watchHistory.heroLabel')}
        </p>
        <h2 className="text-6xl sm:text-7xl font-black tracking-tight leading-none">
          <span className="bg-gradient-to-br from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent tabular-nums">
            {stats.total}
          </span>
        </h2>
        <p className="text-base sm:text-lg font-semibold text-white/85 mt-2">
          {t('watchHistory.heroSubtitle', { count: stats.total })}
        </p>
        {firstDate && (
          <p className="text-xs text-white/45 mt-1">{t('watchHistory.since', { date: firstDate })}</p>
        )}
      </div>
    </motion.section>
  );
}

interface StatGridProps {
  stats: ReturnType<typeof computeWatchStats>;
  t: (k: string, opts?: Record<string, unknown>) => string;
  i18n: string;
}

function StatGrid({ stats, t, i18n }: StatGridProps) {
  const topMonthLabel = stats.topMonth
    ? new Date(stats.topMonth.ym + '-01').toLocaleDateString(i18n || 'fr', { month: 'short', year: 'numeric' })
    : '—';
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <StatCard icon={Calendar} label={t('watchHistory.thisYear')} value={stats.thisYear} accent="violet" delay={0.05} />
      <StatCard icon={Sparkles} label={t('watchHistory.thisMonth')} value={stats.thisMonth} accent="fuchsia" delay={0.1} />
      <StatCard icon={Flame} label={t('watchHistory.streak')} value={stats.maxStreak} suffix={t('watchHistory.streakUnit', { count: stats.maxStreak })} accent="amber" delay={0.15} />
      <StatCard icon={TrendingUp} label={t('watchHistory.topMonth')} value={topMonthLabel} accent="cyan" delay={0.2} small />
    </div>
  );
}

interface StatCardProps {
  icon: typeof Calendar;
  label: string;
  value: number | string;
  suffix?: string;
  accent: 'violet' | 'fuchsia' | 'cyan' | 'amber';
  delay?: number;
  small?: boolean;
}

function StatCard({ icon: Icon, label, value, suffix, accent, delay = 0, small }: StatCardProps) {
  const accentMap = {
    violet: { iconColor: 'text-violet-300', valueGradient: 'from-violet-200 to-violet-400', border: 'border-violet-500/20' },
    fuchsia: { iconColor: 'text-fuchsia-300', valueGradient: 'from-fuchsia-200 to-fuchsia-400', border: 'border-fuchsia-500/20' },
    cyan: { iconColor: 'text-cyan-300', valueGradient: 'from-cyan-200 to-cyan-400', border: 'border-cyan-500/20' },
    amber: { iconColor: 'text-amber-300', valueGradient: 'from-amber-200 to-amber-400', border: 'border-amber-500/20' },
  } as const;
  const a = accentMap[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl border ${a.border} bg-white/[0.03] p-4 overflow-hidden`}
    >
      <Icon className={`w-4 h-4 ${a.iconColor} mb-2`} aria-hidden="true" />
      <p className={`font-black tabular-nums leading-none bg-gradient-to-br ${a.valueGradient} bg-clip-text text-transparent ${small ? 'text-xl' : 'text-3xl'}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider font-bold text-white/55 mt-1.5">
        {label}{suffix ? ` · ${suffix}` : ''}
      </p>
    </motion.div>
  );
}


interface GenreBreakdownProps {
  topGenres: Array<{ id: number; count: number }>;
  genreMap: Map<number, string>;
  total: number;
  t: (k: string) => string;
}

function GenreBreakdown({ topGenres, genreMap, total, t }: GenreBreakdownProps) {
  const max = topGenres[0]?.count || 1;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 mb-4"
    >
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/55 mb-4 flex items-center gap-2">
        <Film className="w-3.5 h-3.5" aria-hidden="true" />
        {t('watchHistory.genresTitle')}
      </h3>
      <div className="space-y-2.5">
        {topGenres.map((g, i) => {
          const name = genreMap.get(g.id);
          if (!name) return null;
          const pct = Math.round((g.count / total) * 100);
          const widthPct = Math.round((g.count / max) * 100);
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className="text-sm font-semibold text-white min-w-[100px] truncate">{name}</span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500"
                />
              </div>
              <span className="text-xs tabular-nums text-white/70 font-semibold min-w-[42px] text-right">
                {g.count} · {pct}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Calendrier : mois-par-mois, grille 7 colonnes (lundi -> dimanche). Chaque
// jour avec film montre l'affiche en cellule + numero du jour en coin.
// ---------------------------------------------------------------------------

interface CalendarMonthsProps {
  byMonth: ReturnType<typeof computeWatchStats>['byMonth'];
  lang: string;
  openFilm: (id: number) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function CalendarMonths({ byMonth, lang, openFilm, t }: CalendarMonthsProps) {
  // Headers jours en lang locale : lundi -> dimanche, premiere lettre uniquement
  // pour rester compact a 7 colonnes sur mobile (~36-40px par cellule).
  const dayHeaders = useMemo(() => {
    const ref = new Date(2024, 0, 1); // 2024-01-01 = lundi
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setDate(ref.getDate() + i);
      const long = d.toLocaleDateString(lang || 'fr', { weekday: 'narrow' });
      return long.toUpperCase();
    });
  }, [lang]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/55 flex items-center gap-2 pl-1">
        <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
        {t('watchHistory.timelineTitle')}
      </h3>
      {byMonth.map(({ ym, films }, idx) => (
        <CalendarMonth
          key={ym}
          ym={ym}
          films={films}
          lang={lang}
          dayHeaders={dayHeaders}
          openFilm={openFilm}
          t={t}
          delay={Math.min(0.35 + idx * 0.03, 0.7)}
        />
      ))}
    </motion.section>
  );
}

interface CalendarMonthProps {
  ym: string;
  films: SeenMovie[];
  lang: string;
  dayHeaders: string[];
  openFilm: (id: number) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  delay: number;
}

function CalendarMonth({ ym, films, lang, dayHeaders, openFilm, t, delay }: CalendarMonthProps) {
  const [y, m] = ym.split('-').map(Number);
  const year = y;
  const monthIdx = m - 1;
  const monthLabel = new Date(year, monthIdx, 1).toLocaleDateString(lang || 'fr', { month: 'long', year: 'numeric' });

  // Position du 1er jour du mois dans la grille (0 = lundi)
  const firstDayOfWeek = (new Date(year, monthIdx, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  // Group films par jour (peut y en avoir plusieurs dans la meme journee)
  const filmsByDay = useMemo(() => {
    const map = new Map<number, SeenMovie[]>();
    for (const f of films) {
      const d = new Date(f.watchedAt).getDate();
      const arr = map.get(d);
      if (arr) arr.push(f);
      else map.set(d, [f]);
    }
    return map;
  }, [films]);

  // Cellules de la grille : null pour les paddings du debut, sinon le numero du jour
  const cells: Array<number | null> = useMemo(() => {
    const arr: Array<number | null> = [];
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstDayOfWeek, daysInMonth]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-4"
    >
      <div className="flex items-baseline justify-between mb-3 pl-1">
        <h4 className="text-base font-bold text-white capitalize tracking-tight">
          {monthLabel}
        </h4>
        <span className="text-[11px] uppercase tracking-wider font-bold text-white/45">
          {t('watchHistory.monthCount', { count: films.length })}
        </span>
      </div>

      {/* En-tete jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 mb-1.5" aria-hidden="true">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-white/35 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <CalendarCell
            key={i}
            day={day}
            films={day !== null ? filmsByDay.get(day) : undefined}
            onClick={(id) => openFilm(id)}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface CalendarCellProps {
  day: number | null;
  films: SeenMovie[] | undefined;
  onClick: (id: number) => void;
}

function CalendarCell({ day, films, onClick }: CalendarCellProps) {
  // Cellule de padding (premiers jours avant le 1er du mois)
  if (day === null) {
    return <div className="aspect-[3/4]" aria-hidden="true" />;
  }
  // Jour sans film
  if (!films || films.length === 0) {
    return (
      <div className="aspect-[3/4] rounded-md bg-white/[0.03] border border-white/[0.04] flex items-center justify-center">
        <span className="text-[11px] font-semibold text-white/35 tabular-nums">{day}</span>
      </div>
    );
  }
  // Jour avec film(s) : on affiche l'affiche du dernier vu, badge +N si plusieurs
  const main = films[0]; // films deja tries du plus recent au plus ancien dans computeWatchStats
  const extra = films.length - 1;
  return (
    <button
      type="button"
      onClick={() => onClick(main.id)}
      aria-label={`${main.title}${extra > 0 ? ` (+${extra})` : ''}`}
      className="relative aspect-[3/4] rounded-md overflow-hidden bg-white/5 border border-white/[0.08] hover:border-violet-400/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      {main.poster_path ? (
        <img
          src={`${IMG}${main.poster_path}`}
          srcSet={posterSrcSet(main.poster_path)}
          sizes="(min-width:768px) 90px, 13vw"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15">
          <span className="text-[9px] font-bold text-white/65 px-1 text-center leading-tight line-clamp-2">
            {main.title}
          </span>
        </div>
      )}
      {/* Numero du jour, top-right en pastille glass */}
      <span className="absolute top-0.5 right-0.5 min-w-[16px] px-1 py-0.5 rounded text-[9px] font-black text-white bg-black/65 tabular-nums leading-none">
        {day}
      </span>
      {/* Badge +N si plusieurs films */}
      {extra > 0 && (
        <span className="absolute bottom-0.5 right-0.5 min-w-[18px] px-1 py-0.5 rounded text-[9px] font-black text-white bg-violet-500/85 tabular-nums leading-none">
          +{extra}
        </span>
      )}
    </button>
  );
}

