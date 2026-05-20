import { useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { discoverMovies, searchMovies, searchPersons, getMovieReleaseDates, BACK } from '@/lib/tmdb';
import { getCinemaWeeksOfMonth, formatDateISO } from '@/lib/cinema-week';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useModalUrlSync } from '@/hooks/useModalUrlSync';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useReleaseNotifications } from '@/hooks/useReleaseNotifications';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { HeroBackdrop } from '@/components/HeroBackdrop';
import { DateNavigator } from '@/components/DateNavigator';
import { MovieGrid } from '@/components/MovieGrid';
import { PersonStrip } from '@/components/PersonStrip';
import { PersonHeader } from '@/components/PersonHeader';
import { FavoritesStrip } from '@/components/FavoritesStrip';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/ui/sonner';
import type { Movie } from '@/types/movie';

// Code-split des modales : elles ne sont chargees qu'a la 1ere ouverture.
// Bundle initial passe d'environ 660KB a environ 400KB, le LCP devient
// plus rapide surtout sur mobile.
const FilterDrawer = lazy(() => import('@/components/FilterDrawer').then((m) => ({ default: m.FilterDrawer })));
const MovieModal = lazy(() => import('@/components/MovieModal').then((m) => ({ default: m.MovieModal })));
const CollectionsModal = lazy(() => import('@/components/CollectionsModal').then((m) => ({ default: m.CollectionsModal })));
const ListsModal = lazy(() => import('@/components/ListsModal').then((m) => ({ default: m.ListsModal })));
const SettingsModal = lazy(() => import('@/components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const PickerModal = lazy(() => import('@/components/PickerModal').then((m) => ({ default: m.PickerModal })));
const SwipeMode = lazy(() => import('@/components/SwipeMode').then((m) => ({ default: m.SwipeMode })));

interface DiscoverResponse {
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  const queryClient = useQueryClient();
  // Selecteurs granulaires : `useAppStore()` complet souscrit a TOUT le
  // store, donc n'importe quel toggleFav / openModal / mouvement de scroll
  // re-render App au complet (et tout le reste avec). Avec des selecteurs
  // par field, on ne re-render App que sur ce qui change vraiment ici.
  const selYear = useAppStore((s) => s.selYear);
  const selMonth = useAppStore((s) => s.selMonth);
  const selWeek = useAppStore((s) => s.selWeek);
  const selRegion = useAppStore((s) => s.selRegion);
  const selGenre = useAppStore((s) => s.selGenre);
  const selReleaseMode = useAppStore((s) => s.selReleaseMode);
  const selProvider = useAppStore((s) => s.selProvider);
  const selectedPerson = useAppStore((s) => s.selectedPerson);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sortBy = useAppStore((s) => s.sortBy);
  const runtimeMax = useAppStore((s) => s.runtimeMax);
  const currentModalMovieId = useAppStore((s) => s.currentModalMovieId);
  const isFilterOpen = useAppStore((s) => s.isFilterOpen);
  const isFavOpen = useAppStore((s) => s.isFavOpen);
  const isListsOpen = useAppStore((s) => s.isListsOpen);
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const isPickerOpen = useAppStore((s) => s.isPickerOpen);
  const isSwipeOpen = useAppStore((s) => s.isSwipeOpen);
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);
  const { push: pushSearchHistory } = useSearchHistory();

  // Pousse une query dans l'historique des qu'elle se stabilise (debounce
  // ecoule). Filtre les queries trop courtes via le hook lui-meme.
  useEffect(() => {
    if (debouncedSearch && !selectedPerson) pushSearchHistory(debouncedSearch);
  }, [debouncedSearch, selectedPerson, pushSearchHistory]);
  const anyModalOpen = currentModalMovieId !== null || isFilterOpen || isFavOpen || isListsOpen || isSettingsOpen || isPickerOpen || isSwipeOpen;

  useModalUrlSync();
  useReleaseNotifications();

  const discoverQuery = useInfiniteQuery<DiscoverResponse, Error>({
    queryKey: ['movies', selYear, selMonth, selWeek, selRegion, selGenre, selReleaseMode, selProvider, selectedPerson?.id ?? null, sortBy, runtimeMax, lang],
    queryFn: async ({ pageParam = 1, signal }) => {
      const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion);
      const idx = Math.min(Math.max(selWeek - 1, 0), weeks.length - 1);
      const w = weeks[idx];
      const startStr = formatDateISO(w.start);
      const endStr = formatDateISO(w.end);

      const res = await discoverMovies({
        region: selRegion,
        genre: selGenre,
        startDate: startStr,
        endDate: endStr,
        page: pageParam as number,
        releaseMode: selReleaseMode,
        provider: selProvider,
        personId: selectedPerson?.id ?? null,
        sortBy,
        runtimeMax,
      }, signal);

      // Filmographie : pas de filtre date, on garde la carriere complete.
      if (selectedPerson) return res;

      // Theater = [2, 3] uniquement (sortie limitee + wide).
      // On exclut le type 1 (avant-premiere/festival) qui amenait des films
      // comme des projections-festival uniquement (films chinois/asiatiques
      // sans vraie sortie nationale en France par exemple).
      const acceptedTypes =
        selReleaseMode === 'theater'
          ? [2, 3]
          : selReleaseMode === 'platform'
            ? [4, 6]
            : [2, 3, 4, 6];

      // Recency 12 mois : exclut les films dont la premiere sortie mondiale
      // a plus d'un an. Bloque les re-projections d'anciens films (Night Swim
      // 2024 sur une semaine 2026 par exemple).
      const recencyCutoffDate = new Date(w.start);
      recencyCutoffDate.setMonth(recencyCutoffDate.getMonth() - 12);
      const recencyCutoff = formatDateISO(recencyCutoffDate);

      // Exclusion par langue : TMDB a parfois des entrees FR pour des films
      // Bollywood / Tollywood / autre sous-continent indien (projections
      // diaspora) que l'utilisateur ne considere pas comme de vraies sorties.
      // Quand l'utilisateur est dans un pays occidental, on filtre les films
      // dont la langue originale est une langue du sous-continent indien.
      const WESTERN_REGIONS = ['FR', 'US', 'GB', 'DE', 'IT', 'ES', 'BE', 'CH', 'NL', 'AT', 'CA', 'AU', 'IE', 'SE', 'PT'];
      const NICHE_LANGS = ['hi', 'ta', 'ml', 'te', 'kn', 'bn', 'pa', 'mr', 'gu', 'ur', 'or', 'as'];
      const shouldFilterByLang = WESTERN_REGIONS.includes(selRegion);

      const enriched = await Promise.all(
        res.results.map(async (movie) => {
          if (signal?.aborted) return null;
          if (!movie.poster_path) return null;
          if (movie.release_date && movie.release_date < recencyCutoff) return null;
          if (shouldFilterByLang && movie.original_language && NICHE_LANGS.includes(movie.original_language)) return null;
          try {
            const rd = await getMovieReleaseDates(movie.id, signal);
            // Strict region-only : on prend la PLUS ANCIENNE entree de la
            // region selectionnee qui matche le type, puis on regarde si elle
            // tombe dans la fenetre semaine. Resultat : chaque film n'apparait
            // que dans la semaine de sa toute premiere sortie dans le pays.
            const regionEntry = rd.results.find((r) => r.iso_3166_1 === selRegion);
            if (!regionEntry || regionEntry.release_dates.length === 0) return null;
            const matching = regionEntry.release_dates
              .filter((d) => acceptedTypes.includes(d.type))
              .map((d) => (d.release_date || '').split('T')[0])
              .filter((day) => !!day && /^\d{4}-\d{2}-\d{2}$/.test(day))
              .sort();
            if (matching.length === 0) return null;
            const earliest = matching[0];
            if (earliest < startStr || earliest > endStr) return null;
            // On surcharge release_date par la date FR matchee pour que la
            // carte affiche la vraie date de sortie FR, pas la primary mondiale
            // (qui peut etre tres differente : ex. sortie FR 22 mai mais sortie
            // mondiale wide 10 septembre).
            return { ...movie, release_date: earliest };
          } catch {
            // Erreur reseau sur release_dates : on EXCLUT le film. Mieux d'avoir
            // un film manquant ponctuellement que d'afficher un film a la mauvaise
            // date faute de pouvoir verifier.
            return null;
          }
        }),
      );

      const filtered = enriched.filter((m): m is Movie => m !== null);
      return {
        ...res,
        results: filtered,
        // On garde total_results du discover original pour que le compteur
        // affiche le vrai total TMDB (pas seulement les pages chargees).
        // Le filtre client n'a aucun moyen de connaitre les films des pages
        // non encore fetched, donc le compteur reste une borne haute.
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length >= Math.min(lastPage.total_pages, 500)) return undefined;
      return pages.length + 1;
    },
    enabled: !debouncedSearch || !!selectedPerson,
  });

  const searchQueryHook = useInfiniteQuery<DiscoverResponse, Error>({
    queryKey: ['search', debouncedSearch, lang],
    queryFn: async ({ pageParam = 1, signal }) => {
      const res = await searchMovies(debouncedSearch, pageParam as number, signal);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length >= Math.min(lastPage.total_pages, 500)) return undefined;
      return pages.length + 1;
    },
    enabled: !!debouncedSearch && !selectedPerson,
  });

  const personsQuery = useQuery({
    queryKey: ['searchPersons', debouncedSearch, lang],
    queryFn: ({ signal }) => searchPersons(debouncedSearch, signal),
    enabled: !!debouncedSearch && !selectedPerson && debouncedSearch.length >= 2,
  });

  const isSearchMode = !!debouncedSearch && !selectedPerson;
  const activeQuery = isSearchMode ? searchQueryHook : discoverQuery;

  // En mode discover, le queryFn fait deja le filtrage strict via /release_dates.
  // En mode recherche/filmographie, on garde tout sauf les films sans affiche.
  const movies: Movie[] = useMemo(
    () => (activeQuery.data?.pages.flatMap((p) => p.results) || []).filter((m) => !!m.poster_path),
    [activeQuery.data],
  );
  const totalResults = movies.length;
  const persons = useMemo(
    () => (personsQuery.data?.results || []).filter((p) => p.profile_path).slice(0, 12),
    [personsQuery.data],
  );

  const loadMore = useCallback(() => {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [activeQuery]);

  // Preload des modales en idle apres le 1er paint : evite le flash blank
  // a la 1ere ouverture sans bloquer le LCP initial.
  useEffect(() => {
    const idle = (cb: () => void) => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(cb);
      } else {
        setTimeout(cb, 1500);
      }
    };
    idle(() => {
      import('@/components/MovieModal');
      import('@/components/FilterDrawer');
      import('@/components/CollectionsModal');
      import('@/components/ListsModal');
      import('@/components/SettingsModal');
      import('@/components/PickerModal');
      import('@/components/SwipeMode');
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const store = useAppStore.getState();
        if (store.currentModalMovieId !== null) store.closeModal();
        if (store.isFilterOpen) store.closeFilters();
        if (store.isFavOpen) store.closeFavorites();
        if (store.isListsOpen) store.closeLists();
        if (store.isSettingsOpen) store.closeSettings();
        if (store.isPickerOpen) store.closePicker();
        if (store.isSwipeOpen) store.closeSwipe();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const heroBackdrops = useMemo(
    () => movies
      .slice(0, 6)
      .map((m) => m.backdrop_path)
      .filter((p): p is string => !!p)
      .map((p) => `${BACK}${p}`),
    [movies],
  );

  // Pull-to-refresh : sur mobile, tirer la page vers le bas depuis le haut
  // declenche un refresh de toutes les queries. Desactive quand une modale
  // est ouverte pour eviter d'intercepter ses gestures (drag-to-close,
  // scroll interne, etc.). Le SW NetworkFirst de TMDB cache 6h donc parfois
  // on veut forcer. onRefresh stabilise via useCallback pour ne pas re-bind
  // les listeners touch a chaque render parent.
  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  // Pull-to-refresh : tous les appareils tactiles (phones + tablettes,
  // y compris iPad portrait 768px et iPad Pro paysage 1366px qui sortent
  // de useIsMobile). Desactive quand une modale est ouverte pour ne pas
  // interferer avec leurs gestures (drag-to-close, scroll interne...).
  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    enabled: isTouch && !anyModalOpen,
  });

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-violet-500/30 relative">
        {/* Skip-to-content : premier element focusable du DOM. Au TAB initial,
            l'utilisateur clavier voit le lien apparaitre et peut sauter la
            navbar pour atterrir directement sur le contenu. */}
        <a href="#main" className="skip-to-content">
          {t('nav.skipToContent')}
        </a>

        {/* Indicateur pull-to-refresh : descend progressivement avec le doigt,
            puis spinne pendant le refresh. Fixed top, au-dessus de tout en
            z-index. Invisible quand pullDistance == 0. */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[55] pointer-events-none"
            style={{
              transform: `translate(-50%, ${Math.min(pullDistance, 100)}px)`,
              opacity: isRefreshing ? 1 : Math.min(pullDistance / 50, 1),
              transition: isRefreshing ? 'transform 0.3s ease' : undefined,
            }}
            aria-hidden="true"
          >
            <div className="mt-3 w-10 h-10 rounded-full bg-[var(--bg)]/95 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-xl shadow-black/40">
              <RefreshCw
                className={`w-5 h-5 text-violet-400 ${isRefreshing ? 'animate-spin' : ''}`}
                style={!isRefreshing ? {
                  transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)`,
                  transition: 'transform 0.05s linear',
                } : undefined}
              />
            </div>
          </div>
        )}

        <div className="ambient-bg" />

        {/* Image backdrop pleine largeur en haut de la page, sans cadre,
            avec degrade sur tous les contours pour se fondre dans le bg. */}
        <HeroBackdrop backdrops={heroBackdrops} />

        <Navbar />

        <main id="main" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <Hero />

          {/* DateNavigator masque en mode personne : la filmographie n'est
              pas decoupee par semaine, c'est la carriere complete. */}
          {!selectedPerson && <DateNavigator />}

          {/* Strip "favoris cette semaine" : visible uniquement en mode
              discover (pas search ni filmographie ou la notion de semaine
              n'a pas de sens). N'affiche rien si aucun favori ne tombe
              dans la fenetre semaine selectionnee. */}
          {!isSearchMode && !selectedPerson && <FavoritesStrip />}

          {persons.length > 0 && isSearchMode && (
            <PersonStrip persons={persons} />
          )}

          {selectedPerson && <PersonHeader />}

          <MovieGrid
            movies={movies}
            isLoading={activeQuery.isLoading}
            isFetching={activeQuery.isFetchingNextPage}
            hasNextPage={activeQuery.hasNextPage}
            onLoadMore={loadMore}
            totalResults={totalResults}
            isError={activeQuery.isError}
            errorMessage={activeQuery.error?.message}
            onRetry={() => activeQuery.refetch()}
          />
        </main>

        <Footer />

        <Suspense fallback={null}>
          <FilterDrawer />
          <MovieModal movies={movies} />
          <CollectionsModal />
          <ListsModal />
          <SettingsModal />
          <PickerModal />
          <SwipeMode />
        </Suspense>
        <Toaster
          position={isMobile ? 'bottom-center' : 'bottom-right'}
          toastOptions={{
            style: {
              background: '#18181f',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fafafa',
            },
          }}
        />
      </div>
    </MotionConfig>
  );
}
