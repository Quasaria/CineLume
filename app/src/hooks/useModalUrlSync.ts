import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppStore } from '@/store/appStore';

function parseFilmId(pathname: string): number | null {
  const m = pathname.match(/^\/film\/(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}

// Synchronisation bidirectionnelle url <-> store sans boucle infinie.
// Astuce : on memorise la derniere valeur "sync" pour ne pas re-declencher
// le sens inverse quand le changement vient juste d'etre applique.
export function useModalUrlSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentModalMovieId = useAppStore((s) => s.currentModalMovieId);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const lastSyncedRef = useRef<{ urlId: number | null; storeId: number | null }>({
    urlId: parseFilmId(location.pathname),
    storeId: currentModalMovieId,
  });

  // URL -> store
  useEffect(() => {
    const urlId = parseFilmId(location.pathname);
    if (urlId === lastSyncedRef.current.urlId) return;
    lastSyncedRef.current.urlId = urlId;
    if (urlId === currentModalMovieId) return;
    lastSyncedRef.current.storeId = urlId;
    if (urlId !== null) openModal(urlId);
    else closeModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Store -> URL
  useEffect(() => {
    if (currentModalMovieId === lastSyncedRef.current.storeId) return;
    lastSyncedRef.current.storeId = currentModalMovieId;
    const urlId = parseFilmId(location.pathname);
    if (urlId === currentModalMovieId) return;
    lastSyncedRef.current.urlId = currentModalMovieId;
    if (currentModalMovieId !== null) {
      navigate(`/film/${currentModalMovieId}`);
    } else {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModalMovieId]);
}
