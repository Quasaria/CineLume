import { useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { discoverMovies, searchMovies, BACK } from '@/lib/tmdb';
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

function getWeekDates(y: number, m: number, w: number) {
  const last = new Date(y, m + 1, 0).getDate();
  const weeks = Math.ceil(last / 7);
  const start = (w - 1) * 7 + 1;
  const end = w === weeks ? last : w * 7;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${y}-${pad(m + 1)}-${pad(start)}`,
    end: `${y}-${pad(m + 1)}-${pad(end)}`,
  };
}

export default function App() {
  const { selYear, selMonth, selWeek, selRegion, selGenre, searchQuery } = useAppStore();

  const discoverQuery = useInfiniteQuery<DiscoverResponse, Error>({
    queryKey: ['movies', selYear, selMonth, selWeek, selRegion, selGenre],
    queryFn: async ({ pageParam = 1 }) => {
      const dates = getWeekDates(selYear, selMonth, selWeek);
      const res = await discoverMovies({
        region: selRegion,
        genre: selGenre,
        startDate: dates.start,
        endDate: dates.end,
        page: pageParam as number,
      });
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length >= lastPage.total_pages) return undefined;
      return pages.length + 1;
    },
    enabled: !searchQuery,
  });

  const searchQueryHook = useInfiniteQuery<DiscoverResponse, Error>({
    queryKey: ['search', searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await searchMovies(searchQuery, pageParam as number);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (pages.length >= lastPage.total_pages) return undefined;
      return pages.length + 1;
    },
    enabled: !!searchQuery,
  });

  const activeQuery = searchQuery ? searchQueryHook : discoverQuery;
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-violet-500/30">
      <div className="ambient-bg" />

      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
        <Hero backdropUrl={heroBackdrop} />

        <DateNavigator />

        <MovieGrid
          movies={movies}
          isLoading={activeQuery.isLoading}
          isFetching={activeQuery.isFetchingNextPage}
          hasNextPage={activeQuery.hasNextPage}
          onLoadMore={loadMore}
          totalResults={totalResults}
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
  );
}
