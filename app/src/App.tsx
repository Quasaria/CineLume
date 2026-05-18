import { useEffect, useCallback } from 'react';
import { MotionConfig } from 'framer-motion';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { discoverMovies, searchMovies, searchPersons, getMovieReleaseDates, BACK } from '@/lib/tmdb';
import { getCinemaWeeksOfMonth, formatDateISO } from '@/lib/cinema-week';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useModalUrlSync } from '@/hooks/useModalUrlSync';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { DateNavigator } from '@/components/DateNavigator';
import { MovieGrid } from '@/components/MovieGrid';
import { PersonStrip } from '@/components/PersonStrip';
import { FilterDrawer } from '@/components/FilterDrawer';
import { MovieModal } from '@/components/MovieModal';
import { FavoritesModal } from '@/components/FavoritesModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/ui/sonner';
import type { Movie } from '@/types/movie';

interface DiscoverResponse {
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export default function App() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const {
    selYear, selMonth, selWeek, selRegion, selGenre, selReleaseMode, selProvider,
    selectedPerson, searchQuery,
  } = useAppStore();
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  useModalUrlSync();

  const discoverQuery = useInfiniteQuery<DiscoverResponse, Error>({
    queryKey: ['movies', selYear, selMonth, selWeek, selRegion, selGenre, selReleaseMode, selProvider, selectedPerson?.id ?? null, lang],
    queryFn: async ({ pageParam = 1 }) => {
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
      });

      // Filmographie : pas de filtre date, on garde la carriere complete.
      if (selectedPerson) return res;

      const acceptedTypes =
        selReleaseMode === 'theater'
          ? [1, 2, 3]
          : selReleaseMode === 'platform'
            ? [4, 6]
            : [1, 2, 3, 4, 6];

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
          if (!movie.poster_path) return null;
          if (movie.release_date && movie.release_date < recencyCutoff) return null;
          if (shouldFilterByLang && movie.original_language && NICHE_LANGS.includes(movie.original_language)) return null;
          try {
            const rd = await getMovieReleaseDates(movie.id);
            // Strict region-only : on prend la PLUS ANCIENNE entree de la
            // region selectionnee qui matche le type, puis on regarde si elle
            // tombe dans la fenetre semaine. Resultat : chaque film n'apparait
            // que dans la semaine de sa toute premiere sortie dans le pays.
            const regionEntry = rd.results.find((r) => r.iso_3166_1 === selRegion);
            if (!regionEntry || regionEntry.release_dates.length === 0) return null;
            const matching = regionEntry.release_dates
              .filter((d) => acceptedTypes.includes(d.type))
              .map((d) => (d.release_date || '').split('T')[0])
              .filter((day) => !!day)
              .sort();
            if (matching.length === 0) return null;
            const earliest = matching[0];
            return earliest >= startStr && earliest <= endStr ? movie : null;
          } catch {
            // Erreur reseau sur release_dates : on garde le film en best effort
            return movie;
          }
        }),
      );

      const filtered = enriched.filter((m): m is Movie => m !== null);
      return {
        ...res,
        results: filtered,
        total_results: filtered.length,
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
    queryFn: async ({ pageParam = 1 }) => {
      const res = await searchMovies(debouncedSearch, pageParam as number);
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
    queryFn: () => searchPersons(debouncedSearch),
    enabled: !!debouncedSearch && !selectedPerson && debouncedSearch.length >= 2,
  });

  const isSearchMode = !!debouncedSearch && !selectedPerson;
  const activeQuery = isSearchMode ? searchQueryHook : discoverQuery;

  // En mode discover, le queryFn fait deja le filtrage strict via /release_dates.
  // En mode recherche/filmographie, on garde tout sauf les films sans affiche.
  const movies: Movie[] = (activeQuery.data?.pages.flatMap((p) => p.results) || [])
    .filter((m) => !!m.poster_path);
  const totalResults = activeQuery.data?.pages.reduce((sum, p) => sum + p.results.length, 0) || 0;
  const persons = (personsQuery.data?.results || []).filter((p) => p.profile_path).slice(0, 12);

  const loadMore = useCallback(() => {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [activeQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const store = useAppStore.getState();
        if (store.currentModalMovieId !== null) store.closeModal();
        if (store.isFilterOpen) store.closeFilters();
        if (store.isFavOpen) store.closeFavorites();
        if (store.isSettingsOpen) store.closeSettings();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const heroBackdrops = movies
    .slice(0, 6)
    .map((m) => m.backdrop_path)
    .filter((p): p is string => !!p)
    .map((p) => `${BACK}${p}`);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-violet-500/30">
        <div className="ambient-bg" />

        <Navbar />

        <main id="main" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
          <Hero backdrops={heroBackdrops} />

          <DateNavigator />

          {persons.length > 0 && isSearchMode && (
            <PersonStrip persons={persons} />
          )}

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

        <FilterDrawer />
        <MovieModal />
        <FavoritesModal />
        <SettingsModal />
        <Toaster
          position="bottom-right"
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
