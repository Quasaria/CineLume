import { useEffect } from 'react';

/**
 * Memorise l'element focus au moment de l'ouverture d'une modale et le
 * restaure quand la modale se ferme. Sans ca, le focus part au <body>
 * apres fermeture (les lecteurs d'ecran perdent le contexte, les users
 * clavier doivent re-tab depuis le debut).
 */
export function useFocusRestore(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement as HTMLElement | null;
    return () => {
      if (previousActive && typeof previousActive.focus === 'function') {
        // Petit delay pour laisser l'animation de fermeture se terminer,
        // sinon le focus part sur un element en train de disparaitre.
        requestAnimationFrame(() => {
          previousActive.focus();
        });
      }
    };
  }, [isOpen]);
}
