import { motion } from 'framer-motion';
import { Command, Wifi } from 'lucide-react';
import { cn } from '../lib/cn';
import { useSystem } from '../context/SystemContext';
import { useWindows } from '../context/WindowContext';
import { useTelemetry } from '../context/TelemetryContext';
import { WIDGETS } from './widgetRegistry';

/**
 * Bottom dock: one pill per widget showing open / minimised / closed state,
 * doubling as the way to bring a closed panel back online.
 */
export function Dock({ onOpenPalette }) {
  const { sfx, pushLog, audioReady } = useSystem();
  const { windows, focused, toggleOpen, focus } = useWindows();
  const { latencyMs } = useTelemetry();

  const handleClick = (widget) => {
    const win = windows[widget.id];
    if (!win) return;

    if (!win.open) {
      toggleOpen(widget.id);
      sfx('open');
      pushLog(`PANEL RESTORED — ${widget.title.toUpperCase()}`, 'info');
      return;
    }
    if (focused === widget.id) {
      toggleOpen(widget.id);
      sfx('close');
      pushLog(`PANEL CLOSED — ${widget.title.toUpperCase()}`, 'warn');
      return;
    }
    focus(widget.id);
    sfx('click');
  };

  return (
    <motion.footer
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28, delay: 0.5 }}
      className="relative z-50 shrink-0 border-t border-cyan-500/25 bg-slate-950/75 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-lime-300/80 sm:flex">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-lime-400"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          DECK ONLINE
        </span>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto">
          {WIDGETS.map((widget) => {
            const win = windows[widget.id];
            const isOpen = Boolean(win?.open);
            const isFocused = focused === widget.id && isOpen;
            const Icon = widget.icon;

            return (
              <motion.button
                key={widget.id}
                type="button"
                onClick={() => handleClick(widget)}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                aria-pressed={isOpen}
                title={`${widget.title} — ${isOpen ? 'online' : 'offline'}`}
                className={cn(
                  'group relative flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors duration-200',
                  isFocused
                    ? 'border-cyan-400/80 bg-cyan-500/15 text-cyan-100 shadow-glow-cyan'
                    : isOpen
                      ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300/80 hover:border-cyan-400/60'
                      : 'border-slate-700/50 text-slate-600 hover:border-slate-500 hover:text-slate-400',
                )}
              >
                <Icon className="h-3 w-3" strokeWidth={2.2} />
                <span className="hidden md:inline">{widget.title}</span>
                <span
                  className={cn(
                    'h-1 w-1 rounded-full transition-colors duration-200',
                    isOpen ? 'bg-lime-400 shadow-glow-lime' : 'bg-slate-700',
                  )}
                />
              </motion.button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-cyan-300 sm:flex"
        >
          <Command className="h-3 w-3" />
          ⌘K
        </button>

        <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 lg:flex">
          <Wifi className="h-3 w-3 text-cyan-400" />
          {latencyMs}ms
          <span className={cn('ml-1', audioReady ? 'text-lime-400/80' : 'text-slate-600')}>
            {audioReady ? 'AUDIO RDY' : 'AUDIO IDLE'}
          </span>
        </span>
      </div>
    </motion.footer>
  );
}
