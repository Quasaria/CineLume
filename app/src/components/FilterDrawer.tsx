import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Film, Tv, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import type { ReleaseMode } from '@/store/appStore';
import { getGenres, PROVIDERS } from '@/lib/tmdb';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDragToClose } from '@/hooks/useDragToClose';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import { ProviderBadge } from '@/components/ProviderBadge';

const REGION_CODES = ['FR', 'US', 'GB', 'JP', 'DE', 'ES', 'IT', 'KR', 'CA', 'AU', 'BR', 'MX', 'IN', 'CN', 'RU', 'SE', 'NL', 'BE', 'CH', 'AT'] as const;
const FLAGS: Record<string, string> = {
  FR: '🇫🇷', US: '🇺🇸', GB: '🇬🇧', JP: '🇯🇵', DE: '🇩🇪', ES: '🇪🇸',
  IT: '🇮🇹', KR: '🇰🇷', CA: '🇨🇦', AU: '🇦🇺', BR: '🇧🇷', MX: '🇲🇽',
  IN: '🇮🇳', CN: '🇨🇳', RU: '🇷🇺', SE: '🇸🇪', NL: '🇳🇱', BE: '🇧🇪',
  CH: '🇨🇭', AT: '🇦🇹',
};

const RELEASE_MODES: { value: ReleaseMode; icon: typeof Film }[] = [
  { value: 'all', icon: Sparkles },
  { value: 'theater', icon: Film },
  { value: 'platform', icon: Tv },
];

export function FilterDrawer() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isMobile = useIsMobile();
  const {
    isFilterOpen, closeFilters,
    selRegion, selGenre, selReleaseMode, selProvider,
    setRegion, setGenre, setReleaseMode, setProvider,
  } = useAppStore();
  const [tempRegion, setTempRegion] = useState(selRegion);
  const [tempGenre, setTempGenre] = useState(selGenre);
  const [tempMode, setTempMode] = useState<ReleaseMode>(selReleaseMode);
  const [tempProvider, setTempProvider] = useState(selProvider);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragToClose({ onClose: closeFilters, contentRef });
  useBodyScrollLock(isFilterOpen);
  useFocusRestore(isFilterOpen);

  const { data: genres } = useQuery({
    queryKey: ['genres', lang],
    queryFn: ({ signal }) => getGenres(signal),
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
    setTempMode('theater');
    setTempProvider('');
  }

  const activeCount =
    (tempRegion !== 'FR' ? 1 : 0) +
    (tempGenre ? 1 : 0) +
    (tempMode !== 'theater' ? 1 : 0) +
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
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-modal-title"
            className="absolute left-0 right-0 bottom-0 sm:left-auto sm:top-0 sm:bottom-0 w-full sm:max-w-sm sm:h-full max-h-[90dvh] sm:max-h-none bg-[#0f0f15] border-t sm:border-t-0 sm:border-l border-white/10 shadow-2xl flex flex-col rounded-t-3xl sm:rounded-none"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mt-3 mx-auto sm:hidden" aria-hidden="true" />
            <div className="flex items-center justify-between p-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <h2 id="filter-modal-title" className="font-bold text-2xl tracking-tight">{t('filters.title')}</h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/30">
                    {t('filters.active', { count: activeCount })}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeFilters}
                aria-label={t('filters.close')}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" aria-hidden="true" />
              </button>
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto p-5 space-y-8 custom-scroll overscroll-contain">
              <div>
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
                  {t('filters.releaseType')}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {RELEASE_MODES.map((m) => {
                    const Icon = m.icon;
                    const active = tempMode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setTempMode(m.value)}
                        aria-pressed={active}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border ${
                          active
                            ? 'border-violet-500/60 bg-violet-500/15 text-white shadow-lg shadow-violet-500/20'
                            : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-violet-300' : ''}`} aria-hidden="true" />
                        <span className="text-xs font-semibold">{t(`modes.${m.value}`)}</span>
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
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
                    {t('filters.platform')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTempProvider('')}
                      aria-pressed={tempProvider === ''}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                        tempProvider === ''
                          ? 'border-violet-500/60 bg-violet-500/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5'
                      }`}
                    >
                      {t('filters.platformAll')}
                    </button>
                    {PROVIDERS.map((p) => {
                      const active = tempProvider === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setTempProvider(active ? '' : p.id)}
                          aria-pressed={active}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 ${
                            active
                              ? 'border-violet-500/60 bg-violet-500/15 text-white'
                              : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5'
                          }`}
                        >
                          <ProviderBadge provider={p} size="sm" />
                          {p.name}
                          {active && <Check className="w-3 h-3 text-violet-300" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              <div>
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
                  {t('filters.country')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {REGION_CODES.map((code) => {
                    const active = tempRegion === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        // Une region est toujours requise (l'API fallback FR
                        // sinon, incoherent avec l'UI). Click sur la region
                        // active = no-op. Pour changer, click une autre.
                        onClick={() => { if (!active) setTempRegion(code); }}
                        aria-pressed={active}
                        className={`flex items-center gap-2 p-3 rounded-xl transition-all text-left border ${
                          active
                            ? 'border-violet-500/60 bg-violet-500/15 shadow-lg shadow-violet-500/15 cursor-default'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg shrink-0" aria-hidden="true">{FLAGS[code]}</span>
                        <span className={`text-sm font-medium flex-1 ${active ? 'text-white' : 'text-white/85'}`}>{t(`countries.${code}`)}</span>
                        {active && <Check className="w-4 h-4 text-violet-300 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
                  {t('filters.genres')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {genres?.map((g) => {
                    const active = tempGenre === String(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setTempGenre(active ? '' : String(g.id))}
                        aria-pressed={active}
                        className={`pill px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          active
                            ? 'active bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/40'
                            : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" aria-hidden="true" />}
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex gap-3 safe-pb">
              <button
                type="button"
                onClick={reset}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-semibold text-sm transition-colors"
              >
                {t('common.reset')}
              </button>
              <button
                type="button"
                onClick={apply}
                className="flex-1 py-3 rounded-xl btn-primary text-white font-semibold text-sm bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500"
              >
                {t('common.apply')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
