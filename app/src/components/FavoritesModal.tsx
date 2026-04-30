import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG } from '@/lib/tmdb';

function fmtDate(d?: string) {
  if (!d) return 'Date inconnue';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export function FavoritesModal() {
  const { isFavOpen, closeFavorites, favorites, removeFav, openModal } = useAppStore();

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
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                Mes favoris
              </h3>
              <button
                onClick={closeFavorites}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {favorites.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">Aucun favori</div>
            ) : (
              <div className="overflow-y-auto custom-scroll flex-1 -mx-2 px-2 space-y-1">
                {favorites.map((f) => (
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
                      <img
                        src={`${IMG}${f.poster_path}`}
                        alt={f.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{f.title}</p>
                      <p className="text-xs text-white/30">{fmtDate(f.release_date)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFav(f.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
