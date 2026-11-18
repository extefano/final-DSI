import { useEffect, useState } from 'react';

function detectTouchOrSmallViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = window.innerWidth < 768;
  return coarsePointer || narrowViewport;
}

export function useInputMode() {
  const [isMobileOrTouch, setIsMobileOrTouch] = useState<boolean>(
    detectTouchOrSmallViewport
  );

  useEffect(() => {
    const update = () => {
      setIsMobileOrTouch(detectTouchOrSmallViewport());
    };
    window.addEventListener('resize', update);
    const mq = window.matchMedia('(pointer: coarse)');
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
    }
    return () => {
      window.removeEventListener('resize', update);
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', update);
      }
    };
  }, []);

  return { isMobileOrTouch };
}
