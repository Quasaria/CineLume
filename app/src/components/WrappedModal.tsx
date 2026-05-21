import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, ChevronLeft, ChevronRight, Calendar, CalendarRange,
  Flame, Film, TrendingUp, Share2, Download, X, Twitter,
  MessageCircle, Loader2, Check, Copy,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { getGenres, IMG, posterSrcSet } from '@/lib/tmdb';
import {
  computeWrappedStats,
  dayOfWeekLabel,
  type WrappedPeriod,
  type WrappedStats,
} from '@/lib/wrappedStats';
import { generateWrappedImage, type WrappedImageVariant } from '@/lib/wrappedImage';
import {
  shareWrappedImage,
  downloadBlob,
  openTwitterIntent,
  openWhatsAppIntent,
  copyToClipboard,
} from '@/lib/wrappedShare';

const APP_URL = 'https://cinelume.fr';

export function WrappedModal() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isOpen = useAppStore((s) => s.isWrappedOpen);
  const close = useAppStore((s) => s.closeWrapped);
  const seen = useAppStore((s) => s.seen);

  const now = new Date();
  const [period, setPeriod] = useState<WrappedPeriod>('year');
  const [anchorYear, setAnchorYear] = useState(now.getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(now.getMonth());

  // Reset au mois/annee courant a chaque ouverture pour repartir sur le
  // present. Le pattern est legit (synchroniser local state a la prop isOpen).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      const d = new Date();
      setPeriod('year');
      setAnchorYear(d.getFullYear());
      setAnchorMonth(d.getMonth());
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const stats = useMemo(
    () => computeWrappedStats(seen, period, anchorYear, anchorMonth, lang),
    [seen, period, anchorYear, anchorMonth, lang],
  );

  const { data: genresData } = useQuery({
    queryKey: ['genres', lang],
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

  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  // Reset le share sheet si la modale ferme (le bouton close est exterieur).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) setShareSheetOpen(false);
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function goPrev() {
    if (period === 'year') {
      setAnchorYear((y) => y - 1);
    } else if (anchorMonth === 0) {
      setAnchorMonth(11);
      setAnchorYear((y) => y - 1);
    } else {
      setAnchorMonth((m) => m - 1);
    }
  }

  function goNext() {
    const today = new Date();
    if (period === 'year') {
      if (anchorYear < today.getFullYear()) setAnchorYear((y) => y + 1);
      return;
    }
    const atCurrent = anchorYear === today.getFullYear() && anchorMonth === today.getMonth();
    if (atCurrent) return;
    if (anchorMonth === 11) {
      setAnchorMonth(0);
      setAnchorYear((y) => y + 1);
    } else {
      setAnchorMonth((m) => m + 1);
    }
  }

  const canGoNext = useMemo(() => {
    const today = new Date();
    if (period === 'year') return anchorYear < today.getFullYear();
    return !(anchorYear === today.getFullYear() && anchorMonth === today.getMonth());
  }, [period, anchorYear, anchorMonth]);

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
          <AmbientBlobs />

          <div className="relative z-10 max-w-3xl mx-auto pb-32">
            <StickyHeader t={t} onClose={close} />

            <PeriodControls
              t={t}
              lang={lang}
              period={period}
              anchorYear={anchorYear}
              anchorMonth={anchorMonth}
              canGoNext={canGoNext}
              onPeriodChange={setPeriod}
              onPrev={goPrev}
              onNext={goNext}
            />

            {stats.total === 0 ? (
              <EmptyState t={t} />
            ) : (
              <div className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                <SlideCover stats={stats} />
                <SlideTopGenre stats={stats} genreMap={genreMap} />
                <SlideTopFilms stats={stats} />
                <SlideHabits stats={stats} lang={lang} t={t} />
                {stats.period === 'year' && <SlideMonthlyDistribution stats={stats} t={t} />}
                <SlideDecades stats={stats} t={t} />
                <SlideShareCTA t={t} onOpen={() => setShareSheetOpen(true)} />
              </div>
            )}
          </div>

          {/* Bouton flottant partager, toujours visible quand on a des donnees */}
          {stats.total > 0 && (
            <motion.button
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              type="button"
              onClick={() => setShareSheetOpen(true)}
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 px-6 py-3.5 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 text-white font-bold shadow-xl shadow-violet-500/40 flex items-center gap-2 active:scale-95 transition-transform"
              style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom))' }}
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>{t('wrapped.share')}</span>
            </motion.button>
          )}

          <ShareSheet
            open={shareSheetOpen}
            onClose={() => setShareSheetOpen(false)}
            stats={stats}
            genreMap={genreMap}
            lang={lang}
            t={t}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AmbientBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-violet-600/25 blur-[140px]" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-cyan-500/20 blur-[140px]" />
      <div className="absolute bottom-0 left-0 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/20 blur-[140px]" />
    </div>
  );
}

function StickyHeader({ t, onClose }: { t: (k: string) => string; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-30 px-4 sm:px-6 pt-3 pb-3 bg-[#0a0a10]/75 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="min-w-11 min-h-11 -ml-1 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 text-white/75 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <h2 className="flex-1 font-black text-xl sm:text-2xl tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-300" aria-hidden="true" />
          <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
            {t('wrapped.title')}
          </span>
        </h2>
      </div>
    </div>
  );
}

interface PeriodControlsProps {
  t: (k: string) => string;
  lang: string;
  period: WrappedPeriod;
  anchorYear: number;
  anchorMonth: number;
  canGoNext: boolean;
  onPeriodChange: (p: WrappedPeriod) => void;
  onPrev: () => void;
  onNext: () => void;
}

function PeriodControls({
  t, lang, period, anchorYear, anchorMonth, canGoNext,
  onPeriodChange, onPrev, onNext,
}: PeriodControlsProps) {
  const label = period === 'year'
    ? String(anchorYear)
    : new Date(anchorYear, anchorMonth, 1).toLocaleDateString(lang || 'fr', {
        month: 'long', year: 'numeric',
      });

  return (
    <div className="px-4 sm:px-6 pt-4 pb-2">
      {/* Toggle Annuel / Mensuel */}
      <div role="tablist" aria-label={t('wrapped.periodToggle')} className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] w-fit mx-auto mb-4">
        <button
          type="button"
          role="tab"
          aria-selected={period === 'year'}
          onClick={() => onPeriodChange('year')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 min-h-9 ${
            period === 'year'
              ? 'bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 text-white border border-white/15'
              : 'text-white/55 hover:text-white/80'
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
          {t('wrapped.year')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={period === 'month'}
          onClick={() => onPeriodChange('month')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 min-h-9 ${
            period === 'month'
              ? 'bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 text-white border border-white/15'
              : 'text-white/55 hover:text-white/80'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          {t('wrapped.month')}
        </button>
      </div>

      {/* Period anchor : chevrons + label */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label={t('wrapped.prevPeriod')}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 text-white/70 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <span className="min-w-[160px] text-center text-lg sm:text-xl font-black capitalize tabular-nums px-3" aria-live="polite">
          {label}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label={t('wrapped.nextPeriod')}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 text-white/70 disabled:opacity-25 transition-colors"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/15 to-cyan-500/15 border border-white/10 flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-white/35" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{t('wrapped.emptyTitle')}</h3>
      <p className="text-sm text-white/55 max-w-xs mx-auto">{t('wrapped.emptyHint')}</p>
    </div>
  );
}

// ---------- Slides ----------

function SlideCover({ stats }: { stats: WrappedStats }) {
  const deltaSign = stats.prevPeriodDelta !== null && stats.prevPeriodDelta > 0 ? '+' : '';
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl border border-white/10 p-6 sm:p-8 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 30% 0%, rgba(124, 58, 237, 0.35) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.22) 0%, transparent 55%), rgba(255,255,255,0.02)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <p className="text-xs uppercase tracking-[0.3em] font-black text-white/55 mb-2 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
        Wrapped
      </p>
      <h3 className="text-7xl sm:text-8xl font-black tracking-tighter leading-[0.95]">
        <span className="bg-gradient-to-br from-white via-violet-100 to-cyan-100 bg-clip-text text-transparent tabular-nums">
          {stats.total}
        </span>
      </h3>
      <p className="text-base sm:text-lg font-semibold text-white/85 mt-2">
        {stats.total > 1 ? 'films vus' : 'film vu'}
      </p>
      <p className="text-xs sm:text-sm text-white/50 mt-1 capitalize">{stats.periodLabel}</p>
      {stats.prevPeriodDelta !== null && (
        <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10">
          <TrendingUp className={`w-3 h-3 ${stats.prevPeriodDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`} aria-hidden="true" />
          <span className="text-[11px] font-bold text-white/85 tabular-nums">
            {deltaSign}{stats.prevPeriodDelta}% vs precedent
          </span>
        </div>
      )}
    </motion.section>
  );
}

function SlideTopGenre({
  stats, genreMap,
}: {
  stats: WrappedStats;
  genreMap: Map<number, string>;
}) {
  const top = stats.topGenres[0];
  if (!top) return null;
  const name = genreMap.get(top.id);
  if (!name) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl border border-white/10 p-6 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 80% 20%, rgba(217, 70, 239, 0.35) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(124, 58, 237, 0.25) 0%, transparent 55%), rgba(255,255,255,0.02)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <p className="text-xs uppercase tracking-[0.3em] font-black text-white/55 mb-2 flex items-center gap-2">
        <Film className="w-3.5 h-3.5" aria-hidden="true" />
        Ton genre favori
      </p>
      <h3 className="text-5xl sm:text-6xl font-black tracking-tighter leading-none uppercase">
        <span className="bg-gradient-to-r from-fuchsia-200 via-violet-200 to-cyan-200 bg-clip-text text-transparent">
          {name}
        </span>
      </h3>
      <p className="mt-3 text-base font-semibold text-white/80 tabular-nums">
        {top.count} films · {top.pct}%
      </p>
      {stats.topGenres.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {stats.topGenres.slice(1, 5).map((g) => {
            const gname = genreMap.get(g.id);
            if (!gname) return null;
            return (
              <span
                key={g.id}
                className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-bold text-white/75"
              >
                {gname} · {g.count}
              </span>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

function SlideTopFilms({ stats }: { stats: WrappedStats }) {
  if (stats.topFilms.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6"
    >
      <p className="text-xs uppercase tracking-[0.3em] font-black text-white/55 mb-4 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
        Tes derniers vus
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {stats.topFilms.map((f, i) => (
          <motion.div
            key={f.id + '-' + f.watchedAt}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.08]"
            title={f.title}
          >
            {f.poster_path ? (
              <img
                src={`${IMG}${f.poster_path}`}
                srcSet={posterSrcSet(f.poster_path)}
                sizes="(min-width:640px) 130px, 30vw"
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs px-2 text-center">
                {f.title}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function SlideHabits({
  stats, lang, t,
}: {
  stats: WrappedStats;
  lang: string;
  t: (k: string) => string;
}) {
  const bestDow = stats.byDayOfWeek
    .map((c, i) => ({ i, c }))
    .sort((a, b) => b.c - a.c)[0];
  const showDow = bestDow && bestDow.c > 0;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6"
      style={{
        background:
          'radial-gradient(ellipse at 30% 100%, rgba(251, 191, 36, 0.18) 0%, transparent 55%), rgba(255,255,255,0.02)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <p className="text-xs uppercase tracking-[0.3em] font-black text-white/55 mb-4 flex items-center gap-2">
        <Flame className="w-3.5 h-3.5" aria-hidden="true" />
        Tes habitudes
      </p>
      <div className="grid grid-cols-2 gap-3">
        <HabitCard
          label={t('wrapped.streak')}
          value={String(stats.longestStreak)}
          suffix={stats.longestStreak > 1 ? 'jours' : 'jour'}
          accent="amber"
        />
        <HabitCard
          label={t('wrapped.daysWatched')}
          value={String(stats.daysWithFilm)}
          suffix={stats.daysWithFilm > 1 ? 'jours' : 'jour'}
          accent="violet"
        />
        {stats.bestDay && (
          <HabitCard
            label={t('wrapped.bestDay')}
            value={String(stats.bestDay.count)}
            suffix={'le ' + new Date(
              parseInt(stats.bestDay.dateKey.slice(0, 4), 10),
              parseInt(stats.bestDay.dateKey.slice(5, 7), 10) - 1,
              parseInt(stats.bestDay.dateKey.slice(8, 10), 10),
            ).toLocaleDateString(lang || 'fr', { day: 'numeric', month: 'short' })}
            accent="fuchsia"
          />
        )}
        {showDow && (
          <HabitCard
            label={t('wrapped.favDay')}
            value={dayOfWeekLabel(bestDow.i, lang).slice(0, 3).toUpperCase()}
            suffix={bestDow.c + ' films'}
            accent="cyan"
          />
        )}
      </div>
    </motion.section>
  );
}

function HabitCard({
  label, value, suffix, accent,
}: {
  label: string;
  value: string;
  suffix: string;
  accent: 'violet' | 'fuchsia' | 'cyan' | 'amber';
}) {
  const accentMap = {
    violet: { from: 'from-violet-200', to: 'to-violet-400', border: 'border-violet-500/20' },
    fuchsia: { from: 'from-fuchsia-200', to: 'to-fuchsia-400', border: 'border-fuchsia-500/20' },
    cyan: { from: 'from-cyan-200', to: 'to-cyan-400', border: 'border-cyan-500/20' },
    amber: { from: 'from-amber-200', to: 'to-amber-400', border: 'border-amber-500/20' },
  } as const;
  const a = accentMap[accent];
  return (
    <div className={`rounded-2xl border ${a.border} bg-white/[0.03] p-4`}>
      <p className={`font-black text-3xl sm:text-4xl leading-none tabular-nums bg-gradient-to-br ${a.from} ${a.to} bg-clip-text text-transparent`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider font-bold text-white/55 mt-2">{label}</p>
      <p className="text-[11px] font-semibold text-white/65 mt-0.5 truncate">{suffix}</p>
    </div>
  );
}

function SlideMonthlyDistribution({ stats, t }: { stats: WrappedStats; t: (k: string) => string }) {
  if (!stats.byMonth) return null;
  const max = Math.max(...stats.byMonth.map((m) => m.count), 1);
  const monthShort = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6"
    >
      <p className="text-xs uppercase tracking-[0.3em] font-black text-white/55 mb-5 flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
        {t('wrapped.byMonth')}
      </p>
      <div className="flex items-end justify-between gap-1 sm:gap-2 h-32">
        {stats.byMonth.map((m, i) => {
          const h = (m.count / max) * 100;
          return (
            <motion.div
              key={m.ym}
              className="flex-1 flex flex-col items-center gap-1.5"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.25 + i * 0.03 }}
            >
              <div className="relative w-full flex items-end h-24">
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full rounded-md bg-gradient-to-t from-violet-500/70 via-fuchsia-500/70 to-cyan-400/70"
                  style={{ minHeight: m.count > 0 ? '4px' : '0' }}
                  title={`${m.count}`}
                />
              </div>
              <span className="text-[10px] font-bold text-white/55 tabular-nums">{monthShort[i]}</span>
              <span className="text-[10px] font-bold text-white/85 tabular-nums">{m.count}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

function SlideDecades({ stats, t }: { stats: WrappedStats; t: (k: string) => string }) {
  if (!stats.topDecade && !stats.decadeRange) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-white/10 p-6"
      style={{
        background:
          'radial-gradient(ellipse at 70% 0%, rgba(34, 197, 94, 0.15) 0%, transparent 55%), rgba(255,255,255,0.02)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <p className="text-xs uppercase tracking-[0.3em] font-black text-white/55 mb-2 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
        {t('wrapped.decade')}
      </p>
      {stats.topDecade && (
        <h3 className="text-5xl sm:text-6xl font-black tracking-tighter">
          <span className="bg-gradient-to-r from-emerald-200 via-cyan-200 to-violet-200 bg-clip-text text-transparent tabular-nums">
            {stats.topDecade.decade}s
          </span>
        </h3>
      )}
      {stats.decadeRange && (
        <p className="text-sm font-semibold text-white/65 mt-2 tabular-nums">
          {t('wrapped.decadeRange')} : {stats.decadeRange.min}s → {stats.decadeRange.max}s
        </p>
      )}
    </motion.section>
  );
}

function SlideShareCTA({ t, onOpen }: { t: (k: string) => string; onOpen: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="rounded-3xl border border-white/10 p-6 sm:p-8 text-center"
      style={{
        background:
          'linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(217, 70, 239, 0.18) 50%, rgba(6, 182, 212, 0.22))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
        {t('wrapped.shareCtaTitle')}
      </h3>
      <p className="text-sm text-white/65 mb-5 max-w-xs mx-auto">
        {t('wrapped.shareCtaHint')}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
      >
        <Share2 className="w-4 h-4" aria-hidden="true" />
        {t('wrapped.share')}
      </button>
    </motion.section>
  );
}

// ---------- Share sheet ----------

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  stats: WrappedStats;
  genreMap: Map<number, string>;
  lang: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function ShareSheet({ open, onClose, stats, genreMap, lang, t }: ShareSheetProps) {
  const [variant, setVariant] = useState<WrappedImageVariant>('simple');
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset statut + copy quand la sheet ferme.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setStatusMsg(null);
      setCopied(false);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Revoque l'object URL precedente : a chaque fois que previewUrl change ou
  // que la sheet est demontee, on libere la memoire de la blob URL.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Regenere une preview a chaque changement de variante quand le sheet est ouvert.
  // Regenere la preview a chaque changement de variante/periode. Le cleanup
  // de la blob URL se fait dans l'effet dedie ci-dessus.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const blob = await generateWrappedImage(stats, {
          variant,
          genreNames: genreMap,
          lang,
          brandTagline: t('wrapped.brandTagline'),
          appUrl: APP_URL,
        });
        if (cancelled) return;
        setPreviewUrl(URL.createObjectURL(blob));
      } catch {
        // ignore : preview optionnelle
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, variant, stats, genreMap, lang, t]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const shareText = stats.period === 'year'
    ? `Mon Wrapped CineLume ${stats.periodLabel} : ${stats.total} films vus`
    : `Mon Wrapped CineLume · ${stats.periodLabel} : ${stats.total} films vus`;

  async function generateBlob() {
    setGenerating(true);
    try {
      return await generateWrappedImage(stats, {
        variant,
        genreNames: genreMap,
        lang,
        brandTagline: t('wrapped.brandTagline'),
        appUrl: APP_URL,
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleNativeShare() {
    try {
      const blob = await generateBlob();
      const result = await shareWrappedImage(blob, `cinelume-wrapped-${stats.periodKey}.png`, {
        text: shareText,
        url: APP_URL,
      });
      if (result.method === 'download') {
        setStatusMsg(t('wrapped.downloadedHint'));
      } else if (result.method === 'cancelled') {
        // nothing
      } else if (result.method === 'error') {
        setStatusMsg(t('wrapped.shareError'));
      }
    } catch {
      setStatusMsg(t('wrapped.shareError'));
    }
  }

  async function handleDownload() {
    try {
      const blob = await generateBlob();
      const r = downloadBlob(blob, `cinelume-wrapped-${stats.periodKey}.png`);
      if (r.method === 'download') setStatusMsg(t('wrapped.downloadedHint'));
      else setStatusMsg(t('wrapped.shareError'));
    } catch {
      setStatusMsg(t('wrapped.shareError'));
    }
  }

  async function handleTwitter() {
    // Download image first so user can attach manually, then open intent
    try {
      const blob = await generateBlob();
      downloadBlob(blob, `cinelume-wrapped-${stats.periodKey}.png`);
      openTwitterIntent(shareText, APP_URL);
    } catch {
      setStatusMsg(t('wrapped.shareError'));
    }
  }

  async function handleWhatsApp() {
    try {
      const blob = await generateBlob();
      // Try native share first since WhatsApp accepts files via share sheet on mobile
      const r = await shareWrappedImage(blob, `cinelume-wrapped-${stats.periodKey}.png`, {
        text: shareText,
        url: APP_URL,
      });
      if (r.method === 'download') {
        // Desktop : download + open wa.me
        openWhatsAppIntent(shareText, APP_URL);
      }
    } catch {
      setStatusMsg(t('wrapped.shareError'));
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(`${shareText}\n${APP_URL}`);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('wrapped.shareSheetTitle')}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl border-t border-white/10 bg-[#0a0a10] max-h-[92vh] overflow-y-auto custom-scroll"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="px-5 pt-3">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-white/15 mb-4" aria-hidden="true" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black tracking-tight text-white">
                  {t('wrapped.shareSheetTitle')}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="min-w-9 min-h-9 flex items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/5"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Variant toggle */}
              <div className="flex items-center gap-2 mb-4 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <VariantTab
                  active={variant === 'simple'}
                  label={t('wrapped.variantSimple')}
                  hint={t('wrapped.variantSimpleHint')}
                  onClick={() => setVariant('simple')}
                />
                <VariantTab
                  active={variant === 'detailed'}
                  label={t('wrapped.variantDetailed')}
                  hint={t('wrapped.variantDetailedHint')}
                  onClick={() => setVariant('detailed')}
                />
              </div>

              {/* Preview */}
              <div className="mb-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={t('wrapped.previewAlt')}
                    className="w-full h-auto block"
                  />
                ) : (
                  <div className="aspect-[9/16] flex items-center justify-center text-white/30 text-sm">
                    <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 mb-3">
                <ShareButton
                  icon={Share2}
                  label={t('wrapped.shareNative')}
                  hint={t('wrapped.shareNativeHint')}
                  primary
                  onClick={handleNativeShare}
                  disabled={generating}
                />
                <div className="grid grid-cols-2 gap-2">
                  <ShareButton
                    icon={Twitter}
                    label="Twitter / X"
                    onClick={handleTwitter}
                    disabled={generating}
                  />
                  <ShareButton
                    icon={MessageCircle}
                    label="WhatsApp"
                    onClick={handleWhatsApp}
                    disabled={generating}
                  />
                  <ShareButton
                    icon={Download}
                    label={t('wrapped.download')}
                    onClick={handleDownload}
                    disabled={generating}
                  />
                  <ShareButton
                    icon={copied ? Check : Copy}
                    label={copied ? t('wrapped.copied') : t('wrapped.copyText')}
                    onClick={handleCopy}
                  />
                </div>
              </div>

              {statusMsg && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 text-center">
                  {statusMsg}
                </div>
              )}

              <p className="text-[11px] text-white/40 text-center pb-5">
                {t('wrapped.shareFootnote')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function VariantTab({
  active, label, hint, onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 p-3 rounded-lg text-left transition-all ${
        active
          ? 'bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 border border-white/15'
          : 'border border-transparent hover:bg-white/[0.03]'
      }`}
    >
      <span className={`block text-sm font-bold ${active ? 'text-white' : 'text-white/65'}`}>{label}</span>
      <span className="block text-[11px] text-white/45 mt-0.5">{hint}</span>
    </button>
  );
}

function ShareButton({
  icon: Icon, label, hint, primary, onClick, disabled,
}: {
  icon: typeof Share2;
  label: string;
  hint?: string;
  primary?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all min-h-12 disabled:opacity-50 ${
        primary
          ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25 hover:scale-[1.02] active:scale-95'
          : 'bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] active:bg-white/10'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <div className="text-left">
        <p>{label}</p>
        {hint && <p className="text-[10px] font-medium text-white/55 mt-0.5">{hint}</p>}
      </div>
    </button>
  );
}
