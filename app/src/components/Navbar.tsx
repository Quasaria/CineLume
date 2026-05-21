import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, Heart, Sun, Moon, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { Input } from '@/components/ui/input';
import { BurgerMenu } from '@/components/BurgerMenu';

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Group decalee de +0.6 right pour compenser le poids visuel du C
          qui est concentre a gauche. Donne un meilleur centrage optique. */}
      <g transform="translate(0.6 0)">
        <path d="M18.5 6.2a8.5 8.5 0 1 0 0 11.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M13 10 L18.5 12 L13 14 Z" fill="currentColor" />
      </g>
    </svg>
  );
}

export function Navbar() {
  const { t } = useTranslation();
  const { isDark, toggleTheme, openFavorites, favorites, watchlist, searchQuery, setSearchQuery } = useAppStore();
  const { history: searchHistory, remove: removeFromHistory, clear: clearHistory } = useSearchHistory();
  const [scrolled, setScrolled] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Raccourci clavier Cmd+K (Mac) / Ctrl+K (Win/Linux) pour ouvrir la
  // recherche, pattern standard adopte par Linear, GitHub, Notion etc.
  // Bloque si une modale est deja ouverte ou si l'utilisateur tape dans
  // un champ texte (sinon ca volerait le focus pendant la saisie).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        const state = useAppStore.getState();
        if (
          state.currentModalMovieId !== null ||
          state.isFilterOpen ||
          state.isFavOpen ||
          state.isSettingsOpen
        ) {
          return;
        }
        e.preventDefault();
        if (window.innerWidth >= 640) {
          desktopSearchRef.current?.focus();
          desktopSearchRef.current?.select();
        } else {
          setSearchVisible(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Compteur unifie pour le bouton 'Mes films' : on dedoublonne par id
  // pour ne pas compter 2 fois un film present dans favoris ET watchlist.
  const totalSavedCount = useMemo(() => {
    const ids = new Set<number>();
    for (const f of favorites) ids.add(f.id);
    for (const f of watchlist) ids.add(f.id);
    return ids.size;
  }, [favorites, watchlist]);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 w-full z-50 transition-colors duration-500 safe-pt nav-feather"
      style={{
        // 85% opacity quand scrolled : assez transparent pour laisser passer
        // un soupcon d'ambiance mais opaque assez pour que les icones restent
        // lisibles meme par-dessus une image hero coloree. On enleve le
        // saturate(140%) qui amplifiait les couleurs derriere.
        backgroundColor: scrolled ? 'color-mix(in srgb, var(--bg) 85%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
        // @ts-expect-error css custom property
        '--feather-opacity': scrolled ? 1 : 0,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
        <button
          type="button"
          aria-label={t('nav.home')}
          className="flex items-center gap-3 cursor-pointer group bg-transparent border-0 p-0"
          onClick={() => {
            // jumpToToday reset deja searchQuery + selectedPerson maintenant,
            // mais on rappelle setSearchQuery par securite (au cas ou le user
            // tape pendant qu'il clique sur le logo).
            const store = useAppStore.getState();
            store.jumpToToday();
            store.setSearchQuery('');
            setSearchVisible(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <motion.div
            whileHover={{ scale: 1.07, rotate: -4 }}
            whileTap={{ scale: 0.94 }}
            className="relative w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-lg shadow-violet-500/40"
          >
            <div className="logo-halo" />
            <div className="absolute inset-0 logo-shimmer" />
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LogoMark className="w-[22px] h-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
            </div>
          </motion.div>
          <span className="hidden min-[420px]:inline font-bold text-xl tracking-tight">
            Cine<span className="text-gradient">Lume</span>
          </span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <label className="sr-only" htmlFor="navbar-search">{t('nav.search')}</label>
            <Input
              id="navbar-search"
              ref={desktopSearchRef}
              type="search"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 lg:w-64 bg-white/5 border-white/10 rounded-xl pl-9 pr-12 py-2 text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:ring-0 focus:w-56 lg:focus:w-72 transition-all duration-300"
            />
            <kbd className="hidden lg:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.07] border border-white/10 text-[10px] font-mono font-bold text-white/50 pointer-events-none">
              {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? (
                <><span className="text-[11px] leading-none">⌘</span>K</>
              ) : (
                <>Ctrl K</>
              )}
            </kbd>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSearchVisible(!searchVisible)}
            aria-label={t('nav.openSearch')}
            aria-expanded={searchVisible}
            className="sm:hidden min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <Search className="w-5 h-5 text-white/70" aria-hidden="true" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openFavorites}
            aria-label={totalSavedCount > 0 ? t('nav.collectionsAria', { count: totalSavedCount }) : t('collections.title')}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors relative"
          >
            <Heart className="w-5 h-5 text-white/70" aria-hidden="true" />
            {totalSavedCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalSavedCount}
              </span>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            aria-label={isDark ? t('nav.themeLight') : t('nav.themeDark')}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-300/80" aria-hidden="true" />
            ) : (
              <Moon className="w-5 h-5 text-white/70" aria-hidden="true" />
            )}
          </motion.button>

          <BurgerMenu />
        </div>
      </div>

      <AnimatePresence>
        {searchVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="sm:hidden px-4 pb-3 overflow-hidden"
          >
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <label className="sr-only" htmlFor="navbar-search-mobile">{t('nav.search')}</label>
                <Input
                  id="navbar-search-mobile"
                  type="search"
                  placeholder={t('nav.searchMoviePlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchVisible(false);
                  }}
                  className="w-full bg-white/5 border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-base md:text-sm text-white placeholder:text-white/50 focus:border-violet-500/50 focus:ring-0"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchVisible(false);
                }}
                aria-label={t('common.close')}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-white/70" aria-hidden="true" />
              </button>
            </div>

            {/* Historique recent : visible quand l'input est vide et qu'on
                a deja cherche au moins une fois. Click sur un chip ressaisit
                la query, X dessus l'enleve de l'historique. */}
            {!searchQuery.trim() && searchHistory.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/45 mr-1">
                  {t('search.recent')}
                </span>
                {searchHistory.map((q) => (
                  <div key={q} className="group inline-flex items-center gap-0.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white/80 hover:bg-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setSearchQuery(q)}
                      className="pl-2.5 pr-1.5 py-1.5 min-h-9"
                    >
                      {q}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(q)}
                      aria-label={t('search.removeRecent', { query: q })}
                      className="pr-2 pl-0.5 py-1.5 min-h-9 text-white/40 hover:text-white/80"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[11px] text-white/45 hover:text-white/70 font-medium underline-offset-2 hover:underline ml-1"
                >
                  {t('search.clearAll')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
