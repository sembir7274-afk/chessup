import { useEffect, useRef } from 'react';

/**
 * requestAnimationFrame loop with an optional FPS cap. The callback receives
 * the delta in seconds since the previous invocation.
 */
export function useAnimationFrame(callback, { fps = 0, enabled = true } = {}) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;

    let handle = 0;
    let last = performance.now();
    const minDelta = fps > 0 ? 1000 / fps : 0;

    const loop = (time) => {
      handle = window.requestAnimationFrame(loop);
      const delta = time - last;
      if (delta < minDelta) return;
      last = time;
      cbRef.current(delta / 1000, time);
    };

    handle = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(handle);
  }, [fps, enabled]);
}
