import { useEffect, useState, type ReactNode } from 'react';

import { prefersReducedMotion } from './motion';

export function CountUp({ value, className }: { value: ReactNode; className?: string }) {
  const numeric = typeof value === 'number' ? value : Number(value);
  const canAnimate = Number.isFinite(numeric);
  const [shown, setShown] = useState(canAnimate ? 0 : value);

  useEffect(() => {
    if (!canAnimate) {
      setShown(value);
      return;
    }
    if (prefersReducedMotion() || import.meta.env.MODE === 'test') {
      setShown(numeric);
      return;
    }

    const duration = Math.min(700, 240 + Math.abs(numeric) * 40);
    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(numeric * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [canAnimate, numeric, value]);

  return <span className={className}>{canAnimate ? shown : value}</span>;
}
