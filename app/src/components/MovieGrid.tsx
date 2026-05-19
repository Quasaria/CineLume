import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, SlidersHorizontal, AlertCircle, RefreshCw, X, User, Calendar, Search, ArrowUpDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { PROVIDERS } from '@/lib/tmdb';
import { MovieCard } from './MovieCard';
import { Button } from '@/components/ui/button';
import { ProviderBadge } from '@/components/ProviderBadge';
import type { Movie } from '@/types/movie';

interface FilterChipProps {
  label: ReactNode;
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
      className={`pl-2 pr-1.5 py-1 rounded-md text-xs border flex items-center gap-1.5 transition-colors ${styles[color]}`}
    >
      {label}
      <X className="w-3 h-3 opacity-70" aria-hidden="true" />
    </button>
  );
}

const GRID_CLASSES = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5';

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
    setSearchQuery, jumpToToday, openFilters,
    searchQuery,
    sortBy, setSortBy,
  } = useAppStore();
  const provider = selProvider ? PROVIDERS.find((p) => p.id === selProvider) : undefined;
  const hasActiveFilter = selRegion !== 'FR' || !!selGenre || selReleaseMode !== 'theater' || !!selProvider || !!selectedPerson;
  const isSearching = !!searchQuery;

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
      <div className={GRID_CLASSES} aria-label={t('grid.loadingLabel')} role="status">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="relative rounded-2xl overflow-hidden aspect-[2/3] bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.04] poster-shimmer">
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-white/[0.07]" />
              <div className="h-2.5 w-1/2 rounded bg-white/[0.05]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    // Empty state contextuel : on aide l'user a sortir de cette impasse
    // selon ce qu'il a actuellement actif (recherche / filtre / week vide).
    let title = t('grid.empty');
    let hint = t('grid.emptyHint');
    let Icon = SlidersHorizontal;

    if (isSearching) {
      title = t('grid.emptySearch', { query: searchQuery });
      hint = t('grid.emptySearchHint');
      Icon = Search;
    } else if (selectedPerson) {
      title = t('grid.emptyPerson', { name: selectedPerson.name });
      hint = t('grid.emptyPersonHint');
      Icon = User;
    } else if (hasActiveFilter) {
      title = t('grid.emptyFiltered');
      hint = t('grid.emptyFilteredHint');
      Icon = SlidersHorizontal;
    } else {
      title = t('grid.emptyWeek');
      hint = t('grid.emptyWeekHint');
      Icon = Calendar;
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-16 sm:py-20 text-center px-4"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center">
          <Icon className="w-9 h-9 text-white/50" aria-hidden="true" />
        </div>
        <p className="text-white/85 text-lg font-semibold mb-1.5">{title}</p>
        <p className="text-white/50 text-sm max-w-md mx-auto mb-6">{hint}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isSearching && (
            <Button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
            >
              {t('grid.clearSearch')}
            </Button>
          )}
          {selectedPerson && (
            <Button
              onClick={() => setSelectedPerson(null)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
            >
              {t('grid.removePersonFilter')}
            </Button>
          )}
          {hasActiveFilter && !isSearching && !selectedPerson && (
            <Button
              onClick={openFilters}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold"
            >
              {t('grid.openFilters')}
            </Button>
          )}
          {!isSearching && !selectedPerson && (
            <Button
              onClick={jumpToToday}
              className="px-4 py-2.5 rounded-xl btn-primary bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-semibold flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {t('common.today')}
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div>
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
              {provider && (
                <FilterChip
                  label={<span className="flex items-center gap-1.5"><ProviderBadge provider={provider} size="sm" />{provider.name}</span>}
                  color="emerald"
                  ariaLabel={t('grid.clearFilter', { name: provider.name })}
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
          {!selectedPerson && (
            <div className="relative">
              <select
                aria-label={t('grid.sortBy')}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'popularity' | 'date' | 'rating')}
                className="appearance-none min-h-11 sm:min-h-9 pl-8 pr-3 text-xs sm:text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
              >
                <option value="popularity">{t('grid.sortPopularity')}</option>
                <option value="date">{t('grid.sortDate')}</option>
                <option value="rating">{t('grid.sortRating')}</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-white/55 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          )}
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
            ? GRID_CLASSES
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
