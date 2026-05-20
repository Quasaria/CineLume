import { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Heart, Bookmark, Trash2, Calendar, Sparkles, Archive } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useSwipeBack } from '@/hooks/useSwipeBack';
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

function groupByRelease(items: FavoriteMovie[], prefix: string): Group[] {
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
    { key: 'week' as const, labelKey: `${prefix}.weekSection`, icon: Calendar, accent: 'text-cyan-300', items: week },
    { key: 'upcoming' as const, labelKey: `${prefix}.upcomingSection`, icon: Sparkles, accent: 'text-violet-300', items: upcoming },
    { key: 'released' as const, labelKey: `${prefix}.releasedSection`, icon: Archive, accent: 'text-white/60', items: released },
    { key: 'undated' as const, labelKey: `${prefix}.undatedSection`, icon: Archive, accent: 'text-white/50', items: undated },
  ].filter((g) => g.items.length > 0);
}

/**
 * Modale unifiee Favoris + Watchlist : deux onglets dans la meme vue, plus
 * besoin de fermer l'une pour ouvrir l'autre. La logique est partagee
 * (regroupement par date de sortie, action de remove, click pour ouvrir
 * la modale film). L'onglet courant est dans le store pour que les deux
 * icones du Navbar (cœur, bookmark) ouvrent la modale sur le bon onglet.
 */
export function CollectionsModal() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isOpen = useAppStore((s) => s.isFavOpen);
  const closeModal = useAppStore((s) => s.closeFavorites);
  const tab = useAppStore((s) => s.collectionsTab);
  const setTab = useAppStore((s) => s.setCollectionsTab);
  const favorites = useAppStore((s) => s.favorites);
  const watchlist = useAppStore((s) => s.watchlist);
  const removeFav = useAppStore((s) => s.removeFav);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);
  const openFilmModal = useAppStore((s) => s.openModal);

  const items = tab === 'favorites' ? favorites : watchlist;
  const prefix = tab === 'favorites' ? 'favorites' : 'watchlist';
  const groups = useMemo(() => groupByRelease(items, prefix), [items, prefix]);
  const fmtDate = (d?: string) => fmtDateLocalized(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragToClose({ onClose: closeModal, contentRef });

  useBodyScrollLock(isOpen);
  useSwipeBack({ onBack: closeModal, enabled: isOpen });
  useFocusRestore(isOpen);

  function handleRemove(id: number) {
    if (tab === 'favorites') removeFav(id);
    else removeFromWatchlist(id);
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            onClick={closeModal}
          />
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="collections-modal-title"
            className="relative bg-[#0f0f15] rounded-t-3xl md:rounded-3xl px-5 pt-3 pb-6 md:p-6 max-w-lg w-full max-h-[90dvh] md:max-h-[80vh] border border-white/10 shadow-2xl flex flex-col"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mx-auto mb-3 md:hidden" aria-hidden="true" />

            <ModalHeader
              titleId="collections-modal-title"
              onBack={closeModal}
              backLabel={t(`${prefix}.close`)}
              title={t('collections.title')}
            />

            {/* Tabs : favoris / watchlist. Toujours visibles meme si l'un
                est vide, pour que l'user puisse switcher. */}
            <div role="tablist" aria-label={t('collections.title')} className="flex gap-1 p-1 mb-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <TabButton
                active={tab === 'favorites'}
                onClick={() => setTab('favorites')}
                icon={Heart}
                label={t('favorites.title')}
                count={favorites.length}
                activeColor="text-red-300"
                activeBg="bg-red-500/10 border-red-500/30"
              />
              <TabButton
                active={tab === 'watchlist'}
                onClick={() => setTab('watchlist')}
                icon={Bookmark}
                label={t('watchlist.title')}
                count={watchlist.length}
                activeColor="text-cyan-300"
                activeBg="bg-cyan-500/10 border-cyan-500/30"
              />
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
                  {tab === 'favorites' ? (
                    <Heart className="w-7 h-7 text-white/30" aria-hidden="true" />
                  ) : (
                    <Bookmark className="w-7 h-7 text-white/30" aria-hidden="true" />
                  )}
                </div>
                <p className="text-white/60 text-sm">{t(`${prefix}.empty`)}</p>
                <p className="text-white/40 text-xs mt-1">{t(`${prefix}.emptyHint`)}</p>
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
                              closeModal();
                              openFilmModal(f.id);
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
                              aria-label={t(`${prefix}.remove`, { title: f.title })}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(f.id);
                              }}
                              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors shrink-0"
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

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Heart;
  label: string;
  count: number;
  activeColor: string;
  activeBg: string;
}

function TabButton({ active, onClick, icon: Icon, label, count, activeColor, activeBg }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 min-h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all border ${
        active
          ? `${activeBg} ${activeColor}`
          : 'border-transparent text-white/65 hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'fill-current' : ''}`} aria-hidden="true" />
      <span className="truncate">{label}</span>
      <span className={`text-xs font-medium ${active ? 'opacity-80' : 'text-white/40'}`}>{count}</span>
    </button>
  );
}
