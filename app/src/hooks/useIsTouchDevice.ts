import { useEffect, useState } from 'react';

/**
 * Detecte si l'appareil est principalement tactile (pas de hover, pointer
 * grossier). Couvre phones + tablettes Android/iPad, exclut les desktops,
 * meme avec ecran tactile annexe (qui exposent generalement aussi un
 * pointer fin via souris/trackpad).
 *
 * A utiliser pour activer des gestures touch (pull-to-refresh, swipe...)
 * sans se baser sur la largeur d'ecran (qui filtre mal les tablettes
 * larges en mode paysage).
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isTouch;
}
