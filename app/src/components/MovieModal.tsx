import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, ExternalLink, Share2, Play, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { getMovieDetails, IMG, BACK, PROF, TMDB_SITE } from '@/lib/tmdb';
import { fmtDateFR } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const fmtDate = (d?: string) => fmtDateFR(d, { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDateShort = (d?: string) => fmtDateFR(d);

function fmtCurrency(n?: number) {
  if (!n) return 'N/A';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', notation: 'compact' }).format(n);
}

const statusMap: Record<string, string> = {
  'Released': 'Sorti',
  'Post Production': 'Post-prod',
  'In Production': 'Production',
  'Planned': 'Planifié',
};

const releaseTypeLabel: Record<number, string> = {
  1: 'Avant-première',
  2: 'Sortie limitée',
  3: 'Sortie en salles',
  4: 'Sortie numérique',
  5: 'Sortie physique',
  6: 'Sortie TV',
};

export function MovieModal() {
  const { currentModalMovieId, closeModal, isFav, toggleFav, selRegion } = useAppStore();
  const [touchY, setTouchY] = useState(0);

  const { data: details, isLoading } = useQuery({
    queryKey: ['movieDetails', currentModalMovieId],
    queryFn: () => getMovieDetails(currentModalMovieId!),
    enabled: currentModalMovieId !== null,
  });

  const movie = details;

  useEffect(() => {
    if (currentModalMovieId !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [currentModalMovieId]);

  async function shareMovie() {
    if (!movie) return;
    const url = `${TMDB_SITE}/${movie.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: movie.title, url });
      } catch {
        // L'utilisateur a annule, on ignore
      }
      return;
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié');
      } catch {
        toast.error('Impossible de copier le lien');
      }
      return;
    }
    toast.message('Partage non supporté', { description: url });
  }

  return (
    <AnimatePresence>
      {currentModalMovieId !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={closeModal}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl max-h-[92dvh] sm:max-h-[85vh] bg-[#0f0f15] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            onTouchStart={(e) => {
              if (e.touches.length !== 1) return;
              setTouchY(e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (window.innerWidth >= 640 || e.touches.length !== 1) return;
              const diff = e.touches[0].clientY - touchY;
              if (diff > 0) e.currentTarget.style.transform = `translateY(${diff * 0.4}px)`;
            }}
            onTouchEnd={(e) => {
              if (window.innerWidth >= 640) return;
              const t = e.changedTouches[0];
              if (!t) return;
              if (t.clientY - touchY > 100) {
                closeModal();
              } else {
                e.currentTarget.style.transform = '';
              }
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Fermer la fiche film"
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/40 hover:bg-white/20 backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5 text-white" aria-hidden="true" />
            </button>

            <div className="w-10 h-1 rounded-full bg-white/20 absolute top-3 left-1/2 -translate-x-1/2 sm:hidden z-50" />

            <div className="overflow-y-auto flex-1 custom-scroll">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-48 sm:h-72 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-8 w-3/4 bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-white/5" />
                  <Skeleton className="h-24 w-full bg-white/5" />
                </div>
              ) : movie ? (
                <>
                  <div className="relative h-48 sm:h-72 w-full overflow-hidden">
                    {movie.backdrop_path ? (
                      <img
                        src={`${BACK}${movie.backdrop_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover opacity-50"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-cyan-900/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f15] via-[#0f0f15]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f15]/80 to-transparent hidden sm:block" />
                  </div>

                  <div className="px-5 sm:px-10 pb-10 -mt-16 sm:-mt-24 flex flex-col sm:flex-row gap-6 sm:gap-8 relative">
                    <div className="hidden sm:block w-44 lg:w-52 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#18181f] self-start sticky top-6">
                      <img
                        src={`${IMG}${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0 pt-2">
                      <div className="flex flex-wrap gap-2 mb-3 items-center">
                        <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 text-xs font-bold border border-violet-500/20">
                          {fmtDate(movie.release_date)}
                        </span>
                        {movie.runtime > 0 && (
                          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 text-white/50 text-xs font-medium border border-white/10">
                            <Clock className="w-3 h-3" />
                            {Math.floor(movie.runtime / 60)}h{String(movie.runtime % 60).padStart(2, '0')}
                          </span>
                        )}
                        {movie.status && statusMap[movie.status] && (
                          <span className="px-3 py-1 rounded-full bg-white/5 text-white/50 text-xs font-medium border border-white/10">
                            {statusMap[movie.status]}
                          </span>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
                          {movie.title}
                        </h2>
                        <button
                          onClick={() =>
                            toggleFav({
                              id: movie.id,
                              title: movie.title,
                              poster_path: movie.poster_path,
                              release_date: movie.release_date,
                              vote_average: movie.vote_average,
                            })
                          }
                          className={`p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0 mt-1 ${
                            isFav(movie.id) ? 'text-red-500' : 'text-white/70'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isFav(movie.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {movie.credits?.crew?.find((c) => c.job === 'Director') && (
                        <p className="text-cyan-400/80 text-sm font-medium mb-4">
                          Réalisé par{' '}
                          <span className="text-white">
                            {movie.credits.crew.find((c) => c.job === 'Director')?.name}
                          </span>
                        </p>
                      )}

                      {(() => {
                        const regional = movie.release_dates?.results
                          .find((r) => r.iso_3166_1 === selRegion)
                          ?.release_dates
                          .filter((d) => releaseTypeLabel[d.type])
                          .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
                        if (!regional || regional.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1.5 mb-5">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold self-center mr-1">
                              Sortie {selRegion}
                            </span>
                            {regional.map((r, i) => (
                              <span key={i} className="text-[11px] text-white/60 bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1">
                                {releaseTypeLabel[r.type]} <span className="text-white font-semibold ml-1">{fmtDateShort(r.release_date)}</span>
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap items-center gap-3 mb-5">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-sm">
                            {movie.vote_average > 0 ? movie.vote_average.toFixed(1) : 'N/A'}
                          </span>
                          <span className="text-white/30 text-xs">/10</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {movie.genres?.slice(0, 4).map((g) => (
                            <span
                              key={g.id}
                              className="px-2.5 py-1 rounded-lg bg-white/5 text-white/50 text-xs border border-white/5"
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mb-6">
                        {(() => {
                          const yt = movie.videos?.results ?? [];
                          const video =
                            yt.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
                            yt.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ??
                            yt.find((v) => v.site === 'YouTube');
                          if (!video) return null;
                          return (
                            <a
                              href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-cyan-400 hover:text-white transition-colors"
                            >
                              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                              {video.type === 'Trailer' ? 'Bande-annonce' : video.type === 'Teaser' ? 'Teaser' : 'Vidéo'}
                            </a>
                          );
                        })()}
                        <a
                          href={`${TMDB_SITE}/${movie.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-white font-semibold text-sm hover:bg-white/10 transition-colors border border-white/10"
                        >
                          <ExternalLink className="w-4 h-4" />
                          TMDB
                        </a>
                        <button
                          onClick={shareMovie}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-white font-semibold text-sm hover:bg-white/10 transition-colors border border-white/10"
                        >
                          <Share2 className="w-4 h-4" />
                          Partager
                        </button>
                      </div>

                      {(movie.budget || movie.revenue || movie.vote_count) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Budget</p>
                            <p className="text-sm font-semibold">{fmtCurrency(movie.budget)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Recettes</p>
                            <p className="text-sm font-semibold">{fmtCurrency(movie.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Langue</p>
                            <p className="text-sm font-semibold uppercase">{movie.original_language || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Votes</p>
                            <p className="text-sm font-semibold">{movie.vote_count?.toLocaleString('fr-FR') || '0'}</p>
                          </div>
                        </div>
                      )}

                      <h3 className="font-bold text-white mb-2">Synopsis</h3>
                      <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-8">
                        {movie.overview || 'Synopsis indisponible.'}
                      </p>

                      {movie.credits?.cast && movie.credits.cast.length > 0 && (
                        <>
                          <h3 className="font-bold text-white mb-3">Distribution</h3>
                          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {movie.credits.cast.slice(0, 10).map((actor) => (
                              <div key={actor.id} className="flex flex-col items-center min-w-[65px]">
                                <div className="w-14 h-14 rounded-full overflow-hidden mb-1.5 bg-white/5 border border-white/10 flex items-center justify-center">
                                  {actor.profile_path ? (
                                    <img
                                      src={`${PROF}${actor.profile_path}`}
                                      alt={actor.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Users className="w-4 h-4 text-white/20" />
                                  )}
                                </div>
                                <span className="text-[11px] text-white font-medium text-center leading-tight w-full truncate">
                                  {actor.name}
                                </span>
                                <span className="text-[10px] text-white/30 text-center leading-tight w-full truncate">
                                  {actor.character}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
