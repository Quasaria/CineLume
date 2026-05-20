import { useState, type RefObject, type TouchEvent } from 'react';

interface UseDragToCloseOptions {
  onClose: () => void;
  contentRef?: RefObject<HTMLElement | null>;
  threshold?: number;
  disabledWidth?: number;
}

export function useDragToClose({
  onClose,
  contentRef,
  threshold = 100,
  disabledWidth = 768,
}: UseDragToCloseOptions) {
  const [touchY, setTouchY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  return {
    onTouchStart: (e: TouchEvent<HTMLElement>) => {
      if (window.innerWidth >= disabledWidth) return;
      if (e.touches.length !== 1) return;
      // Si un input/textarea est focus, on n'enclenche pas le drag : l'user
      // est en train de taper et un slide accidentel le ferait close la
      // modale en perdant son texte.
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        setIsDragging(false);
        return;
      }
      // Drag uniquement si le contenu interne est tout en haut (sinon l'utilisateur scroll)
      if (contentRef?.current && contentRef.current.scrollTop > 0) {
        setIsDragging(false);
        return;
      }
      setTouchY(e.touches[0].clientY);
      setIsDragging(true);
    },
    onTouchMove: (e: TouchEvent<HTMLElement>) => {
      if (!isDragging || window.innerWidth >= disabledWidth || e.touches.length !== 1) return;
      const diff = e.touches[0].clientY - touchY;
      if (diff > 0) e.currentTarget.style.transform = `translateY(${diff * 0.4}px)`;
    },
    onTouchEnd: (e: TouchEvent<HTMLElement>) => {
      if (!isDragging || window.innerWidth >= disabledWidth) {
        setIsDragging(false);
        return;
      }
      const t = e.changedTouches[0];
      if (!t) {
        setIsDragging(false);
        return;
      }
      if (t.clientY - touchY > threshold) {
        onClose();
      } else {
        e.currentTarget.style.transform = '';
      }
      setIsDragging(false);
    },
  };
}
