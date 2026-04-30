import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { getGenres } from '@/lib/tmdb';
import { useQuery } from '@tanstack/react-query';
import type { Region } from '@/types/movie';

const REGIONS: Region[] = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
  { code: 'GB', name: 'R.-U.', flag: '🇬🇧' },
  { code: 'JP', name: 'Japon', flag: '🇯🇵' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹' },
  { code: 'KR', name: 'Corée', flag: '🇰🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australie', flag: '🇦🇺' },
  { code: 'BR', name: 'Brésil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexique', flag: '🇲🇽' },
  { code: 'IN', name: 'Inde', flag: '🇮🇳' },
  { code: 'CN', name: 'Chine', flag: '🇨🇳' },
  { code: 'RU', name: 'Russie', flag: '🇷🇺' },
  { code: 'SE', name: 'Suède', flag: '🇸🇪' },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭' },
  { code: 'AT', name: 'Autriche', flag: '🇦🇹' },
];

export function FilterDrawer() {
  const { isFilterOpen, closeFilters, selRegion, selGenre, setRegion, setGenre } = useAppStore();
  const [tempRegion, setTempRegion] = useState(selRegion);
  const [tempGenre, setTempGenre] = useState(selGenre);

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });

  useEffect(() => {
    if (isFilterOpen) {
      setTempRegion(selRegion);
      setTempGenre(selGenre);
    }
  }, [isFilterOpen, selRegion, selGenre]);

  function apply() {
    setRegion(tempRegion);
    setGenre(tempGenre);
    closeFilters();
  }

  function reset() {
    setTempRegion('FR');
    setTempGenre('');
  }

  return (
    <AnimatePresence>
      {isFilterOpen && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeFilters}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-[#0f0f15] border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-bold text-xl">Filtres</h2>
              <button
                onClick={closeFilters}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8">
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                  Pays de sortie
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {REGIONS.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => setTempRegion(tempRegion === r.code ? '' : r.code)}
                      className={`flex items-center gap-2 p-3 rounded-xl transition-all text-left border ${
                        tempRegion === r.code
                          ? 'border-violet-500/50 bg-violet-500/10'
                          : 'border-transparent bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{r.flag}</span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {genres?.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setTempGenre(tempGenre === String(g.id) ? '' : String(g.id))}
                      className={`pill px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tempGenre === String(g.id)
                          ? 'active bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/40'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold text-sm transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={apply}
                className="flex-1 py-3 rounded-xl btn-primary text-white font-semibold text-sm bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500"
              >
                Appliquer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
