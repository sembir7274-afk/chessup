import { useEffect, useRef, useState } from 'react';

/**
 * Pointer position normalised to -1..1 on both axes, origin at screen centre.
 * Updates are throttled to one per animation frame so parallax consumers do
 * not re-render on every raw mousemove.
 */
export function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const frame = useRef(0);
  const latest = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event) => {
      latest.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = 0;
        setPosition(latest.current);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return position;
}
