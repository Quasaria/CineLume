import { useEffect, useRef } from 'react';

interface UseSwipeBackOptions {
  onBack: () => void;
  enabled?: boolean;
  edgeWidth?: number;
  threshold?: number;
}

/**
 * Geste 'retour' iOS-like : swipe depuis le bord gauche vers la droite.
 * Active sur les modales et pages quand l'user veut revenir en arriere
 * sans cliquer sur la fleche retour.
 *
 * - edgeWidth : la distance depuis le bord gauche ou le geste demarre
 *   (defaut 24px). Au-dela, le geste n'est pas declenche pour ne pas
 *   intercepter les scrolls horizontaux internes.
 * - threshold : distance minimale du swipe pour declencher onBack.
 */
export function useSwipeBack({ onBack, enabled = true, edgeWidth = 24, threshold = 80 }: UseSwipeBackOptions) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;
    let startX = 0;
    let startY = 0;
    let active = false;

    function onStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > edgeWidth) return;
      startX = t.clientX;
      startY = t.clientY;
      active = true;
    }
    function onMove(e: TouchEvent) {
      if (!active || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // Si le mouvement devient plus vertical qu'horizontal, on abandonne :
      // l'user est en train de scroller, pas de swipe back.
      if (Math.abs(dy) > Math.abs(dx) * 1.5) {
        active = false;
      }
    }
    function onEnd(e: TouchEvent) {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (dx >= threshold && Math.abs(dy) < dx * 0.8) {
        onBackRef.current();
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, edgeWidth, threshold]);
}
