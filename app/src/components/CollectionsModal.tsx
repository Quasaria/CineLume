import { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Heart, Bookmark, Trash2, Calendar, Sparkles, Archive, Film, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
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
  key: 'cinema' | 'week' | 'upcoming' | 'released' | 'undated';
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
  // Films sortis dans les 21 derniers jours = probablement encore au
  // cinema (les sorties tiennent ~2-4 semaines en salles). On les met
  // en premier, c'est ce que l'user a le plus de chance de vouloir voir
  // tout de suite.
  const cinemaStart = new Date(today);
  cinemaStart.setDate(today.getDate() - 21);

  const cinema: FavoriteMovie[] = [];
  const week: FavoriteMovie[] = [];
  const upcoming: FavoriteMovie[] = [];
  const released: FavoriteMovie[] = [];
  const undated: FavoriteMovie[] = [];

  for (const it of items) {
    const d = parseLocalDate(it.release_date);
    if (!d) undated.push(it);
    else if (d < cinemaStart) released.push(it);
    else if (d < today) cinema.push(it);
    else if (d <= weekEnd) week.push(it);
    else upcoming.push(it);
  }

  const byDateAsc = (a: FavoriteMovie, b: FavoriteMovie) =>
    (a.release_date || '').localeCompare(b.release_date || '');
  const byDateDesc = (a: FavoriteMovie, b: FavoriteMovie) =>
    (b.release_date || '').localeCompare(a.release_date || '');

  // Section 'Actuellement au cinema' triee par date de sortie la plus
  // recente d'abord (les sorties du jour avant celles d'il y a 3 semaines).
  cinema.sort(byDateDesc);
  week.sort(byDateAsc);
  upcoming.sort(byDateAsc);
  released.sort(byDateDesc);

  return [
    { key: 'cinema' as const, labelKey: 'collections.inCinemaSection', icon: Film, accent: 'text-amber-300', items: cinema },
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
  const tabRaw = useAppStore((s) => s.collectionsTab);
  // Defensive : l'onglet 'seen' a ete retire (Mon Calendrier le remplace).
  // Si le store contient encore cette valeur (legacy), on retombe sur favoris.
  const tab: 'favorites' | 'watchlist' = tabRaw === 'watchlist' ? 'watchlist' : 'favorites';
  const setTab = useAppStore((s) => s.setCollectionsTab);
  const favorites = useAppStore((s) => s.favorites);
  const watchlist = useAppStore((s) => s.watchlist);
  const removeFav = useAppStore((s) => s.removeFav);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);
  const openFilmModal = useAppStore((s) => s.openModal);

  const items: FavoriteMovie[] = tab === 'favorites' ? favorites : watchlist;
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
            aria-label={t('collections.title')}
            className="relative bg-[#0f0f15] rounded-t-3xl md:rounded-3xl px-5 pt-3 pb-6 md:p-6 max-w-lg w-full max-h-[90dvh] md:max-h-[80vh] border border-white/10 shadow-2xl flex flex-col"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mx-auto mb-3 md:hidden" aria-hidden="true" />

            {/* Header compact : back + tab strip sur une seule ligne.
                Pas de titre separe ; les tabs servent de heading puisque
                seules deux sources existent (favoris + watchlist), le titre
                "Mes films" etait redondant. */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={closeModal}
                aria-label={t(`${prefix}.close`)}
                className="min-w-11 min-h-11 -ml-1 shrink-0 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 text-white/75 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <div role="tablist" aria-label={t('collections.title')} className="flex-1 flex gap-1 p-0.5 rounded-xl bg-white/[0.03]">
                <TabButton
                  active={tab === 'favorites'}
                  onClick={() => setTab('favorites')}
                  icon={Heart}
                  label={t('favorites.title')}
                  count={favorites.length}
                  activeColor="text-red-300"
                />
                <TabButton
                  active={tab === 'watchlist'}
                  onClick={() => setTab('watchlist')}
                  icon={Bookmark}
                  label={t('watchlist.title')}
                  count={watchlist.length}
                  activeColor="text-cyan-300"
                />
              </div>
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
                        {group.items.flatMap((f, idx) => {
                          // Micro-demarcation par mois dans 'A venir' :
                          // insere un petit header de mois entre les films
                          // quand le mois change entre deux entrees consecutives.
                          // flatMap permet d'inserer le header au meme niveau
                          // que la motion.div, sans Fragment qui casserait le
                          // tracking de key/layout par framer-motion.
                          const showMonthDivider = group.key === 'upcoming' && (() => {
                            if (idx === 0) return true;
                            const prev = group.items[idx - 1];
                            const prevMonth = (prev.release_date || '').slice(0, 7);
                            const curMonth = (f.release_date || '').slice(0, 7);
                            return prevMonth !== curMonth;
                          })();
                          const monthLabel = group.key === 'upcoming' && f.release_date
                            ? fmtDateLocalized(f.release_date, { month: 'long', year: 'numeric' })
                            : null;
                          const monthKey = f.release_date?.slice(0, 7) || 'unknown';
                          const nodes = [];
                          if (showMonthDivider && monthLabel) {
                            nodes.push(
                              <p key={`month-${monthKey}`} className="text-[10px] uppercase tracking-wider font-bold text-white/45 px-2 pt-2 pb-1 first:pt-0">
                                {monthLabel}
                              </p>
                            );
                          }
                          nodes.push(
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
                          );
                          return nodes;
                        })}
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
}

function TabButton({ active, onClick, icon: Icon, label, count, activeColor }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 min-h-10 px-2.5 flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-all ${
        active
          ? `bg-white/[0.07] text-white shadow-sm`
          : 'text-white/55 hover:text-white/85'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${active ? `${activeColor} fill-current` : ''}`} aria-hidden="true" />
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span className={`text-[11px] tabular-nums font-bold ${active ? 'text-white/75' : 'text-white/35'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
