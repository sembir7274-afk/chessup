import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Blend, ChevronDown, Maximize2, Minus, Minimize2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { useSystem } from '../context/SystemContext';
import {
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  OPACITY_STEPS,
  useWindows,
} from '../context/WindowContext';
import { useDragResize } from '../hooks/useDragResize';
import { useViewport } from '../hooks/useViewport';
import { IconButton } from './ui/NeonButton';

const ACCENTS = {
  cyan: {
    border: 'border-cyan-500/30',
    borderFocus: 'border-cyan-400/70',
    glow: 'shadow-glow-cyan-lg',
    title: 'text-cyan-200',
    rail: 'from-cyan-400/80 via-cyan-400/10 to-transparent',
  },
  pink: {
    border: 'border-pink-500/30',
    borderFocus: 'border-pink-400/70',
    glow: 'shadow-glow-pink-lg',
    title: 'text-pink-200',
    rail: 'from-pink-400/80 via-pink-400/10 to-transparent',
  },
  violet: {
    border: 'border-violet-500/30',
    borderFocus: 'border-violet-400/70',
    glow: 'shadow-glow-violet',
    title: 'text-violet-200',
    rail: 'from-violet-400/80 via-violet-400/10 to-transparent',
  },
  amber: {
    border: 'border-amber-500/30',
    borderFocus: 'border-amber-400/70',
    glow: 'shadow-glow-amber',
    title: 'text-amber-200',
    rail: 'from-amber-400/80 via-amber-400/10 to-transparent',
  },
};

const RESIZE_HANDLES = [
  { dir: 'n', className: 'left-3 right-3 top-0 h-1.5 cursor-ns-resize' },
  { dir: 's', className: 'left-3 right-3 bottom-0 h-1.5 cursor-ns-resize' },
  { dir: 'w', className: 'top-3 bottom-3 left-0 w-1.5 cursor-ew-resize' },
  { dir: 'e', className: 'top-3 bottom-3 right-0 w-1.5 cursor-ew-resize' },
  { dir: 'nw', className: 'left-0 top-0 h-3 w-3 cursor-nwse-resize' },
  { dir: 'ne', className: 'right-0 top-0 h-3 w-3 cursor-nesw-resize' },
  { dir: 'sw', className: 'left-0 bottom-0 h-3 w-3 cursor-nesw-resize' },
  { dir: 'se', className: 'right-0 bottom-0 h-4 w-4 cursor-nwse-resize' },
];

/**
 * A floating, draggable, resizable widget frame.
 *
 * Geometry lives in the window manager; this component owns only the chrome,
 * the gesture surfaces and the entrance choreography.
 */
function WindowFrame({ id, title, subtitle, icon: Icon, accent = 'cyan', index = 0, compact, children }) {
  const { sfx } = useSystem();
  const viewport = useViewport();
  const {
    windows,
    focused,
    focus,
    setRect,
    commitRect,
    toggleMinimize,
    toggleMaximize,
    close,
    cycleOpacity,
  } = useWindows();

  const win = windows[id];
  const isFocused = focused === id;
  const tone = ACCENTS[accent] ?? ACCENTS.cyan;

  const handleChange = useCallback((rect) => setRect(id, rect), [id, setRect]);
  const handleCommit = useCallback((rect) => commitRect(id, rect), [id, commitRect]);

  const { beginDrag, beginResize, isDragging, isResizing } = useDragResize({
    rect: win?.rect ?? { x: 0, y: 0, width: 360, height: 300 },
    onChange: handleChange,
    onCommit: handleCommit,
    headerOffset: HEADER_HEIGHT,
    disabled: compact || win?.maximized,
  });

  if (!win || !win.open) return null;

  const opacityStep = OPACITY_STEPS.find((step) => step.id === win.opacity) ?? OPACITY_STEPS[1];

  const maximizedRect = {
    x: 14,
    y: HEADER_HEIGHT,
    width: viewport.width - 28,
    height: viewport.height - HEADER_HEIGHT - FOOTER_HEIGHT - 14,
  };
  const rect = win.maximized ? maximizedRect : win.rect;

  const positioning = compact
    ? { position: 'relative', width: '100%', height: win.minimized ? 'auto' : 'clamp(320px, 62vh, 560px)' }
    : {
        position: 'absolute',
        left: 0,
        top: 0,
        width: rect.width,
        height: win.minimized ? 'auto' : rect.height,
        zIndex: win.z,
      };

  const motionProps = compact
    ? { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 34, scale: 0.94, filter: 'blur(10px)' },
        animate: {
          opacity: 1,
          x: rect.x,
          y: rect.y,
          scale: 1,
          filter: 'blur(0px)',
        },
        exit: { opacity: 0, scale: 0.93, filter: 'blur(8px)' },
      };

  return (
    <motion.section
      {...motionProps}
      transition={
        isDragging || isResizing
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: 260,
              damping: 30,
              delay: compact ? index * 0.06 : 0.16 + index * 0.09,
              filter: { duration: 0.5 },
            }
      }
      style={positioning}
      onPointerDown={() => !compact && focus(id)}
      aria-label={title}
      className={cn(
        'glass-panel scanlines flex flex-col',
        'border transition-colors duration-300',
        !compact && 'pointer-events-auto',
        isFocused ? tone.borderFocus : tone.border,
        isFocused && !compact ? tone.glow : 'shadow-panel',
        isDragging && 'cursor-grabbing select-none',
      )}
    >
      {/* Panel body tint follows the transparency toggle. */}
      <div
        className="pointer-events-none absolute inset-0 bg-slate-950 transition-opacity duration-300"
        style={{ opacity: opacityStep.value }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.035] to-transparent" />
      <div
        className={cn(
          'pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b',
          tone.rail,
        )}
      />

      {/* ---- Title bar ---------------------------------------------- */}
      <header
        onPointerDown={compact ? undefined : beginDrag}
        onDoubleClick={() => {
          sfx('open');
          toggleMaximize(id);
        }}
        className={cn(
          'relative z-20 flex shrink-0 items-center gap-2 border-b border-cyan-500/15 px-3 py-2',
          !compact && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <span className={cn('flex h-5 w-5 items-center justify-center', tone.title)}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              'truncate font-display text-[11px] font-bold uppercase tracking-[0.2em]',
              tone.title,
              isFocused && 'text-neon',
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            icon={Blend}
            label={`Transparency: ${opacityStep.label}`}
            onClick={() => cycleOpacity(id)}
            tone="pink"
          />
          <IconButton
            icon={win.minimized ? ChevronDown : Minus}
            label={win.minimized ? 'Expand panel' : 'Minimise panel'}
            onClick={() => toggleMinimize(id)}
          />
          {!compact ? (
            <IconButton
              icon={win.maximized ? Minimize2 : Maximize2}
              label={win.maximized ? 'Restore panel' : 'Maximise panel'}
              onClick={() => toggleMaximize(id)}
            />
          ) : null}
          <IconButton
            icon={X}
            label="Close panel"
            tone="danger"
            sound="close"
            onClick={() => close(id)}
          />
        </div>
      </header>

      {/* ---- Body ---------------------------------------------------- */}
      <motion.div
        initial={false}
        animate={{
          height: win.minimized ? 0 : 'auto',
          opacity: win.minimized ? 0 : 1,
        }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        // `flex-1` must come off while collapsing: a flex item with
        // `flex: 1 1 0%` grows past the animated inline height, so the panel
        // would keep its full size with an empty body.
        className={cn(
          'relative z-10 min-h-0',
          win.minimized ? 'overflow-hidden' : 'flex-1',
        )}
      >
        <div className="h-full min-h-0 overflow-auto p-3">{children}</div>
      </motion.div>

      {/* Focus indicator strip. */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-300',
          'bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent',
          isFocused ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* ---- Resize surfaces ------------------------------------------ */}
      {!compact && !win.maximized && !win.minimized
        ? RESIZE_HANDLES.map((handle) => (
            <div
              key={handle.dir}
              role="presentation"
              onPointerDown={(event) => beginResize(event, handle.dir)}
              className={cn('absolute z-30', handle.className)}
            >
              {handle.dir === 'se' ? (
                <svg viewBox="0 0 16 16" className="h-full w-full text-cyan-400/50">
                  <path d="M15 5 L15 15 L5 15" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M15 10 L10 15" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              ) : null}
            </div>
          ))
        : null}
    </motion.section>
  );
}

export const Window = memo(WindowFrame);
