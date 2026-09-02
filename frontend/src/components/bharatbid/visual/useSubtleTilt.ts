import { useEffect, useRef } from 'react';

import { isCoarsePointer, prefersReducedMotion } from './motion';

export function useSubtleTilt<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion() || isCoarsePointer()) {
      return;
    }

    function onMove(event: PointerEvent) {
      if (!element) {
        return;
      }
      const box = element.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      element.style.transform = `perspective(900px) rotateX(${(-y * 2).toFixed(2)}deg) rotateY(${(x * 2).toFixed(2)}deg)`;
    }

    function onLeave() {
      if (!element) {
        return;
      }
      element.style.transform = '';
    }

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      element.style.transform = '';
    };
  }, []);

  return ref;
}
