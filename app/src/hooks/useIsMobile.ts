import { useEffect, useState } from 'react';

// 768 = breakpoint md de Tailwind. Inclut telephones + tablettes portrait.
// Sur tablette portrait (iPad 768x1024), on veut garder le comportement
// mobile (bottom-sheet plein largeur, drag-to-close, sticky action bar...)
// au lieu de basculer en modale flottante centree avec 25% de vide autour.
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}
