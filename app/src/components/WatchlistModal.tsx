import { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Bookmark, Trash2, Calendar, Sparkles, Archive } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDragToClose } from '@/hooks/useDragToClose';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import type { FavoriteMovie } from '@/types/movie';

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

interface Group {
  key: 'week' | 'upcoming' | 'released' | 'undated';
  labelKey: string;
  icon: typeof Calendar;
  accent: string;
  items: FavoriteMovie[];
}

function groupWatchlist(items: FavoriteMovie[]): Group[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const week: FavoriteMovie[] = [];
  const upcoming: FavoriteMovie[] = [];
  const released: FavoriteMovie[] = [];
  const undated: FavoriteMovie[] = [];

  for (const it of items) {
    const d = parseLocalDate(it.release_date);
    if (!d) undated.push(it);
    else if (d < today) released.push(it);
    else if (d <= weekEnd) week.push(it);
    else upcoming.push(it);
  }

  const byDateAsc = (a: FavoriteMovie, b: FavoriteMovie) =>
    (a.release_date || '').localeCompare(b.release_date || '');
  const byDateDesc = (a: FavoriteMovie, b: FavoriteMovie) =>
    (b.release_date || '').localeCompare(a.release_date || '');

  week.sort(byDateAsc);
  upcoming.sort(byDateAsc);
  released.sort(byDateDesc);

  return [
    { key: 'week' as const, labelKey: 'watchlist.weekSection', icon: Calendar, accent: 'text-cyan-300', items: week },
    { key: 'upcoming' as const, labelKey: 'watchlist.upcomingSection', icon: Sparkles, accent: 'text-violet-300', items: upcoming },
    { key: 'released' as const, labelKey: 'watchlist.releasedSection', icon: Archive, accent: 'text-white/60', items: released },
    { key: 'undated' as const, labelKey: 'watchlist.undatedSection', icon: Archive, accent: 'text-white/50', items: undated },
  ].filter((g) => g.items.length > 0);
}

export function WatchlistModal() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { isWatchlistOpen, closeWatchlist, watchlist, removeFromWatchlist, openModal } = useAppStore();
  const groups = useMemo(() => groupWatchlist(watchlist), [watchlist]);
  const fmtDate = (d?: string) => fmtDateLocalized(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragToClose({ onClose: closeWatchlist, contentRef });
  useBodyScrollLock(isWatchlistOpen);
  useFocusRestore(isWatchlistOpen);

  return (
    <AnimatePresence>
      {isWatchlistOpen && (
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
            onClick={closeWatchlist}
          />
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="watchlist-modal-title"
            className="relative bg-[#0f0f15] rounded-t-3xl md:rounded-3xl px-5 pt-3 pb-6 md:p-6 max-w-lg w-full max-h-[90dvh] md:max-h-[80vh] border border-white/10 shadow-2xl flex flex-col"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mx-auto mb-3 md:hidden" aria-hidden="true" />
            <div className="flex items-center justify-between mb-4">
              <h3 id="watchlist-modal-title" className="font-bold text-2xl tracking-tight flex items-center gap-2.5">
                <Bookmark className="w-6 h-6 text-cyan-400 fill-cyan-400" aria-hidden="true" />
                {t('watchlist.title')}
                {watchlist.length > 0 && (
                  <span className="text-white/55 text-sm font-medium">({watchlist.length})</span>
                )}
              </h3>
              <button
                type="button"
                onClick={closeWatchlist}
                aria-label={t('watchlist.close')}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" aria-hidden="true" />
              </button>
            </div>

            {watchlist.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Bookmark className="w-7 h-7 text-white/30" aria-hidden="true" />
                </div>
                <p className="text-white/60 text-sm">{t('watchlist.empty')}</p>
                <p className="text-white/40 text-xs mt-1">{t('watchlist.emptyHint')}</p>
              </div>
            ) : (
              <div ref={contentRef} className="overflow-y-auto custom-scroll overscroll-contain flex-1 -mx-2 px-2 space-y-5">
                {groups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <section key={group.key}>
                      <h4 className={`flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold mb-2 ${group.accent}`}>
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        {t(group.labelKey)}
                        <span className="text-white/40 normal-case tracking-normal font-medium">({group.items.length})</span>
                      </h4>
                      <div className="space-y-1">
                        {group.items.map((f) => (
                          <motion.div
                            key={f.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors"
                            onClick={() => {
                              closeWatchlist();
                              openModal(f.id);
                            }}
                          >
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                              {f.poster_path && (
                                <img
                                  src={`${IMG}${f.poster_path}`}
                                  srcSet={posterSrcSet(f.poster_path)}
                                  sizes="40px"
                                  alt={f.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{f.title}</p>
                              <p className="text-xs text-white/60">{fmtDate(f.release_date)}</p>
                            </div>
                            <button
                              type="button"
                              aria-label={t('watchlist.remove', { title: f.title })}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromWatchlist(f.id);
                              }}
                              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
