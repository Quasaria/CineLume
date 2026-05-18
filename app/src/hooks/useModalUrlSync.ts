import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppStore } from '@/store/appStore';

function parseFilmId(pathname: string): number | null {
  const m = pathname.match(/^\/film\/(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}

export function useModalUrlSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentModalMovieId = useAppStore((s) => s.currentModalMovieId);
  const openModal = useAppStore((s) => s.openModal);
  const closeModal = useAppStore((s) => s.closeModal);

  useEffect(() => {
    const urlId = parseFilmId(location.pathname);
    if (urlId === currentModalMovieId) return;
    if (urlId !== null) openModal(urlId);
    else closeModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const urlId = parseFilmId(location.pathname);
    if (urlId === currentModalMovieId) return;
    if (currentModalMovieId !== null) {
      navigate(`/film/${currentModalMovieId}`);
    } else {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModalMovieId]);
}
