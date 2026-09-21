import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, RotateCcw, SkipForward, Repeat } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatDuration } from '../../lib/format';
import { MODE_LIST, usePomodoro } from '../../context/PomodoroContext';
import { useSystem } from '../../context/SystemContext';
import { NeonButton } from '../ui/NeonButton';

const SIZE = 220;
const STROKE = 7;
const RADIUS = (SIZE - STROKE * 2) / 2 - 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TICKS = 60;

/**
 * Pomodoro Neural Sync.
 *
 * The ring is a single stroked circle whose dash offset tracks progress, with
 * a tick bezel and a counter-rotating reticle layered behind it for depth.
 */
export function PomodoroTimer() {
  const { sfx } = useSystem();
  const {
    mode,
    modeConfig,
    running,
    remaining,
    total,
    progress,
    completedFocus,
    cyclesBeforeLong,
    autoAdvance,
    setAutoAdvance,
    toggle,
    reset,
    skip,
    selectMode,
  } = usePomodoro();

  const ringColor = modeConfig.ring;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  // Where the progress arc currently terminates, in SVG user units.
  const headPoint = useMemo(() => {
    const angle = progress * 2 * Math.PI;
    return {
      x: SIZE / 2 + Math.cos(angle) * RADIUS,
      y: SIZE / 2 + Math.sin(angle) * RADIUS,
    };
  }, [progress]);

  const ticks = useMemo(
    () =>
      Array.from({ length: TICKS }, (_, index) => {
        const angle = (index / TICKS) * 360;
        const isMajor = index % 5 === 0;
        return { angle, isMajor, lit: index / TICKS <= progress };
      }),
    [progress],
  );

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-3">
      {/* ---- Mode selector -------------------------------------------- */}
      <div className="flex w-full shrink-0 gap-1">
        {MODE_LIST.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectMode(item.id)}
            className={cn(
              'flex-1 rounded-md border px-1 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-all duration-200',
              mode === item.id
                ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-100 shadow-glow-cyan'
                : 'border-slate-700/50 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-300',
            )}
            style={
              mode === item.id
                ? { borderColor: `${item.ring}b3`, boxShadow: `0 0 10px ${item.ring}55` }
                : undefined
            }
          >
            {item.short}
            <span className="ml-1 opacity-60">{item.minutes}m</span>
          </button>
        ))}
      </div>

      {/* ---- Countdown ring -------------------------------------------- */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div className="relative aspect-square w-full max-w-[min(100%,240px)]">
          {/* Slowly counter-rotating outer reticle. */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: running ? 360 : 0 }}
            transition={{ duration: 48, repeat: running ? Infinity : 0, ease: 'linear' }}
          >
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
              {[0, 90, 180, 270].map((angle) => (
                <path
                  key={angle}
                  d={`M ${SIZE / 2} 4 A ${SIZE / 2 - 4} ${SIZE / 2 - 4} 0 0 1 ${
                    SIZE / 2 + (SIZE / 2 - 4) * Math.sin(0.42)
                  } ${SIZE / 2 - (SIZE / 2 - 4) * Math.cos(0.42)}`}
                  fill="none"
                  stroke={ringColor}
                  strokeOpacity="0.32"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  transform={`rotate(${angle} ${SIZE / 2} ${SIZE / 2})`}
                />
              ))}
            </svg>
          </motion.div>

          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
            {/* Tick bezel. */}
            <g>
              {ticks.map(({ angle, isMajor, lit }) => {
                const rad = (angle * Math.PI) / 180;
                const outer = RADIUS + 15;
                const inner = outer - (isMajor ? 7 : 4);
                const cx = SIZE / 2;
                return (
                  <line
                    key={angle}
                    x1={cx + Math.cos(rad) * inner}
                    y1={cx + Math.sin(rad) * inner}
                    x2={cx + Math.cos(rad) * outer}
                    y2={cx + Math.sin(rad) * outer}
                    stroke={lit ? ringColor : '#1e2c47'}
                    strokeWidth={isMajor ? 1.6 : 0.9}
                    strokeLinecap="round"
                    opacity={lit ? 0.95 : 0.55}
                  />
                );
              })}
            </g>

            {/* Track. */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#16233c"
              strokeWidth={STROKE}
            />

            {/* Progress arc. */}
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.4, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 7px ${ringColor})` }}
            />

            {/* Leading pip riding the arc head. cx/cy are also passed as
                attributes so the very first paint has real coordinates —
                animating them alone would emit `undefined` before mount. */}
            <motion.circle
              r="4"
              fill={ringColor}
              cx={headPoint.x}
              cy={headPoint.y}
              initial={false}
              animate={{ cx: headPoint.x, cy: headPoint.y }}
              transition={{ duration: 0.4, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }}
            />
          </svg>

          {/* Read-out. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="label-hud" style={{ color: `${ringColor}aa` }}>
              {modeConfig.label}
            </span>
            <motion.span
              key={mode}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="font-display text-[clamp(1.9rem,5.5vw,2.6rem)] font-bold tabular-nums leading-none"
              style={{ color: ringColor, textShadow: `0 0 16px ${ringColor}88` }}
            >
              {formatDuration(remaining)}
            </motion.span>
            <span
              className={cn(
                'font-mono text-[9px] uppercase tracking-[0.25em]',
                running ? 'text-lime-300' : 'text-slate-500',
              )}
            >
              {running ? '● SYNCING' : '○ STANDBY'}
            </span>
            <span className="mt-0.5 font-mono text-[9px] tabular-nums text-slate-600">
              {Math.round(progress * 100)}% / {Math.round(total / 60)}M
            </span>
          </div>
        </div>
      </div>

      {/* ---- Controls --------------------------------------------------- */}
      <div className="flex w-full shrink-0 items-center gap-1.5">
        <NeonButton
          onClick={toggle}
          sound={null}
          icon={running ? Pause : Play}
          variant={running ? 'pink' : 'cyan'}
          className="flex-1"
        >
          {running ? 'HOLD' : 'ENGAGE'}
        </NeonButton>
        <NeonButton onClick={skip} sound={null} icon={SkipForward} size="sm" aria-label="Skip phase">
          SKIP
        </NeonButton>
        <NeonButton onClick={reset} sound={null} icon={RotateCcw} size="sm" aria-label="Reset timer">
          RST
        </NeonButton>
      </div>

      {/* ---- Cycle tracker ---------------------------------------------- */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2 border-t border-cyan-500/15 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="label-hud">CYCLE</span>
          <div className="flex gap-1">
            {Array.from({ length: cyclesBeforeLong }, (_, index) => {
              const lit = completedFocus % cyclesBeforeLong > index || (completedFocus > 0 && completedFocus % cyclesBeforeLong === 0);
              return (
                <motion.span
                  key={index}
                  className="h-1.5 w-4 rounded-full"
                  animate={{
                    backgroundColor: lit ? ringColor : 'rgba(30,44,71,0.9)',
                    boxShadow: lit ? `0 0 8px ${ringColor}` : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
          </div>
          <span className="font-mono text-[10px] tabular-nums text-slate-500">
            {completedFocus} DONE
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setAutoAdvance((prev) => !prev);
            sfx(autoAdvance ? 'toggleOff' : 'toggleOn');
          }}
          className={cn(
            'chip transition-all duration-200',
            autoAdvance
              ? 'border-lime-400/60 bg-lime-400/10 text-lime-300 shadow-glow-lime'
              : 'border-slate-700/50 text-slate-500 hover:border-slate-500',
          )}
          title="Automatically start the next phase"
        >
          <Repeat className="h-2.5 w-2.5" />
          AUTO
        </button>
      </div>

      <p className="w-full shrink-0 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
        {modeConfig.description}
      </p>
    </div>
  );
}
