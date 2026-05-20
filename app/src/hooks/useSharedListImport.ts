import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { decodeSharedList } from '@/lib/listShare';
import { getMovieDetails } from '@/lib/tmdb';
import type { FavoriteMovie } from '@/types/movie';

/**
 * Detecte la presence d'une liste partagee dans le hash de l'URL au
 * chargement (#share/<base64>). Si trouvee, fetch les films via TMDB,
 * cree une nouvelle liste locale et nettoie le hash. Idempotent : on
 * memorise via ref qu'on a deja traite ce hash pour ne pas re-importer
 * au moindre re-render.
 */
export function useSharedListImport() {
  const { t } = useTranslation();
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#share/')) return;
    if (processedRef.current === hash) return;
    processedRef.current = hash;

    const decoded = decodeSharedList(hash);
    if (!decoded) {
      toast.error(t('lists.importedError'));
      // Nettoie le hash invalide pour ne pas le re-tenter
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }

    const toastId = 'shared-list-import';
    toast.loading(`${decoded.emoji ? decoded.emoji + ' ' : ''}${decoded.name}…`, { id: toastId });

    // Fetch en parallele (cap 4 a la fois pour respecter le rate limit
    // TMDB et eviter de noyer la connexion mobile). On capture decoded
    // dans des const locales pour que le narrowing TypeScript survive
    // a la traversee du closure async.
    const sharedName = decoded.name;
    const sharedEmoji = decoded.emoji;
    const sharedIds = decoded.ids;
    (async () => {
      const films: FavoriteMovie[] = [];
      const concurrency = 4;
      let i = 0;
      async function worker() {
        while (i < sharedIds.length) {
          const idx = i++;
          const id = sharedIds[idx];
          try {
            const m = await getMovieDetails(id);
            films.push({
              id: m.id,
              title: m.title,
              poster_path: m.poster_path,
              release_date: m.release_date,
              vote_average: m.vote_average,
              overview: m.overview,
              genre_ids: m.genre_ids,
            });
          } catch {
            // film indisponible, on saute
          }
        }
      }
      await Promise.all(Array.from({ length: concurrency }, worker));

      if (films.length === 0) {
        toast.error(t('lists.importedError'), { id: toastId });
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }

      // Cree la liste et y ajoute les films. Le nom recoit '(partage)'
      // pour eviter qu'il ecrase un eventuel doublon de meme nom.
      const state = useAppStore.getState();
      const listId = state.createList(`${sharedName} (partagé)`);
      if (sharedEmoji) state.setListEmoji(listId, sharedEmoji);
      films.forEach((f) => state.addFilmToList(listId, f));

      toast.success(t('lists.importedDesc', { count: films.length }), {
        id: toastId,
        duration: 5000,
        action: {
          label: t('lists.title'),
          onClick: () => useAppStore.getState().openLists(),
        },
      });

      history.replaceState(null, '', window.location.pathname + window.location.search);
    })();
  }, [t]);
}
