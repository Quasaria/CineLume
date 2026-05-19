import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getPersonDetails, PROF, profileSrcSet } from '@/lib/tmdb';

const BIO_LIMIT = 320;

/**
 * En-tete plein de la 'page personne' : photo + nom + departement + bio.
 * Affiche au-dessus de la grille de films quand selectedPerson est set.
 * Le bouton retour en haut a gauche revient au film d'origine si la
 * navigation est venue depuis une modale (cast click), sinon il efface
 * juste le filtre personne et retourne a la grille de la semaine en cours.
 */
export function PersonHeader() {
  const { t, i18n } = useTranslation();
  const selectedPerson = useAppStore((s) => s.selectedPerson);
  const previousFilmId = useAppStore((s) => s.previousFilmId);
  const setSelectedPerson = useAppStore((s) => s.setSelectedPerson);
  const goBackToFilm = useAppStore((s) => s.goBackToFilm);
  const [bioExpanded, setBioExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['personDetails', selectedPerson?.id, i18n.language],
    queryFn: ({ signal }) => getPersonDetails(selectedPerson!.id, signal),
    enabled: !!selectedPerson,
  });

  if (!selectedPerson) return null;

  const profile = data?.profile_path ?? null;
  const department = data?.known_for_department;
  const bio = data?.biography?.trim() || '';
  const longBio = bio.length > BIO_LIMIT;
  const displayedBio = !longBio || bioExpanded ? bio : bio.slice(0, BIO_LIMIT).trimEnd() + '…';

  function handleBack() {
    if (previousFilmId !== null) {
      goBackToFilm();
    } else {
      setSelectedPerson(null);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 sm:mb-8"
      aria-label={selectedPerson.name}
    >
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 mb-4 px-3 py-2 min-h-11 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {previousFilmId !== null ? t('person.backToFilm') : t('person.back')}
      </button>

      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="w-32 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-xl shadow-black/20">
            {profile ? (
              <img
                src={`${PROF}${profile}`}
                srcSet={profileSrcSet(profile)}
                sizes="(min-width: 640px) 160px, 128px"
                alt={selectedPerson.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-12 h-12 text-white/30" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
            {selectedPerson.name}
          </h2>
          {department && (
            <p className="text-sm text-violet-300 font-medium mb-3">
              {t(`persons.department.${department}`, { defaultValue: department })}
            </p>
          )}

          {isLoading ? (
            <div className="space-y-2 max-w-2xl">
              <div className="h-3 rounded bg-white/[0.07] w-full" />
              <div className="h-3 rounded bg-white/[0.07] w-11/12" />
              <div className="h-3 rounded bg-white/[0.07] w-4/5" />
            </div>
          ) : bio ? (
            <div className="max-w-2xl">
              <p className="text-sm sm:text-[15px] leading-relaxed text-white/75 whitespace-pre-line">
                {displayedBio}
              </p>
              {longBio && (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="mt-2 text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
                >
                  {bioExpanded ? t('person.showLess') : t('person.showMore')}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/50 italic">{t('person.noBio')}</p>
          )}
        </div>
      </div>

      <h3 className="mt-6 sm:mt-8 text-xs font-bold text-white/60 uppercase tracking-wider">
        {t('person.filmography')}
      </h3>
    </motion.section>
  );
}
