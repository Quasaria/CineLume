import { useState, useRef, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Pull-to-refresh natif sur la page : detecte un drag vers le bas a partir
 * du haut absolu du scroll (window.scrollY <= 0) et declenche un refresh
 * quand on relache au-dela du seuil.
 *
 * Le composant qui utilise ce hook recoit pullDistance (pour afficher un
 * indicateur visuel qui descend avec le doigt) et isRefreshing (pour
 * passer en mode spinner pendant l'execution du refresh).
 *
 * On utilise un ref pour la valeur "live" du pull et un state separe pour
 * declencher les re-renders. Sans le ref on perdrait la valeur pendant
 * le touchend.
 */
export function usePullToRefresh({ onRefresh, threshold = 80, enabled = true }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullRef = useRef(0);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      isPulling = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;
      // Si l'user a scrolle entre temps (interaction avec une zone scrollable
      // au-dessus de notre zone par exemple), on abandonne.
      if (window.scrollY > 0) {
        isPulling = false;
        pullRef.current = 0;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY;
      if (delta > 0) {
        // Rubber band damping : le pull est mou, on n'avance qu'a 50% de la
        // distance reelle, cap a 1.5x le threshold pour ne pas exagerer.
        const damped = Math.min(delta * 0.5, threshold * 1.5);
        pullRef.current = damped;
        setPullDistance(damped);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshingRef.current) {
        isPulling = false;
        return;
      }
      isPulling = false;
      const finalPull = pullRef.current;

      if (finalPull >= threshold) {
        setIsRefreshing(true);
        isRefreshingRef.current = true;
        try {
          await onRefresh();
        } finally {
          // Petit delay pour que l'indicateur reste visible 300ms apres la
          // fin du refresh : l'user voit que ca s'est bien passe.
          setTimeout(() => {
            setIsRefreshing(false);
            isRefreshingRef.current = false;
            setPullDistance(0);
            pullRef.current = 0;
          }, 300);
        }
      } else {
        setPullDistance(0);
        pullRef.current = 0;
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onRefresh, threshold, enabled]);

  return { pullDistance, isRefreshing };
}
