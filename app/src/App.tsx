import { useEffect, useCallback } from 'react';
import { MotionConfig } from 'framer-motion';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { discoverMovies, searchMovies, searchPersons, BACK } from '@/lib/tmdb';
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
      const res = await discoverMovies({
        region: selRegion,
        genre: selGenre,
        startDate: formatDateISO(w.start),
        endDate: formatDateISO(w.end),
        page: pageParam as number,
        releaseMode: selReleaseMode,
        provider: selProvider,
        personId: selectedPerson?.id ?? null,
      });
      return res;
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

  // Bornes de la semaine en cours pour le filtre client-side
  const weekBounds = (() => {
    const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion);
    const idx = Math.min(Math.max(selWeek - 1, 0), weeks.length - 1);
    const w = weeks[idx];
    if (!w) return null;
    return { start: formatDateISO(w.start), end: formatDateISO(w.end) };
  })();

  // Filtre côté client : on ne fait confiance qu'à movie.release_date (primary mondiale)
  // pour le mode discover. TMDB lâche parfois des films hors fenêtre.
  // En mode recherche ou filmographie : on ne filtre pas par date.
  const rawMovies: Movie[] = activeQuery.data?.pages.flatMap((p) => p.results) || [];
  const movies: Movie[] = rawMovies.filter((m) => {
    if (!m.poster_path) return false;
    if (isSearchMode || selectedPerson) return true;
    if (!weekBounds || !m.release_date) return false;
    return m.release_date >= weekBounds.start && m.release_date <= weekBounds.end;
  });
  const totalResults = isSearchMode || selectedPerson
    ? (activeQuery.data?.pages[0]?.total_results || 0)
    : movies.length;
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
