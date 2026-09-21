import { useEffect, useRef } from 'react';

const isEditable = (target) => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
};

/**
 * Global keyboard bindings.
 *
 * `bindings` maps a normalised combo (`mod+k`, `shift+?`, `escape`) to a
 * handler. Combos fire even inside inputs when they carry a modifier, and
 * bare keys are suppressed while the user is typing.
 */
export function useHotkeys(bindings, { enabled = true } = {}) {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      const parts = [];
      if (mod) parts.push('mod');
      if (event.altKey) parts.push('alt');
      if (event.shiftKey) parts.push('shift');
      parts.push(key === ' ' ? 'space' : key);

      const combo = parts.join('+');
      const handler = ref.current[combo] ?? ref.current[key];
      if (!handler) return;
      // Bare keys must not hijack typing.
      if (!mod && !event.altKey && isEditable(event.target) && key !== 'escape') return;

      event.preventDefault();
      handler(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
