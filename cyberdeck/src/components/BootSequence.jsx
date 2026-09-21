import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const LINES = [
  'INITIALISING CYBERDECK KERNEL v1.0.0',
  'MOUNTING /dev/neural0 ............ OK',
  'CALIBRATING BACKDROP ENGINE ...... OK',
  'SPINNING UP AUDIO SYNTHESIS BUS .. OK',
  'RESTORING OPERATOR WORKSPACE ..... OK',
  'DECK ONLINE. WELCOME BACK, OPERATOR.',
];

const LINE_DELAY = 170;

/**
 * Cold-boot overlay. Purely theatrical, and deliberately short — it runs once
 * per page load and gets out of the way before the operator can be annoyed.
 */
export function BootSequence({ onComplete }) {
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = LINES.map((_, index) =>
      window.setTimeout(() => setShown(index + 1), index * LINE_DELAY),
    );
    const exit = window.setTimeout(
      () => {
        setVisible(false);
        onComplete?.();
      },
      LINES.length * LINE_DELAY + 520,
    );

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(exit);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-deck-void"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(12px)', scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.7) 3px, rgba(0,0,0,0.7) 4px)',
            }}
          />

          <div className="relative w-full max-w-md px-6">
            <motion.div
              className="mb-5 flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.span
                className="flex h-9 w-9 items-center justify-center rounded border border-cyan-400/50 bg-cyan-500/10"
                animate={{ boxShadow: ['0 0 0 rgba(34,228,255,0)', '0 0 24px rgba(34,228,255,0.6)', '0 0 0 rgba(34,228,255,0)'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
              </motion.span>
              <h1 className="font-display text-base font-black uppercase tracking-[0.3em] text-cyan-200 text-neon">
                CYBER<span className="text-pink-400 text-neon-pink">DECK</span>
              </h1>
            </motion.div>

            <div className="space-y-1 font-mono text-[11px] leading-relaxed">
              {LINES.slice(0, shown).map((line, index) => (
                <motion.p
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={
                    index === LINES.length - 1 ? 'text-lime-300 text-neon-lime' : 'text-cyan-300/70'
                  }
                >
                  <span className="mr-1.5 text-slate-600">&gt;</span>
                  {line}
                </motion.p>
              ))}
              <span className="inline-block h-3 w-2 animate-blink bg-cyan-400 align-middle" />
            </div>

            <div className="mt-5 h-0.5 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-pink-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: (LINES.length * LINE_DELAY) / 1000, ease: 'easeInOut' }}
                style={{ boxShadow: '0 0 12px rgba(34,228,255,0.8)' }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
