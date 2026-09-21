import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State mirrored into localStorage. Reads are lazy and defensive: a corrupt
 * or blocked store (private mode, disabled site data) falls back to the
 * initial value instead of throwing during render.
 */
export function useLocalStorage(key, initialValue) {
  const initialRef = useRef(initialValue);

  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialRef.current;
      return JSON.parse(raw);
    } catch {
      return initialRef.current;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage unavailable — the session simply will not persist. */
    }
  }, [key, value]);

  const reset = useCallback(() => {
    setValue(initialRef.current);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* no-op */
    }
  }, [key]);

  return [value, setValue, reset];
}
