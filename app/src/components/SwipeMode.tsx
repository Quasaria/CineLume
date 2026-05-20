import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, Calendar, Bookmark, Star, Info, ChevronDown, RotateCcw, X as XIcon } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { discoverMovies, getMovieDetails, IMG, posterSrcSet } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import { getCinemaWeeksOfMonth, formatDateISO } from '@/lib/cinema-week';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import type { Movie } from '@/types/movie';
import type { FavoriteMovie } from '@/types/movie';

type Source = 'week' | 'watchlist' | 'favorites';

const SWIPE_THRESHOLD = 120;

interface SwipeableMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  overview?: string;
  vote_average?: number;
  genre_ids?: number[];
}

function favToSwipe(m: FavoriteMovie): SwipeableMovie {
  return {
    id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    release_date: m.release_date,
    overview: m.overview,
    vote_average: m.vote_average,
    genre_ids: m.genre_ids,
  };
}

function movieToSwipe(m: Movie): SwipeableMovie {
  return {
    id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    release_date: m.release_date,
    overview: m.overview,
    vote_average: m.vote_average,
    genre_ids: m.genre_ids,
  };
}

export function SwipeMode() {
  const { t, i18n } = useTranslation();
  const isSwipeOpen = useAppStore((s) => s.isSwipeOpen);
  const closeSwipe = useAppStore((s) => s.closeSwipe);
  const openModal = useAppStore((s) => s.openModal);
  const watchlist = useAppStore((s) => s.watchlist);
  const favorites = useAppStore((s) => s.favorites);
  const toggleWatchlist = useAppStore((s) => s.toggleWatchlist);
  const isInWatchlist = useAppStore((s) => s.isInWatchlist);
  const selYear = useAppStore((s) => s.selYear);
  const selMonth = useAppStore((s) => s.selMonth);
  const selWeek = useAppStore((s) => s.selWeek);
  const selRegion = useAppStore((s) => s.selRegion);

  const [source, setSource] = useState<Source | null>(null);
  const [index, setIndex] = useState(0);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  useBodyScrollLock(isSwipeOpen);
  useFocusRestore(isSwipeOpen);
  useSwipeBack({ onBack: closeSwipe, enabled: isSwipeOpen });

  // Reset l'index quand on change de source ou qu'on rouvre la modale
  useEffect(() => {
    if (isSwipeOpen) {
      setIndex(0);
      setSkipped(new Set());
    }
  }, [isSwipeOpen, source]);

  // Reset le source aussi a la fermeture (pour re-prompter au prochain open)
  useEffect(() => {
    if (!isSwipeOpen) setSource(null);
  }, [isSwipeOpen]);

  // Fetch des sorties de la semaine (uniquement si source='week')
  const weekQuery = useQuery({
    queryKey: ['swipeWeek', selYear, selMonth, selWeek, selRegion, i18n.language],
    queryFn: async ({ signal }) => {
      const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion);
      const idx = Math.min(Math.max(selWeek - 1, 0), weeks.length - 1);
      const w = weeks[idx];
      return discoverMovies({
        region: selRegion,
        genre: '',
        startDate: formatDateISO(w.start),
        endDate: formatDateISO(w.end),
        page: 1,
        releaseMode: 'theater',
        provider: '',
        personId: null,
        sortBy: 'popularity',
        runtimeMax: null,
      }, signal);
    },
    enabled: isSwipeOpen && source === 'week',
    staleTime: 1000 * 60 * 10,
  });

  const items: SwipeableMovie[] = useMemo(() => {
    if (source === 'watchlist') return watchlist.map(favToSwipe);
    if (source === 'favorites') return favorites.map(favToSwipe);
    if (source === 'week') return (weekQuery.data?.results || []).filter((m) => !!m.poster_path).map(movieToSwipe);
    return [];
  }, [source, watchlist, favorites, weekQuery.data]);

  // Filtre les films deja skipped pour ne pas les revoir dans la session
  const visibleItems = useMemo(() => items.filter((m) => !skipped.has(m.id)), [items, skipped]);

  const current = visibleItems[index];
  const next1 = visibleItems[index + 1];
  const next2 = visibleItems[index + 2];

  function handleSwipe(direction: 'left' | 'right') {
    if (!current) return;
    if (direction === 'right') {
      if (!isInWatchlist(current.id)) {
        toggleWatchlist({
          id: current.id,
          title: current.title,
          poster_path: current.poster_path,
          release_date: current.release_date || '',
          vote_average: current.vote_average || 0,
          overview: current.overview,
          genre_ids: current.genre_ids,
        });
      }
    } else {
      setSkipped((prev) => {
        const next = new Set(prev);
        next.add(current.id);
        return next;
      });
    }
    setIndex((i) => i + 1);
  }

  // Equivalent clavier du swipe : FlecheGauche = skip, FlecheDroite = like.
  // Sans ca, le mode selecteur est inutilisable pour un user clavier ou un
  // user desktop qui n'a pas envie de drag a la souris.
  useEffect(() => {
    if (!isSwipeOpen || !current) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe('right');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwipeOpen, current?.id]);

  function reset() {
    setIndex(0);
    setSkipped(new Set());
  }

  const sourceLabel: Record<Source, string> = {
    week: t('swipe.sourceWeek'),
    watchlist: t('swipe.sourceWatchlist'),
    favorites: t('swipe.sourceFavorites'),
  };

  return (
    <AnimatePresence>
      {isSwipeOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-[#0a0a10]"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-2 py-3">
              <button
                type="button"
                onClick={closeSwipe}
                aria-label={t('swipe.close')}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/75 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white tracking-tight truncate">{t('swipe.title')}</h2>
                {source && (
                  <p className="text-xs text-white/55 truncate">
                    {sourceLabel[source]} · {t('swipe.stack', { remaining: Math.max(visibleItems.length - index, 0) })}
                  </p>
                )}
              </div>
              {source && (
                <button
                  type="button"
                  onClick={() => { setSource(null); setIndex(0); setSkipped(new Set()); }}
                  aria-label={t('swipe.source')}
                  className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Source selector */}
          {!source && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-16">
              <p className="text-sm text-white/65 text-center mb-6 max-w-xs flex items-start gap-1.5">
                <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{t('swipe.subtitle')}</span>
              </p>
              <h3 className="text-[11px] font-bold text-white/55 uppercase tracking-wider mb-3 self-start max-w-sm w-full mx-auto">
                {t('swipe.source')}
              </h3>
              <div className="space-y-2.5 w-full max-w-sm mx-auto">
                <SourceButton
                  icon={Calendar}
                  label={t('swipe.sourceWeek')}
                  accent="text-violet-300"
                  onClick={() => setSource('week')}
                />
                <SourceButton
                  icon={Bookmark}
                  label={t('swipe.sourceWatchlist')}
                  count={watchlist.length}
                  accent="text-cyan-300"
                  onClick={() => setSource('watchlist')}
                  disabled={watchlist.length === 0}
                />
                <SourceButton
                  icon={Star}
                  label={t('swipe.sourceFavorites')}
                  count={favorites.length}
                  accent="text-rose-300"
                  onClick={() => setSource('favorites')}
                  disabled={favorites.length === 0}
                />
              </div>
            </div>
          )}

          {/* Loading / empty */}
          {source && weekQuery.isLoading && source === 'week' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-violet-400 animate-spin" />
            </div>
          )}

          {source && visibleItems.length === 0 && !weekQuery.isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-semibold text-white/85 mb-2">{t('swipe.empty')}</p>
              <button
                type="button"
                onClick={() => setSource(null)}
                className="mt-3 px-4 py-2.5 min-h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
              >
                {t('swipe.source')}
              </button>
            </div>
          )}

          {/* End state */}
          {source && visibleItems.length > 0 && !current && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <Heart className="w-12 h-12 text-violet-400 mb-3" aria-hidden="true" />
              <p className="text-xl font-bold text-white mb-1">{t('swipe.end')}</p>
              <p className="text-sm text-white/55 mb-5 max-w-xs">{t('swipe.endHint')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2.5 min-h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  {t('common.retry')}
                </button>
                <button
                  type="button"
                  onClick={() => setSource(null)}
                  className="px-4 py-2.5 min-h-11 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-semibold"
                >
                  {t('swipe.source')}
                </button>
              </div>
            </div>
          )}

          {/* Card stack */}
          {source && current && (
            <div
              className="absolute inset-0 pt-16 flex items-center justify-center px-3"
              style={{ paddingBottom: 'calc(112px + env(safe-area-inset-bottom))' }}
            >
              <div className="relative w-full max-w-md h-full max-h-[680px]">
                {next2 && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-3xl bg-white/[0.04] border border-white/10"
                    style={{ transform: 'scale(0.92) translateY(16px)' }}
                  />
                )}
                {next1 && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-3xl bg-white/[0.06] border border-white/10"
                    style={{ transform: 'scale(0.96) translateY(8px)' }}
                  />
                )}
                <SwipeCard
                  key={current.id}
                  movie={current}
                  onSwipe={handleSwipe}
                  onOpenDetails={() => { openModal(current.id); }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          {source && current && (
            <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-3 flex items-center justify-center gap-5 bg-gradient-to-t from-[#0a0a10] to-transparent">
              <button
                type="button"
                onClick={() => handleSwipe('left')}
                aria-label={t('swipe.swipeLeft')}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-rose-500/30 border border-white/15 active:scale-95 transition-all flex items-center justify-center text-white"
              >
                <XIcon className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={() => handleSwipe('right')}
                aria-label={t('swipe.swipeRight')}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 active:scale-95 transition-all flex items-center justify-center text-white shadow-xl shadow-violet-500/40"
              >
                <Heart className="w-7 h-7 fill-current" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SourceButtonProps {
  icon: typeof Calendar;
  label: string;
  count?: number;
  accent: string;
  onClick: () => void;
  disabled?: boolean;
}

function SourceButton({ icon: Icon, label, count, accent, onClick, disabled }: SourceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-14 flex items-center gap-3 px-4 rounded-2xl border text-left transition-all ${
        disabled
          ? 'bg-white/[0.02] border-white/5 text-white/30 cursor-not-allowed'
          : 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20'
      }`}
    >
      <Icon className={`w-5 h-5 ${disabled ? '' : accent}`} aria-hidden="true" />
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {count !== undefined && <span className="text-xs text-white/40">{count}</span>}
    </button>
  );
}

interface SwipeCardProps {
  movie: SwipeableMovie;
  onSwipe: (direction: 'left' | 'right') => void;
  onOpenDetails: () => void;
}

function SwipeCard({ movie, onSwipe, onOpenDetails }: SwipeCardProps) {
  const { t, i18n } = useTranslation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -40], [1, 0]);

  // Detail fetch (synopsis enrichi, runtime, genres)
  const { data: details } = useQuery({
    queryKey: ['movieDetails', movie.id, i18n.language],
    queryFn: ({ signal }) => getMovieDetails(movie.id, signal),
    enabled: true,
    staleTime: 1000 * 60 * 30,
  });

  const overview = details?.overview || movie.overview || '';
  const runtime = details?.runtime;
  const genres = details?.genres || [];
  const director = details?.credits?.crew?.find((c) => c.job === 'Director');
  const rating = details?.vote_average ?? movie.vote_average;

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotate }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
          onSwipe('right');
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
          onSwipe('left');
        }
      }}
      whileTap={{ cursor: 'grabbing' }}
      className="absolute inset-0 rounded-3xl overflow-hidden bg-[#15151c] border border-white/10 shadow-2xl flex flex-col cursor-grab touch-pan-y"
    >
      {/* LIKE / PASS overlays */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-6 left-6 z-20 px-3 py-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-500/20 backdrop-blur-sm rotate-[-12deg]"
      >
        <span className="text-emerald-300 font-bold text-xl uppercase tracking-wider">{t('swipe.swipeRight')}</span>
      </motion.div>
      <motion.div
        style={{ opacity: passOpacity }}
        className="absolute top-6 right-6 z-20 px-3 py-1.5 rounded-xl border-2 border-rose-400 bg-rose-500/20 backdrop-blur-sm rotate-[12deg]"
      >
        <span className="text-rose-300 font-bold text-xl uppercase tracking-wider">{t('swipe.swipeLeft')}</span>
      </motion.div>

      {/* Scrollable content : poster en haut, infos qui se decouvrent au scroll.
          touch-pan-y permet le scroll vertical natif tandis que drag="x" gere
          le swipe horizontal. */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="relative">
          {movie.poster_path ? (
            <img
              src={`${IMG}${movie.poster_path}`}
              srcSet={posterSrcSet(movie.poster_path)}
              sizes="(min-width: 640px) 448px, 100vw"
              alt={movie.title}
              draggable={false}
              className="w-full aspect-[2/3] object-cover pointer-events-none select-none"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-white/5" />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#15151c] via-[#15151c]/85 to-transparent pt-16 pb-3 px-4">
            <h3 className="text-2xl font-bold text-white leading-tight mb-1.5">{movie.title}</h3>
            <div className="flex items-center gap-3 text-xs text-white/70 flex-wrap">
              {movie.release_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  {fmtDateLocalized(movie.release_date, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
              {rating !== undefined && rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {rating.toFixed(1)}
                </span>
              )}
              {runtime && <span>{runtime} min</span>}
            </div>
            <p className="mt-2 text-[11px] text-white/40 flex items-center gap-1 animate-pulse">
              <ChevronDown className="w-3 h-3" aria-hidden="true" />
              {t('swipe.details')}
            </p>
          </div>
        </div>

        <div className="px-4 pb-6 pt-4 space-y-4">
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.slice(0, 4).map((g) => (
                <span key={g.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70 font-semibold uppercase tracking-wider">
                  {g.name}
                </span>
              ))}
            </div>
          )}
          {director && (
            <p className="text-sm text-white/65">
              <span className="text-white/45">{t('modal.directedBy')}</span>{' '}
              <span className="font-semibold text-white">{director.name}</span>
            </p>
          )}
          {overview ? (
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">{overview}</p>
          ) : (
            <p className="text-sm text-white/40 italic">{t('modal.noSynopsis')}</p>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenDetails(); }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
            {t('picker.viewDetails')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
