import { useCallback, useEffect, useRef, useState } from 'react';

const MARGIN = 8;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Pointer-driven move and resize for a floating window.
 *
 * Writes go through `onChange` on every frame of the gesture and `onCommit`
 * once on release, so the owner can persist only the settled geometry rather
 * than every intermediate pixel.
 */
export function useDragResize({
  rect,
  onChange,
  onCommit,
  minWidth = 280,
  minHeight = 180,
  headerOffset = 0,
  disabled = false,
}) {
  const [mode, setMode] = useState(null); // 'drag' | 'resize' | null
  const gesture = useRef(null);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const handlers = useRef({ onChange, onCommit });
  handlers.current = { onChange, onCommit };

  const begin = useCallback(
    (event, nextMode, direction = 'se') => {
      if (disabled || event.button === 2) return;
      event.preventDefault();
      event.stopPropagation();

      gesture.current = {
        mode: nextMode,
        direction,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...rectRef.current },
      };
      setMode(nextMode);
    },
    [disabled],
  );

  const beginDrag = useCallback((event) => begin(event, 'drag'), [begin]);
  const beginResize = useCallback(
    (event, direction) => begin(event, 'resize', direction),
    [begin],
  );

  useEffect(() => {
    if (!mode) return undefined;

    const handleMove = (event) => {
      const g = gesture.current;
      if (!g) return;

      const dx = event.clientX - g.startX;
      const dy = event.clientY - g.startY;
      const maxX = window.innerWidth;
      const maxY = window.innerHeight;

      if (g.mode === 'drag') {
        handlers.current.onChange({
          ...g.origin,
          // Keep at least a sliver of the title bar reachable on every edge.
          x: clamp(g.origin.x + dx, MARGIN - g.origin.width + 120, maxX - 120),
          y: clamp(g.origin.y + dy, headerOffset, maxY - 56),
        });
        return;
      }

      const dir = g.direction;
      let { x, y, width, height } = g.origin;

      if (dir.includes('e')) width = g.origin.width + dx;
      if (dir.includes('s')) height = g.origin.height + dy;
      if (dir.includes('w')) {
        width = g.origin.width - dx;
        x = g.origin.x + dx;
      }
      if (dir.includes('n')) {
        height = g.origin.height - dy;
        y = g.origin.y + dy;
      }

      // Clamp size first, then correct the anchor so west/north drags do not
      // let the opposite edge creep once the minimum is reached.
      const clampedWidth = clamp(width, minWidth, maxX - MARGIN * 2);
      const clampedHeight = clamp(height, minHeight, maxY - MARGIN * 2);
      if (dir.includes('w')) x = g.origin.x + g.origin.width - clampedWidth;
      if (dir.includes('n')) y = clamp(g.origin.y + g.origin.height - clampedHeight, headerOffset, maxY);

      handlers.current.onChange({ x, y, width: clampedWidth, height: clampedHeight });
    };

    const handleUp = () => {
      gesture.current = null;
      setMode(null);
      handlers.current.onCommit?.(rectRef.current);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    // Suppress text selection and hover noise for the duration of the gesture.
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = mode === 'drag' ? 'grabbing' : 'nwse-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = '';
    };
  }, [mode, minWidth, minHeight, headerOffset]);

  return { beginDrag, beginResize, isDragging: mode === 'drag', isResizing: mode === 'resize' };
}
