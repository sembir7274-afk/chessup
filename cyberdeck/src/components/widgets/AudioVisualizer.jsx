import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AudioWaveform, Radio } from 'lucide-react';
import { cn } from '../../lib/cn';
import { audioEngine } from '../../lib/audioEngine';
import { useAnimationFrame } from '../../hooks/useAnimationFrame';
import { useSystem } from '../../context/SystemContext';

const BARS = 36;
const VIEW_W = 360;
const VIEW_H = 120;
const GAP = 2;
const BAR_W = (VIEW_W - GAP * (BARS - 1)) / BARS;

/** Cyan -> violet -> pink across the spectrum. */
function barColor(index) {
  const t = index / (BARS - 1);
  if (t < 0.5) {
    const k = t / 0.5;
    return `rgb(${Math.round(34 + k * 134)}, ${Math.round(228 - k * 143)}, ${Math.round(255 - k * 8)})`;
  }
  const k = (t - 0.5) / 0.5;
  return `rgb(${Math.round(168 + k * 87)}, ${Math.round(85 - k * 40)}, ${Math.round(247 - k * 92)})`;
}

/**
 * Spectrum display.
 *
 * Reads the engine's analyser when audio is actually playing; otherwise it
 * synthesises a plausible idle waveform so the panel is never a dead rectangle.
 * Bar geometry is mutated directly on the SVG nodes — re-rendering 36 rects at
 * 45fps through React would be pure overhead.
 */
export function AudioVisualizer() {
  const { settings } = useSystem();
  const barRefs = useRef([]);
  const peakRefs = useRef([]);
  const values = useRef(new Float32Array(BARS));
  const peaks = useRef(new Float32Array(BARS));
  const phase = useRef(0);
  const [live, setLive] = useState(false);

  // Poll the engine so the badge reflects real playback, not just settings.
  useEffect(() => {
    const id = window.setInterval(() => {
      setLive(audioEngine.isRunning && audioEngine.activeAmbients().length > 0);
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  useAnimationFrame(
    (delta) => {
      phase.current += delta;
      const spectrum = live ? audioEngine.getSpectrum() : null;
      const binCount = spectrum ? spectrum.length : 0;

      for (let i = 0; i < BARS; i += 1) {
        let target;

        if (spectrum && binCount > 0) {
          // Logarithmic bucketing keeps the low end from hogging the display.
          const from = Math.floor((i / BARS) ** 1.6 * binCount);
          const to = Math.max(from + 1, Math.floor(((i + 1) / BARS) ** 1.6 * binCount));
          let sum = 0;
          for (let b = from; b < to && b < binCount; b += 1) sum += spectrum[b];
          target = sum / (to - from) / 255;
          // Tilt up the quiet highs so the shape stays readable.
          target = Math.min(1, target * (1 + i / BARS));
        } else {
          // Idle simulation: two drifting sine lobes plus a little sparkle.
          const t = phase.current;
          const lobeA = Math.sin(i * 0.32 + t * 1.7) * 0.5 + 0.5;
          const lobeB = Math.sin(i * 0.11 - t * 0.9) * 0.5 + 0.5;
          const envelope = Math.sin((i / BARS) * Math.PI) ** 0.7;
          target = (lobeA * 0.55 + lobeB * 0.35 + Math.random() * 0.1) * envelope * 0.55;
        }

        // Fast attack, slow release — classic VU ballistics.
        const current = values.current[i];
        const smoothing = target > current ? 0.45 : 0.12;
        const next = current + (target - current) * smoothing;
        values.current[i] = next;

        peaks.current[i] = Math.max(next, peaks.current[i] - delta * 0.35);

        const bar = barRefs.current[i];
        if (bar) {
          const height = Math.max(2, next * VIEW_H);
          bar.setAttribute('height', height.toFixed(2));
          bar.setAttribute('y', (VIEW_H - height).toFixed(2));
          bar.setAttribute('opacity', (0.42 + next * 0.58).toFixed(3));
        }

        const peak = peakRefs.current[i];
        if (peak) {
          const y = VIEW_H - Math.max(3, peaks.current[i] * VIEW_H);
          peak.setAttribute('y', y.toFixed(2));
        }
      }
    },
    { fps: 45 },
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <span className="label-hud flex items-center gap-1.5">
          <AudioWaveform className="h-3 w-3" />
          SPECTRUM ANALYSER
        </span>
        <span
          className={cn(
            'chip',
            live
              ? 'border-lime-400/60 bg-lime-400/10 text-lime-300'
              : 'border-slate-700/50 text-slate-500',
          )}
        >
          <motion.span
            animate={{ opacity: live ? [1, 0.25, 1] : 0.4 }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-lime-400' : 'bg-slate-600')}
          />
          {live ? 'LIVE INPUT' : 'SIMULATED'}
        </span>
      </div>

      <div className="glass-inset relative min-h-0 flex-1 overflow-hidden p-2">
        {/* Reference grid behind the bars. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 opacity-25">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="h-px w-full bg-cyan-400/25" />
          ))}
        </div>

        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={live ? 'Live audio spectrum' : 'Simulated audio spectrum'}
        >
          <defs>
            <linearGradient id="bar-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {Array.from({ length: BARS }, (_, index) => {
            const x = index * (BAR_W + GAP);
            const color = barColor(index);
            return (
              <g key={index}>
                <rect
                  ref={(node) => {
                    barRefs.current[index] = node;
                  }}
                  x={x}
                  y={VIEW_H - 2}
                  width={BAR_W}
                  height={2}
                  rx={BAR_W / 3}
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
                <rect
                  ref={(node) => {
                    peakRefs.current[index] = node;
                  }}
                  x={x}
                  y={VIEW_H - 3}
                  width={BAR_W}
                  height={1.6}
                  rx={0.8}
                  fill={color}
                  opacity="0.85"
                />
              </g>
            );
          })}

          {/* Mirrored reflection strip. */}
          <rect x="0" y={VIEW_H - 1} width={VIEW_W} height="1" fill="url(#bar-fade)" />
        </svg>
      </div>

      <div className="flex shrink-0 items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
        <span className="flex items-center gap-1">
          <Radio className="h-2.5 w-2.5" />
          {audioEngine.binCount} BINS
        </span>
        <span className="flex items-center gap-1">
          <Activity className="h-2.5 w-2.5" />
          BUS {settings.soundEnabled ? 'OPEN' : 'MUTED'}
        </span>
        <span>45 FPS</span>
      </div>
    </div>
  );
}
