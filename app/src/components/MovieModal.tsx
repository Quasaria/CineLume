import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, ExternalLink, Share2, Play, Clock, Users, Maximize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { getMovieDetails, IMG, BACK, PROF, ORIG, TMDB_SITE, posterSrcSet, backdropSrcSet, profileSrcSet } from '@/lib/tmdb';
import { fmtDateLocalized } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDragToClose } from '@/hooks/useDragToClose';
import { useFocusRestore } from '@/hooks/useFocusRestore';

export function MovieModal() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { currentModalMovieId, closeModal, isFav, toggleFav, selRegion } = useAppStore();

  const fmtDate = (d?: string) => fmtDateLocalized(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDateShort = (d?: string) => fmtDateLocalized(d);

  function fmtCurrency(n?: number) {
    if (!n) return t('common.na');
    return new Intl.NumberFormat(lang || 'fr', { style: 'currency', currency: 'USD', notation: 'compact' }).format(n);
  }
  const contentRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const dragHandlers = useDragToClose({ onClose: closeModal, contentRef });

  // Si la lightbox est ouverte, Echap la ferme en priorite avant la modale.
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [lightbox]);

  const { data: details, isLoading } = useQuery({
    queryKey: ['movieDetails', currentModalMovieId, lang],
    queryFn: () => getMovieDetails(currentModalMovieId!),
    enabled: currentModalMovieId !== null,
  });

  const movie = details;
  useBodyScrollLock(currentModalMovieId !== null);
  useFocusRestore(currentModalMovieId !== null);

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
        toast.success(t('share.linkCopied'));
      } catch {
        toast.error(t('share.copyError'));
      }
      return;
    }
    toast.message(t('share.notSupported'), { description: url });
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="movie-modal-title"
            className="relative w-full max-w-4xl max-h-[92dvh] sm:max-h-[85vh] bg-[#0f0f15] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            {...dragHandlers}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label={t('modal.close')}
              className="absolute top-5 right-5 sm:top-5 sm:right-5 z-50 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-white/20 active:bg-white/30 backdrop-blur-md transition-colors shadow-lg shadow-black/30"
            >
              <X className="w-5 h-5 text-white" aria-hidden="true" />
            </button>

            <div className="w-12 h-1.5 rounded-full bg-white/40 absolute top-2.5 left-1/2 -translate-x-1/2 sm:hidden z-50" aria-hidden="true" />

            <div ref={contentRef} className="overflow-y-auto flex-1 custom-scroll overscroll-contain">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-48 sm:h-72 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-8 w-3/4 bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-white/5" />
                  <Skeleton className="h-24 w-full bg-white/5" />
                </div>
              ) : movie ? (
                <>
                  <div className="relative h-72 sm:h-[28rem] w-full overflow-hidden group">
                    {movie.backdrop_path ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(`${ORIG}${movie.backdrop_path}`)}
                        aria-label={t('modal.expandBackdrop')}
                        className="block w-full h-full cursor-zoom-in"
                      >
                        <img
                          src={`${BACK}${movie.backdrop_path}`}
                          srcSet={backdropSrcSet(movie.backdrop_path)}
                          sizes="(max-width: 640px) 100vw, 80vw"
                          alt={movie.title}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {t('modal.expand')}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-cyan-900/20" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0f0f15] via-[#0f0f15]/70 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f15]/40 to-transparent hidden sm:block pointer-events-none" />
                  </div>

                  <div className="px-5 sm:px-10 pb-10 -mt-24 sm:-mt-32 flex flex-col sm:flex-row gap-6 sm:gap-8 relative">
                    {movie.poster_path && (
                      <button
                        type="button"
                        onClick={() => setLightbox(`${ORIG}${movie.poster_path}`)}
                        aria-label={t('modal.expandPoster')}
                        className="hidden sm:block w-44 lg:w-52 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#18181f] self-start sticky top-6 cursor-zoom-in group/poster"
                      >
                        <img
                          src={`${IMG}${movie.poster_path}`}
                          srcSet={posterSrcSet(movie.poster_path)}
                          sizes="208px"
                          alt={movie.title}
                          className="w-full h-auto group-hover/poster:scale-[1.02] transition-transform"
                          loading="lazy"
                        />
                      </button>
                    )}

                    <div className="flex-1 min-w-0 pt-2">
                      {(() => {
                        // Derive le statut affiche du film a partir de la date de
                        // sortie FR (ou primary mondiale en fallback) vs aujourd'hui,
                        // pour eviter d'afficher "Sorti" sur un film prevu dans 2 jours
                        // juste parce que TMDB a deja flag movie.status = Released
                        // pour la sortie monde.
                        const today = new Date().toISOString().split('T')[0];
                        const frTheater = movie.release_dates?.results
                          .find((r) => r.iso_3166_1 === selRegion)
                          ?.release_dates
                          .filter((d) => [2, 3].includes(d.type) && d.release_date)
                          .map((d) => d.release_date.split('T')[0])
                          .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
                          .sort()[0];
                        const refDate = frTheater || movie.release_date;
                        const derivedStatus = refDate
                          ? refDate <= today
                            ? 'Released'
                            : 'Upcoming'
                          : null;

                        return (
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
                            {derivedStatus && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                derivedStatus === 'Upcoming'
                                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                  : 'bg-white/5 text-white/60 border-white/10'
                              }`}>
                                {t(`modal.status.${derivedStatus}`)}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h2 id="movie-modal-title" className="text-2xl sm:text-4xl font-bold leading-tight">
                          {movie.title}
                        </h2>
                        <button
                          type="button"
                          onClick={() =>
                            toggleFav({
                              id: movie.id,
                              title: movie.title,
                              poster_path: movie.poster_path,
                              release_date: movie.release_date,
                              vote_average: movie.vote_average,
                            })
                          }
                          aria-label={isFav(movie.id) ? t('favorites.remove', { title: movie.title }) : t('favorites.addToFav', { title: movie.title })}
                          aria-pressed={isFav(movie.id)}
                          className={`hidden sm:flex min-w-11 min-h-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors shrink-0 mt-1 ${
                            isFav(movie.id) ? 'text-red-500' : 'text-white/80'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isFav(movie.id) ? 'fill-current' : ''}`} aria-hidden="true" />
                        </button>
                      </div>

                      {movie.credits?.crew?.find((c) => c.job === 'Director') && (
                        <p className="text-cyan-400/80 text-sm font-medium mb-4">
                          {t('modal.directedBy')}{' '}
                          <span className="text-white">
                            {movie.credits.crew.find((c) => c.job === 'Director')?.name}
                          </span>
                        </p>
                      )}

                      {(() => {
                        // On filtre les entrees sans date valide (TMDB en met
                        // parfois avec un release_date vide), sinon on affichait
                        // "Date inconnue" alors que la vraie date est connue
                        // par ailleurs dans le json.
                        const regional = movie.release_dates?.results
                          .find((r) => r.iso_3166_1 === selRegion)
                          ?.release_dates
                          .filter((d) => [1, 2, 3, 4, 5, 6].includes(d.type) && d.release_date && /^\d{4}-\d{2}-\d{2}/.test(d.release_date))
                          .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
                        if (!regional || regional.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1.5 mb-5">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold self-center mr-1">
                              {t('modal.releaseIn', { region: selRegion })}
                            </span>
                            {regional.map((r, i) => (
                              <span key={i} className="text-[11px] text-white/70 bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1">
                                {t(`modal.releaseType.${r.type}`)} <span className="text-white font-semibold ml-1">{fmtDateShort(r.release_date)}</span>
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap items-center gap-3 mb-5">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-sm">
                            {movie.vote_average > 0 ? movie.vote_average.toFixed(1) : t('common.na')}
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

                      <div className="hidden sm:flex sm:flex-wrap gap-3 mb-6">
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
                              className="col-span-2 sm:col-auto flex items-center justify-center sm:justify-start gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-cyan-400 hover:text-white active:bg-cyan-500 transition-colors min-h-12"
                            >
                              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                              {video.type === 'Trailer' ? t('modal.trailer') : video.type === 'Teaser' ? t('modal.teaser') : t('modal.video')}
                            </a>
                          );
                        })()}
                        <a
                          href={`${TMDB_SITE}/${movie.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center sm:justify-start gap-2 px-5 py-3 rounded-xl bg-white/5 text-white font-semibold text-sm hover:bg-white/10 active:bg-white/15 transition-colors border border-white/10 min-h-12"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          TMDB
                        </a>
                        <button
                          type="button"
                          onClick={shareMovie}
                          className="flex items-center justify-center sm:justify-start gap-2 px-5 py-3 rounded-xl bg-white/5 text-white font-semibold text-sm hover:bg-white/10 active:bg-white/15 transition-colors border border-white/10 min-h-12"
                        >
                          <Share2 className="w-4 h-4" aria-hidden="true" />
                          {t('modal.share')}
                        </button>
                      </div>

                      {(movie.budget || movie.revenue || movie.vote_count) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                          <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{t('modal.budget')}</p>
                            <p className="text-sm font-semibold">{fmtCurrency(movie.budget)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{t('modal.revenue')}</p>
                            <p className="text-sm font-semibold">{fmtCurrency(movie.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{t('modal.language')}</p>
                            <p className="text-sm font-semibold uppercase">{movie.original_language || t('common.na')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{t('modal.votes')}</p>
                            <p className="text-sm font-semibold">{movie.vote_count?.toLocaleString(lang || 'fr') || '0'}</p>
                          </div>
                        </div>
                      )}

                      <h3 className="font-bold text-white mb-2">{t('modal.synopsis')}</h3>
                      <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-8">
                        {movie.overview || t('modal.noSynopsis')}
                      </p>

                      {movie.credits?.cast && movie.credits.cast.length > 0 && (
                        <>
                          <h3 className="font-bold text-white mb-3">{t('modal.cast')}</h3>
                          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {movie.credits.cast.slice(0, 10).map((actor) => (
                              <div key={actor.id} className="flex flex-col items-center min-w-[65px]">
                                <div className="w-14 h-14 rounded-full overflow-hidden mb-1.5 bg-white/5 border border-white/10 flex items-center justify-center">
                                  {actor.profile_path ? (
                                    <img
                                      src={`${PROF}${actor.profile_path}`}
                                      srcSet={profileSrcSet(actor.profile_path)}
                                      sizes="56px"
                                      alt={actor.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Users className="w-4 h-4 text-white/20" aria-hidden="true" />
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

            {/* Sticky action bar mobile : Bande-annonce + Favori + Partager */}
            {movie && (
              <div className="sm:hidden border-t border-white/10 bg-[#0f0f15]/95 backdrop-blur-md px-4 py-3 flex items-center gap-2 safe-pb shrink-0">
                {(() => {
                  const yt = movie.videos?.results ?? [];
                  const video =
                    yt.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
                    yt.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ??
                    yt.find((v) => v.site === 'YouTube');
                  if (video) {
                    return (
                      <a
                        href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black font-semibold text-sm active:bg-cyan-400 transition-colors min-h-12"
                      >
                        <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                        {video.type === 'Trailer' ? t('modal.trailer') : video.type === 'Teaser' ? t('modal.teaser') : t('modal.video')}
                      </a>
                    );
                  }
                  return (
                    <a
                      href={`${TMDB_SITE}/${movie.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black font-semibold text-sm active:bg-cyan-400 transition-colors min-h-12"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      TMDB
                    </a>
                  );
                })()}
                <button
                  type="button"
                  onClick={() =>
                    toggleFav({
                      id: movie.id,
                      title: movie.title,
                      poster_path: movie.poster_path,
                      release_date: movie.release_date,
                      vote_average: movie.vote_average,
                    })
                  }
                  aria-label={isFav(movie.id) ? t('favorites.remove', { title: movie.title }) : t('favorites.addToFav', { title: movie.title })}
                  aria-pressed={isFav(movie.id)}
                  className={`min-w-12 min-h-12 flex items-center justify-center rounded-xl bg-white/8 active:bg-white/15 border border-white/10 transition-colors ${
                    isFav(movie.id) ? 'text-red-500' : 'text-white/80'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFav(movie.id) ? 'fill-current' : ''}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={shareMovie}
                  aria-label={t('modal.share')}
                  className="min-w-12 min-h-12 flex items-center justify-center rounded-xl bg-white/8 active:bg-white/15 border border-white/10 text-white/80 transition-colors"
                >
                  <Share2 className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {lightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <motion.img
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            src={lightbox}
            alt=""
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label={t('modal.closeLightbox')}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 hover:bg-white/20 backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
