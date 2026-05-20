import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Shuffle, Sparkles, Star, Bookmark, Folder, Calendar, Info } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getGenres, IMG, posterSrcSet } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDragToClose } from '@/hooks/useDragToClose';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import type { FavoriteMovie } from '@/types/movie';

type Source = 'watchlist' | 'favorites' | 'lists';

interface SourceOption {
  id: Source;
  labelKey: string;
  icon: typeof Bookmark;
  accent: string;
  items: FavoriteMovie[];
}

export function PickerModal() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const isPickerOpen = useAppStore((s) => s.isPickerOpen);
  const closePicker = useAppStore((s) => s.closePicker);
  const openModal = useAppStore((s) => s.openModal);
  const watchlist = useAppStore((s) => s.watchlist);
  const favorites = useAppStore((s) => s.favorites);
  const customLists = useAppStore((s) => s.customLists);

  const allListsFilms = useMemo<FavoriteMovie[]>(() => {
    const map = new Map<number, FavoriteMovie>();
    for (const l of customLists) for (const f of l.films) map.set(f.id, f);
    return Array.from(map.values());
  }, [customLists]);

  const sources: SourceOption[] = useMemo(
    () => [
      { id: 'watchlist', labelKey: 'picker.sourceWatchlist', icon: Bookmark, accent: 'text-cyan-300', items: watchlist },
      { id: 'favorites', labelKey: 'picker.sourceFavorites', icon: Star, accent: 'text-rose-300', items: favorites },
      { id: 'lists', labelKey: 'picker.sourceLists', icon: Folder, accent: 'text-violet-300', items: allListsFilms },
    ],
    [watchlist, favorites, allListsFilms],
  );

  // Source par defaut = la 1ere non-vide. Fallback : watchlist.
  const defaultSource: Source = sources.find((s) => s.items.length > 0)?.id ?? 'watchlist';
  const [source, setSource] = useState<Source>(defaultSource);
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [pick, setPick] = useState<FavoriteMovie | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragToClose({ onClose: closePicker, contentRef });
  useBodyScrollLock(isPickerOpen);
  useFocusRestore(isPickerOpen);
  useSwipeBack({ onBack: closePicker, enabled: isPickerOpen });

  // Reset le source quand on ouvre la modale a un truc qui contient des films
  useEffect(() => {
    if (isPickerOpen) {
      setSource(sources.find((s) => s.items.length > 0)?.id ?? 'watchlist');
      setPick(null);
    }
  }, [isPickerOpen, sources]);

  // Genres optionnel : on ne fetch que si la modale est ouverte
  const { data: genres } = useQuery({
    queryKey: ['genres', i18n.language],
    queryFn: ({ signal }) => getGenres(signal),
    enabled: isPickerOpen,
    staleTime: 1000 * 60 * 60,
  });

  const currentItems = sources.find((s) => s.id === source)?.items ?? [];

  function rollPick() {
    let pool = currentItems;
    if (genreFilter) {
      // FavoriteMovie a genre_ids depuis la migration de stockage. Les
      // entrees legacy (ajoutees avant) n'en ont pas : on les inclut quand
      // meme pour ne pas les rendre invisibles d'un coup quand l'user pose
      // un filtre. Au fil du temps elles seront re-ajoutees avec le champ.
      const gid = parseInt(genreFilter, 10);
      pool = pool.filter((m) => !m.genre_ids || m.genre_ids.includes(gid));
    }
    if (pool.length === 0) {
      setPick(null);
      return;
    }
    // Evite de piocher le meme deux fois de suite. Safety cap a 20 tirages
    // pour ne pas boucler a l'infini si le pool a un doublon par id (cas
    // pathologique improbable mais defensif).
    let next: FavoriteMovie = pool[0];
    if (pool.length === 1) {
      next = pool[0];
    } else {
      let attempts = 0;
      do {
        next = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
      } while (pick && next.id === pick.id && attempts < 20);
    }
    setPick(next);
  }

  function handleViewDetails() {
    if (!pick) return;
    openModal(pick.id);
    closePicker();
  }

  return (
    <AnimatePresence>
      {isPickerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePicker}
          />
          <motion.div
            ref={contentRef}
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="picker-modal-title"
            className="relative bg-[#0f0f15] rounded-t-3xl md:rounded-3xl px-5 pt-3 pb-6 md:p-6 max-w-lg w-full max-h-[90dvh] md:max-h-[80vh] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mx-auto mb-3 md:hidden" aria-hidden="true" />

            <ModalHeader
              titleId="picker-modal-title"
              onBack={closePicker}
              backLabel={t('picker.close')}
              title={
                <span className="flex items-center gap-2.5">
                  <Shuffle className="w-6 h-6 text-violet-400" aria-hidden="true" />
                  {t('picker.title')}
                </span>
              }
            />
            <p className="text-sm text-white/55 mb-4 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              {t('picker.subtitle')}
            </p>

            <div className="overflow-y-auto flex-1 -mx-5 px-5 md:mx-0 md:px-0 space-y-5">
              {/* Source selector */}
              <section aria-label={t('picker.source')}>
                <h4 className="text-[11px] font-bold text-white/55 uppercase tracking-wider mb-2">{t('picker.source')}</h4>
                <div className="grid grid-cols-3 gap-2">
                  {sources.map((s) => {
                    const Icon = s.icon;
                    const active = source === s.id;
                    const disabled = s.items.length === 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (disabled) return;
                          setSource(s.id);
                          setPick(null);
                        }}
                        disabled={disabled}
                        aria-pressed={active}
                        className={`min-h-11 flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl border text-xs font-semibold transition-all ${
                          active
                            ? 'bg-violet-500/20 border-violet-400/50 text-white'
                            : disabled
                              ? 'bg-white/[0.02] border-white/5 text-white/30 cursor-not-allowed'
                              : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.07] hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? s.accent : ''}`} aria-hidden="true" />
                        <span className="truncate w-full text-center">{t(s.labelKey)}</span>
                        <span className="text-[10px] text-white/40 font-normal">{s.items.length}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Genre filter */}
              {genres && genres.length > 0 && (
                <section aria-label={t('picker.filters')}>
                  <h4 className="text-[11px] font-bold text-white/55 uppercase tracking-wider mb-2">{t('picker.filters')}</h4>
                  <div className="relative">
                    <select
                      value={genreFilter}
                      onChange={(e) => { setGenreFilter(e.target.value); setPick(null); }}
                      className="w-full appearance-none min-h-11 px-3 pr-10 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-medium text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
                      aria-label={t('picker.filters')}
                    >
                      <option value="">{t('picker.genreAll')}</option>
                      {genres.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">▾</span>
                  </div>
                </section>
              )}

              {/* Pick result card */}
              <section aria-live="polite" className="min-h-[160px]">
                {pick ? (
                  <motion.div
                    key={pick.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-white/10 p-3 flex gap-3"
                  >
                    {pick.poster_path ? (
                      <img
                        src={`${IMG}${pick.poster_path}`}
                        srcSet={posterSrcSet(pick.poster_path)}
                        sizes="100px"
                        alt=""
                        className="w-[100px] h-[150px] rounded-xl object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-[100px] h-[150px] rounded-xl bg-white/5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <Sparkles className="w-4 h-4 text-violet-300 mb-1.5" aria-hidden="true" />
                      <p className="text-lg font-bold text-white leading-tight mb-1 line-clamp-3">{pick.title}</p>
                      <p className="text-xs text-white/55 mb-3 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        {fmtDateLocalized(pick.release_date, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-auto">
                        <button
                          type="button"
                          onClick={handleViewDetails}
                          className="px-3 py-2 min-h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-600 text-white flex items-center gap-1.5"
                        >
                          {t('picker.viewDetails')}
                        </button>
                        <button
                          type="button"
                          onClick={rollPick}
                          className="px-3 py-2 min-h-11 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5"
                        >
                          <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                          {t('picker.pickAgain')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : currentItems.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm font-semibold text-white/85 mb-1">{t('picker.empty')}</p>
                    <p className="text-xs text-white/50">{t('picker.emptyHint')}</p>
                  </div>
                ) : null}
              </section>
            </div>

            {/* Pioche button (sticky bottom) */}
            {!pick && currentItems.length > 0 && (
              <button
                type="button"
                onClick={rollPick}
                className="mt-4 w-full min-h-12 rounded-xl text-base font-bold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                <Shuffle className="w-5 h-5" aria-hidden="true" />
                {t('picker.pick')}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
