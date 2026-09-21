import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useSystem } from '../../context/SystemContext';

const TONE = {
  info: { icon: Info, className: 'border-cyan-500/40 text-cyan-200', glow: 'shadow-glow-cyan' },
  ok: { icon: CheckCircle2, className: 'border-lime-400/40 text-lime-200', glow: 'shadow-glow-lime' },
  warn: {
    icon: AlertTriangle,
    className: 'border-amber-400/40 text-amber-200',
    glow: 'shadow-glow-amber',
  },
  error: { icon: AlertTriangle, className: 'border-red-500/40 text-red-200', glow: 'shadow-glow-red' },
};

/** Stacked system notifications in the lower-right of the deck. */
export function Toasts() {
  const { toasts, dismissToast } = useSystem();

  return (
    <div className="pointer-events-none fixed bottom-14 right-4 z-[90] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE[toast.level] ?? TONE.info;
          const Icon = tone.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 60, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 60, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-md border bg-slate-950/85 px-3 py-2.5 backdrop-blur-xl',
                tone.className,
                tone.glow,
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
              <p className="flex-1 font-mono text-[11px] leading-relaxed tracking-wide">
                {toast.message}
              </p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-500 transition-colors hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
