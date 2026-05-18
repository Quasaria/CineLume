import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Trash2, Calendar, Sparkles, Archive } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG } from '@/lib/tmdb';
import { fmtDateFR } from '@/lib/utils';
import type { FavoriteMovie } from '@/types/movie';

const fmtDate = (d?: string) => fmtDateFR(d);

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

interface Group {
  key: 'week' | 'upcoming' | 'released' | 'undated';
  label: string;
  icon: typeof Calendar;
  accent: string;
  items: FavoriteMovie[];
}

function groupFavorites(favorites: FavoriteMovie[]): Group[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const week: FavoriteMovie[] = [];
  const upcoming: FavoriteMovie[] = [];
  const released: FavoriteMovie[] = [];
  const undated: FavoriteMovie[] = [];

  for (const fav of favorites) {
    const d = parseLocalDate(fav.release_date);
    if (!d) {
      undated.push(fav);
    } else if (d < today) {
      released.push(fav);
    } else if (d <= weekEnd) {
      week.push(fav);
    } else {
      upcoming.push(fav);
    }
  }

  const byDateAsc = (a: FavoriteMovie, b: FavoriteMovie) =>
    (a.release_date || '').localeCompare(b.release_date || '');
  const byDateDesc = (a: FavoriteMovie, b: FavoriteMovie) =>
    (b.release_date || '').localeCompare(a.release_date || '');

  week.sort(byDateAsc);
  upcoming.sort(byDateAsc);
  released.sort(byDateDesc);

  return [
    { key: 'week', label: 'Cette semaine', icon: Calendar, accent: 'text-violet-300', items: week },
    { key: 'upcoming', label: 'À venir', icon: Sparkles, accent: 'text-cyan-300', items: upcoming },
    { key: 'released', label: 'Sortis', icon: Archive, accent: 'text-white/60', items: released },
    { key: 'undated', label: 'Date inconnue', icon: Archive, accent: 'text-white/50', items: undated },
  ].filter((g) => g.items.length > 0);
}

export function FavoritesModal() {
  const { isFavOpen, closeFavorites, favorites, removeFav, openModal } = useAppStore();
  const groups = useMemo(() => groupFavorites(favorites), [favorites]);

  return (
    <AnimatePresence>
      {isFavOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeFavorites}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[#0f0f15] rounded-3xl p-6 max-w-lg w-full max-h-[80vh] border border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" aria-hidden="true" />
                Mes favoris
                {favorites.length > 0 && (
                  <span className="text-white/60 text-sm font-medium">({favorites.length})</span>
                )}
              </h3>
              <button
                type="button"
                onClick={closeFavorites}
                aria-label="Fermer la liste des favoris"
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" aria-hidden="true" />
              </button>
            </div>

            {favorites.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-white/30" aria-hidden="true" />
                </div>
                <p className="text-white/60 text-sm">Aucun favori pour l'instant</p>
                <p className="text-white/40 text-xs mt-1">Clique sur le cœur d'un film pour l'ajouter</p>
              </div>
            ) : (
              <div className="overflow-y-auto custom-scroll flex-1 -mx-2 px-2 space-y-5">
                {groups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <section key={group.key}>
                      <h4 className={`flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold mb-2 ${group.accent}`}>
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        {group.label}
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
                              closeFavorites();
                              openModal(f.id);
                            }}
                          >
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                              {f.poster_path && (
                                <img
                                  src={`${IMG}${f.poster_path}`}
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
                              aria-label={`Retirer ${f.title} des favoris`}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFav(f.id);
                              }}
                              className="p-2 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
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
