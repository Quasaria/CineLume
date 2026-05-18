import { motion } from 'framer-motion';
import { LayoutGrid, List, Filter, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { PROVIDERS } from '@/lib/tmdb';
import { MovieCard } from './MovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Movie } from '@/types/movie';

const MODE_LABEL: Record<string, string> = {
  theater: 'Salle',
  platform: 'Plateforme',
  all: 'Tout',
};

interface MovieGridProps {
  movies: Movie[];
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  totalResults: number;
}

export function MovieGrid({ movies, isLoading, isFetching, hasNextPage, onLoadMore, totalResults }: MovieGridProps) {
  const { viewMode, setViewMode, openFilters, selRegion, selGenre, selReleaseMode, selProvider } = useAppStore();
  const providerName = selProvider ? PROVIDERS.find((p) => p.id === selProvider)?.name : '';
  const hasActiveFilter = selRegion !== 'FR' || !!selGenre || selReleaseMode !== 'all' || !!selProvider;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="rounded-2xl aspect-[2/3] bg-white/5" />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-20 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
          <SlidersHorizontal className="w-10 h-10 text-white/20" />
        </div>
        <p className="text-white/40 text-lg font-medium mb-1">Aucun film trouvé</p>
        <p className="text-white/20 text-sm">Essayez d'autres dates ou filtres</p>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/30 font-medium">
            {totalResults} film{totalResults > 1 ? 's' : ''}
          </span>
          {hasActiveFilter && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selRegion !== 'FR' && selRegion && (
                <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 text-xs border border-violet-500/20">
                  {selRegion}
                </span>
              )}
              {selReleaseMode !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-300 text-xs border border-fuchsia-500/20">
                  {MODE_LABEL[selReleaseMode]}
                </span>
              )}
              {providerName && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">
                  {providerName}
                </span>
              )}
              {selGenre && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20">
                  Genre
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={openFilters}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium"
          >
            <Filter className="w-4 h-4 text-white/60" />
            <span className="hidden sm:inline">Filtres</span>
            {hasActiveFilter && (
              <span className="w-2 h-2 rounded-full bg-violet-500" />
            )}
          </Button>

          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5'
            : 'flex flex-col gap-3'
        }
      >
        {movies.map((movie, i) => (
          <MovieCard key={movie.id} movie={movie} index={i} viewMode={viewMode} />
        ))}
      </div>

      {isFetching && !isLoading && (
        <div className="mt-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}

      {hasNextPage && !isFetching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 text-center"
        >
          <Button
            onClick={onLoadMore}
            className="btn-primary px-8 py-3 rounded-2xl text-white font-semibold text-sm shadow-lg shadow-violet-500/25 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500"
          >
            Charger plus
          </Button>
        </motion.div>
      )}
    </div>
  );
}
