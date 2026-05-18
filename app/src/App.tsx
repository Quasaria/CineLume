import { useEffect, useCallback } from 'react';
import { MotionConfig } from 'framer-motion';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { discoverMovies, searchMovies, BACK } from '@/lib/tmdb';
import { getCinemaWeeksOfMonth, formatDateISO } from '@/lib/cinema-week';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { DateNavigator } from '@/components/DateNavigator';
import { MovieGrid } from '@/components/MovieGrid';
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
  const { selYear, selMonth, selWeek, selRegion, selGenre, selReleaseMode, selProvider, searchQuery } = useAppStore();
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  const discoverQuery = useInfiniteQuery<DiscoverResponse, Error>({
    queryKey: ['movies', selYear, selMonth, selWeek, selRegion, selGenre, selReleaseMode, selProvider],
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
      });
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length >= Math.min(lastPage.total_pages, 500)) return undefined;
      return pages.length + 1;
    },
    enabled: !debouncedSearch,
  });

  const searchQueryHook = useInfiniteQuery<DiscoverResponse, Error>({
    queryKey: ['search', debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await searchMovies(debouncedSearch, pageParam as number);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length >= Math.min(lastPage.total_pages, 500)) return undefined;
      return pages.length + 1;
    },
    enabled: !!debouncedSearch,
  });

  const activeQuery = debouncedSearch ? searchQueryHook : discoverQuery;
  const movies: Movie[] = activeQuery.data?.pages.flatMap((p) => p.results).filter((m) => m.poster_path) || [];
  const totalResults = activeQuery.data?.pages[0]?.total_results || 0;

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

  const heroBackdrop = movies[0]?.backdrop_path ? `${BACK}${movies[0].backdrop_path}` : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-violet-500/30">
        <div className="ambient-bg" />

        <Navbar />

        <main id="main" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
          <Hero backdropUrl={heroBackdrop} />

          <DateNavigator />

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
