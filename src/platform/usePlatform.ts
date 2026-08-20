import { useEffect, useState } from 'react';
import { classify, type Platform } from './profiles';

function currentSize(): { w: number; h: number } {
  // In every hosting context the app fills its own window/iframe, so the window
  // inner size equals the container size.
  return {
    w: window.innerWidth || document.documentElement.clientWidth,
    h: window.innerHeight || document.documentElement.clientHeight,
  };
}

/** Reactively classify the current hosting context, re-evaluating on resize. */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>(() => {
    const { w, h } = currentSize();
    return classify(w, h);
  });

  useEffect(() => {
    const measure = () => {
      const { w, h } = currentSize();
      setPlatform((prev) => {
        const next = classify(w, h);
        if (
          prev.kind === next.kind &&
          prev.width === next.width &&
          prev.height === next.height &&
          (prev.kind !== 'widget' ||
            next.kind !== 'widget' ||
            prev.profile === next.profile)
        ) {
          return prev;
        }
        return next;
      });
    };
    measure();
    // Re-measure across the next frames + shortly after: the container can
    // settle to its real size just after mount without firing a resize event.
    const raf = requestAnimationFrame(measure);
    const timers = [
      window.setTimeout(measure, 120),
      window.setTimeout(measure, 400),
      window.setTimeout(measure, 1200),
    ];
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(document.documentElement);
    }
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, []);

  return platform;
}
