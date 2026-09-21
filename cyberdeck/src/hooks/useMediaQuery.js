import { useEffect, useState } from 'react';

/** Reactive `window.matchMedia`. SSR-safe default of `false`. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** True when the viewport is too narrow for the free-floating window layout. */
export function useIsCompact() {
  return useMediaQuery('(max-width: 1023px)');
}
