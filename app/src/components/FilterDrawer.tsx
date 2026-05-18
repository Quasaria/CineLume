import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Film, Tv, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import type { ReleaseMode } from '@/store/appStore';
import { getGenres, PROVIDERS } from '@/lib/tmdb';
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

const RELEASE_MODES: { value: ReleaseMode; label: string; icon: typeof Film }[] = [
  { value: 'all', label: 'Tout', icon: Sparkles },
  { value: 'theater', label: 'Salle', icon: Film },
  { value: 'platform', label: 'Plateforme', icon: Tv },
];

export function FilterDrawer() {
  const {
    isFilterOpen, closeFilters,
    selRegion, selGenre, selReleaseMode, selProvider,
    setRegion, setGenre, setReleaseMode, setProvider,
  } = useAppStore();
  const [tempRegion, setTempRegion] = useState(selRegion);
  const [tempGenre, setTempGenre] = useState(selGenre);
  const [tempMode, setTempMode] = useState<ReleaseMode>(selReleaseMode);
  const [tempProvider, setTempProvider] = useState(selProvider);

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });

  useEffect(() => {
    if (isFilterOpen) {
      setTempRegion(selRegion);
      setTempGenre(selGenre);
      setTempMode(selReleaseMode);
      setTempProvider(selProvider);
    }
  }, [isFilterOpen, selRegion, selGenre, selReleaseMode, selProvider]);

  function apply() {
    setRegion(tempRegion);
    setGenre(tempGenre);
    setReleaseMode(tempMode);
    setProvider(tempMode === 'platform' ? tempProvider : '');
    closeFilters();
  }

  function reset() {
    setTempRegion('FR');
    setTempGenre('');
    setTempMode('all');
    setTempProvider('');
  }

  const activeCount =
    (tempRegion !== 'FR' ? 1 : 0) +
    (tempGenre ? 1 : 0) +
    (tempMode !== 'all' ? 1 : 0) +
    (tempProvider ? 1 : 0);

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
              <div className="flex items-center gap-2.5">
                <h2 className="font-bold text-xl">Filtres</h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/30">
                    {activeCount} actif{activeCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={closeFilters}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scroll">
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                  Type de sortie
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {RELEASE_MODES.map((m) => {
                    const Icon = m.icon;
                    const active = tempMode === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setTempMode(m.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border ${
                          active
                            ? 'border-violet-500/60 bg-violet-500/15 text-white shadow-lg shadow-violet-500/20'
                            : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-violet-300' : ''}`} />
                        <span className="text-xs font-semibold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {tempMode === 'platform' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                    Plateforme
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTempProvider('')}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                        tempProvider === ''
                          ? 'border-violet-500/60 bg-violet-500/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/5'
                      }`}
                    >
                      Toutes
                    </button>
                    {PROVIDERS.map((p) => {
                      const active = tempProvider === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setTempProvider(active ? '' : p.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                            active
                              ? 'border-violet-500/60 bg-violet-500/15 text-white'
                              : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 text-violet-300" />}
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                  Pays de sortie
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {REGIONS.map((r) => {
                    const active = tempRegion === r.code;
                    return (
                      <button
                        key={r.code}
                        onClick={() => setTempRegion(active ? '' : r.code)}
                        className={`flex items-center gap-2 p-3 rounded-xl transition-all text-left border ${
                          active
                            ? 'border-violet-500/60 bg-violet-500/15 shadow-lg shadow-violet-500/15'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg shrink-0">{r.flag}</span>
                        <span className={`text-sm font-medium flex-1 ${active ? 'text-white' : 'text-white/80'}`}>{r.name}</span>
                        {active && <Check className="w-4 h-4 text-violet-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {genres?.map((g) => {
                    const active = tempGenre === String(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => setTempGenre(active ? '' : String(g.id))}
                        className={`pill px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          active
                            ? 'active bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/40'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {g.name}
                      </button>
                    );
                  })}
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
