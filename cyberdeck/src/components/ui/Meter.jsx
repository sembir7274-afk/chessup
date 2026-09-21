import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/** Segmented horizontal load bar. */
export function Meter({ value, max = 100, color = '#22e4ff', label, className, segments = 24 }) {
  const ratio = Math.min(1, Math.max(0, value / max));
  const litCount = Math.round(ratio * segments);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? (
        <div className="flex items-baseline justify-between">
          <span className="label-hud">{label}</span>
          <span className="font-mono text-[10px] tabular-nums text-slate-400">
            {Math.round(ratio * 100)}%
          </span>
        </div>
      ) : null}
      <div className="flex h-2 gap-[2px]" role="meter" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        {Array.from({ length: segments }, (_, index) => {
          const lit = index < litCount;
          return (
            <motion.span
              key={index}
              className="flex-1 rounded-[1px]"
              animate={{
                backgroundColor: lit ? color : 'rgba(30,44,71,0.7)',
                boxShadow: lit ? `0 0 6px ${color}aa` : '0 0 0 rgba(0,0,0,0)',
              }}
              transition={{ duration: 0.25, delay: lit ? index * 0.006 : 0 }}
            />
          );
        })}
      </div>
    </div>
  );
}
