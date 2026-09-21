import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const WindowContext = createContext(null);

/** Measured chrome heights — the free area sits between these two bars. */
export const HEADER_HEIGHT = 65;
export const FOOTER_HEIGHT = 37;

/**
 * Default desktop arrangement expressed on a 12x10 grid of the free area.
 * Keeping it relative means the deck lays out sensibly on any display.
 */
const GRID_LAYOUT = {
  tasks: { col: 0, row: 0, w: 4, h: 10 },
  pomodoro: { col: 4, row: 0, w: 4, h: 6 },
  system: { col: 8, row: 0, w: 4, h: 5 },
  visualizer: { col: 4, row: 6, w: 4, h: 4 },
  soundboard: { col: 8, row: 5, w: 4, h: 5 },
};

export const OPACITY_STEPS = [
  { id: 'solid', label: 'SOLID', value: 0.92 },
  { id: 'glass', label: 'GLASS', value: 0.68 },
  { id: 'ghost', label: 'GHOST', value: 0.38 },
];

const MARGIN = 14;

/** Convert the grid definition into pixel rects for the current viewport. */
export function computeDefaultRects(ids) {
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 900 : window.innerHeight;

  const area = {
    x: MARGIN,
    y: HEADER_HEIGHT,
    w: Math.max(640, vw - MARGIN * 2),
    h: Math.max(480, vh - HEADER_HEIGHT - FOOTER_HEIGHT - MARGIN),
  };
  const col = area.w / 12;
  const row = area.h / 10;

  const rects = {};
  ids.forEach((id, index) => {
    const cell = GRID_LAYOUT[id] ?? {
      col: (index * 4) % 12,
      row: 0,
      w: 4,
      h: 5,
    };
    rects[id] = {
      x: Math.round(area.x + cell.col * col + (cell.col === 0 ? 0 : MARGIN / 2)),
      y: Math.round(area.y + cell.row * row + (cell.row === 0 ? 0 : MARGIN / 2)),
      width: Math.round(cell.w * col - MARGIN),
      height: Math.round(cell.h * row - MARGIN),
    };
  });
  return rects;
}

const makeInitialState = (ids) => {
  const rects = computeDefaultRects(ids);
  const windows = {};
  ids.forEach((id, index) => {
    windows[id] = {
      id,
      rect: rects[id],
      minimized: false,
      maximized: false,
      open: true,
      opacity: 'glass',
      z: index + 1,
    };
  });
  return { windows, order: [...ids], focused: ids[0] ?? null };
};

/**
 * Floating window manager: geometry, stacking order, and the minimise /
 * maximise / close / transparency chrome state for every widget frame.
 */
export function WindowProvider({ ids, children }) {
  const idsKey = ids.join('|');
  const [persisted, setPersisted, resetPersisted] = useLocalStorage(
    'cyberdeck.windows.v1',
    null,
  );

  const [state, setState] = useState(() => {
    const base = makeInitialState(ids);
    if (!persisted?.windows) return base;
    // Merge stored geometry over defaults so newly added widgets still appear.
    const windows = { ...base.windows };
    Object.entries(persisted.windows).forEach(([id, stored]) => {
      if (!windows[id]) return;
      windows[id] = { ...windows[id], ...stored, id };
    });
    return {
      windows,
      order: base.order,
      focused: persisted.focused ?? base.focused,
    };
  });

  const zCounter = useRef(ids.length + 1);

  // Persist geometry, but not on every drag frame — commits only.
  const persist = useCallback(
    (next) => {
      setPersisted({ windows: next.windows, focused: next.focused });
    },
    [setPersisted],
  );

  // Re-seed when the widget roster itself changes.
  useEffect(() => {
    setState((prev) => {
      const base = makeInitialState(ids);
      const windows = { ...base.windows };
      Object.entries(prev.windows).forEach(([id, stored]) => {
        if (windows[id]) windows[id] = { ...windows[id], ...stored, id };
      });
      return { windows, order: base.order, focused: prev.focused ?? base.focused };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Keep windows inside the viewport when the browser is resized.
  useEffect(() => {
    const handleResize = () => {
      setState((prev) => {
        const windows = {};
        let changed = false;
        Object.entries(prev.windows).forEach(([id, win]) => {
          const maxX = window.innerWidth - 140;
          const maxY = window.innerHeight - 60;
          const x = Math.min(win.rect.x, Math.max(MARGIN, maxX));
          const y = Math.min(win.rect.y, Math.max(HEADER_HEIGHT, maxY));
          const width = Math.min(win.rect.width, window.innerWidth - MARGIN * 2);
          if (x !== win.rect.x || y !== win.rect.y || width !== win.rect.width) changed = true;
          windows[id] = { ...win, rect: { ...win.rect, x, y, width } };
        });
        return changed ? { ...prev, windows } : prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const patch = useCallback((id, updater) => {
    setState((prev) => {
      const win = prev.windows[id];
      if (!win) return prev;
      const next = typeof updater === 'function' ? updater(win) : updater;
      return { ...prev, windows: { ...prev.windows, [id]: { ...win, ...next } } };
    });
  }, []);

  const focus = useCallback((id) => {
    setState((prev) => {
      const win = prev.windows[id];
      if (!win) return prev;
      if (prev.focused === id && win.z === zCounter.current) return prev;
      zCounter.current += 1;
      return {
        ...prev,
        focused: id,
        windows: { ...prev.windows, [id]: { ...win, z: zCounter.current } },
      };
    });
  }, []);

  const setRect = useCallback((id, rect) => patch(id, { rect }), [patch]);

  const commitRect = useCallback(
    (id, rect) => {
      setState((prev) => {
        const win = prev.windows[id];
        if (!win) return prev;
        const next = {
          ...prev,
          windows: { ...prev.windows, [id]: { ...win, rect } },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleMinimize = useCallback(
    (id) => patch(id, (win) => ({ minimized: !win.minimized, maximized: false })),
    [patch],
  );

  const toggleMaximize = useCallback(
    (id) => {
      focus(id);
      patch(id, (win) => ({ maximized: !win.maximized, minimized: false }));
    },
    [patch, focus],
  );

  const close = useCallback((id) => patch(id, { open: false }), [patch]);

  const open = useCallback(
    (id) => {
      patch(id, { open: true, minimized: false });
      focus(id);
    },
    [patch, focus],
  );

  const toggleOpen = useCallback(
    (id) => {
      setState((prev) => {
        const win = prev.windows[id];
        if (!win) return prev;
        const nextOpen = !win.open;
        zCounter.current += 1;
        return {
          ...prev,
          focused: nextOpen ? id : prev.focused,
          windows: {
            ...prev.windows,
            [id]: {
              ...win,
              open: nextOpen,
              minimized: false,
              z: nextOpen ? zCounter.current : win.z,
            },
          },
        };
      });
    },
    [],
  );

  const cycleOpacity = useCallback(
    (id) =>
      patch(id, (win) => {
        const index = OPACITY_STEPS.findIndex((step) => step.id === win.opacity);
        const next = OPACITY_STEPS[(index + 1) % OPACITY_STEPS.length];
        return { opacity: next.id };
      }),
    [patch],
  );

  const resetLayout = useCallback(() => {
    resetPersisted();
    zCounter.current = ids.length + 1;
    setState(makeInitialState(ids));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, resetPersisted]);

  const focusNext = useCallback(() => {
    setState((prev) => {
      const openIds = prev.order.filter((id) => prev.windows[id]?.open);
      if (openIds.length === 0) return prev;
      const current = openIds.indexOf(prev.focused);
      const nextId = openIds[(current + 1) % openIds.length];
      zCounter.current += 1;
      return {
        ...prev,
        focused: nextId,
        windows: {
          ...prev.windows,
          [nextId]: { ...prev.windows[nextId], z: zCounter.current, minimized: false },
        },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      windows: state.windows,
      order: state.order,
      focused: state.focused,
      focus,
      focusNext,
      setRect,
      commitRect,
      toggleMinimize,
      toggleMaximize,
      close,
      open,
      toggleOpen,
      cycleOpacity,
      resetLayout,
    }),
    [
      state,
      focus,
      focusNext,
      setRect,
      commitRect,
      toggleMinimize,
      toggleMaximize,
      close,
      open,
      toggleOpen,
      cycleOpacity,
      resetLayout,
    ],
  );

  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
}

export function useWindows() {
  const ctx = useContext(WindowContext);
  if (!ctx) throw new Error('useWindows must be used inside <WindowProvider>');
  return ctx;
}
