import { useEffect, useRef, useState } from 'react';

const HISTORY = 40;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const seedSeries = (base, spread) =>
  Array.from({ length: HISTORY }, () => clamp(base + (Math.random() - 0.5) * spread, 2, 98));

/**
 * Simulated machine telemetry.
 *
 * Nothing here reads the real host — browsers do not expose CPU or network
 * counters — so each metric is a bounded random walk with occasional spikes,
 * which reads as plausible live load on the HUD graphs.
 */
export function useSystemStats({ intervalMs = 900 } = {}) {
  const [stats, setStats] = useState(() => ({
    cpu: seedSeries(38, 18),
    memory: seedSeries(56, 10),
    latency: seedSeries(28, 16),
    throughput: seedSeries(64, 22),
  }));

  const targets = useRef({ cpu: 38, memory: 56, latency: 28, throughput: 64 });

  useEffect(() => {
    const id = window.setInterval(() => {
      setStats((prev) => {
        const next = {};
        Object.entries(prev).forEach(([key, series]) => {
          const last = series[series.length - 1];
          const target = targets.current[key];

          // Occasionally re-target, which produces sustained load plateaus.
          if (Math.random() < 0.12) {
            targets.current[key] = clamp(target + (Math.random() - 0.5) * 42, 12, 88);
          }
          // Rare spike: a burst of activity that decays on its own.
          const spike = Math.random() < 0.05 ? (Math.random() - 0.3) * 34 : 0;

          const drift = (targets.current[key] - last) * 0.22;
          const jitter = (Math.random() - 0.5) * 7;
          const value = clamp(last + drift + jitter + spike, 3, 99);

          next[key] = [...series.slice(1), value];
        });
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  const current = {
    cpu: stats.cpu[stats.cpu.length - 1],
    memory: stats.memory[stats.memory.length - 1],
    latency: stats.latency[stats.latency.length - 1],
    throughput: stats.throughput[stats.throughput.length - 1],
  };

  return { series: stats, current };
}
