import { useEffect, useRef } from 'react';

// Compteur module-level pour gerer les modales empilees (favorites -> film par ex.).
let lockCount = 0;
let prevOverflow: string | null = null;

export function useBodyScrollLock(isLocked: boolean) {
  const wasLocked = useRef(false);

  useEffect(() => {
    if (isLocked && !wasLocked.current) {
      wasLocked.current = true;
      if (lockCount === 0) {
        prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      lockCount++;
    } else if (!isLocked && wasLocked.current) {
      wasLocked.current = false;
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow ?? '';
        prevOverflow = null;
      }
    }

    return () => {
      if (wasLocked.current) {
        wasLocked.current = false;
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
          document.body.style.overflow = prevOverflow ?? '';
          prevOverflow = null;
        }
      }
    };
  }, [isLocked]);
}
