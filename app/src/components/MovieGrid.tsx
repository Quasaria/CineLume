import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, SlidersHorizontal, AlertCircle, RefreshCw, X, User } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { PROVIDERS } from '@/lib/tmdb';
import { MovieCard } from './MovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Movie } from '@/types/movie';

interface FilterChipProps {
  label: string;
  color: 'violet' | 'fuchsia' | 'emerald' | 'cyan';
  onClear: () => void;
  ariaLabel: string;
}

function FilterChip({ label, color, onClear, ariaLabel }: FilterChipProps) {
  const styles: Record<FilterChipProps['color'], string> = {
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20 hover:bg-violet-500/20',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20 hover:bg-fuchsia-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20',
  };
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={ariaLabel}
      className={`pl-2 pr-1 py-0.5 rounded-md text-xs border flex items-center gap-1 transition-colors ${styles[color]}`}
    >
      <span>{label}</span>
      <X className="w-3 h-3 opacity-70" aria-hidden="true" />
    </button>
  );
}

interface MovieGridProps {
  movies: Movie[];
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  totalResults: number;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export function MovieGrid({ movies, isLoading, isFetching, hasNextPage, onLoadMore, totalResults, isError, errorMessage, onRetry }: MovieGridProps) {
  const { t } = useTranslation();
  const {
    viewMode, setViewMode,
    selRegion, selGenre, selReleaseMode, selProvider, selectedPerson,
    setSelectedPerson, setRegion, setGenre, setReleaseMode, setProvider,
  } = useAppStore();
  const providerName = selProvider ? PROVIDERS.find((p) => p.id === selProvider)?.name : '';
  const hasActiveFilter = selRegion !== 'FR' || !!selGenre || selReleaseMode !== 'theater' || !!selProvider || !!selectedPerson;

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-20 text-center"
        role="alert"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <p className="text-white/80 text-lg font-medium mb-1">{t('grid.errorTitle')}</p>
        <p className="text-white/60 text-sm mb-5">{errorMessage || t('grid.errorDesc')}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            className="btn-primary px-6 py-2.5 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {t('common.retry')}
          </Button>
        )}
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="relative rounded-2xl overflow-hidden aspect-[2/3] bg-white/5">
            <Skeleton className="absolute inset-0 bg-white/[0.04]" />
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-white/10 rounded" />
              <Skeleton className="h-3 w-1/2 bg-white/[0.08] rounded" />
            </div>
          </div>
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
          <SlidersHorizontal className="w-10 h-10 text-white/40" />
        </div>
        <p className="text-white/70 text-lg font-medium mb-1">{t('grid.empty')}</p>
        <p className="text-white/50 text-sm">{t('grid.emptyHint')}</p>
      </motion.div>
    );
  }

  return (
    <div>
      {selectedPerson && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/40 text-violet-200 text-sm font-medium">
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            {t('grid.filmographyOf')} <span className="font-bold">{selectedPerson.name}</span>
            <button
              type="button"
              onClick={() => setSelectedPerson(null)}
              aria-label={t('grid.removePersonFilter')}
              className="ml-1 p-0.5 rounded-full hover:bg-violet-500/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="text-sm text-white/60 font-medium shrink-0">
            {t('grid.movies', { count: totalResults })}{hasNextPage ? '+' : ''}
          </span>
          {hasActiveFilter && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selRegion !== 'FR' && selRegion && (
                <FilterChip
                  label={selRegion}
                  color="violet"
                  ariaLabel={t('grid.clearFilter', { name: selRegion })}
                  onClear={() => setRegion('FR')}
                />
              )}
              {selReleaseMode !== 'theater' && (
                <FilterChip
                  label={t(`modes.${selReleaseMode}`)}
                  color="fuchsia"
                  ariaLabel={t('grid.clearFilter', { name: t(`modes.${selReleaseMode}`) })}
                  onClear={() => {
                    setReleaseMode('theater');
                    setProvider('');
                  }}
                />
              )}
              {providerName && (
                <FilterChip
                  label={providerName}
                  color="emerald"
                  ariaLabel={t('grid.clearFilter', { name: providerName })}
                  onClear={() => setProvider('')}
                />
              )}
              {selGenre && (
                <FilterChip
                  label={t('grid.genreLabel')}
                  color="cyan"
                  ariaLabel={t('grid.clearFilter', { name: t('grid.genreLabel') })}
                  onClear={() => setGenre('')}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/10" role="group" aria-label={t('grid.viewModeGroup')}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label={t('grid.viewGrid')}
              aria-pressed={viewMode === 'grid'}
              className={`min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 flex items-center justify-center rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label={t('grid.viewList')}
              aria-pressed={viewMode === 'list'}
              className={`min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 flex items-center justify-center rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" aria-hidden="true" />
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
            {t('grid.loadMore')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
