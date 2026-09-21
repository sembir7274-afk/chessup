import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, Gauge, HardDrive, Network, Terminal } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/format';
import { useSystem } from '../../context/SystemContext';
import { useTelemetry } from '../../context/TelemetryContext';
import { StatGraph } from '../ui/StatGraph';
import { Meter } from '../ui/Meter';

const LOG_TONE = {
  info: 'text-cyan-300/80',
  ok: 'text-lime-300/90',
  warn: 'text-amber-300/90',
  error: 'text-red-300/90',
};

const STATUS_TONE = {
  nominal: { label: 'NOMINAL', className: 'border-lime-400/50 bg-lime-400/10 text-lime-300' },
  degraded: { label: 'DEGRADED', className: 'border-amber-400/50 bg-amber-400/10 text-amber-300' },
  critical: { label: 'CRITICAL', className: 'border-red-500/50 bg-red-500/10 text-red-300' },
};

/** Diagnostics panel: telemetry traces plus the rolling deck event log. */
export function SystemMonitor() {
  const { log } = useSystem();
  const { series, current, latencyMs, status } = useTelemetry();
  const [, forceTick] = useState(0);

  // Relative timestamps in the log need a heartbeat to stay honest.
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const tone = STATUS_TONE[status];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      <div className="flex shrink-0 items-center justify-between">
        <span className="label-hud flex items-center gap-1.5">
          <Gauge className="h-3 w-3" />
          CORE DIAGNOSTICS
        </span>
        <span className={cn('chip', tone.className)}>{tone.label}</span>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2.5">
        <StatGraph
          label="CPU LOAD"
          series={series.cpu}
          value={current.cpu}
          color="#22e4ff"
          warnAbove={85}
        />
        <StatGraph
          label="MEMORY"
          series={series.memory}
          value={current.memory}
          color="#a855f7"
          warnAbove={90}
        />
        <StatGraph
          label="LATENCY"
          series={series.latency}
          value={latencyMs}
          unit="ms"
          color="#ff2d9b"
          warnAbove={150}
        />
        <StatGraph
          label="THROUGHPUT"
          series={series.throughput}
          value={current.throughput}
          unit="mb/s"
          color="#9dff3d"
        />
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 border-y border-cyan-500/15 py-2">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3 w-3 shrink-0 text-cyan-400" />
          <Meter value={current.cpu} color="#22e4ff" segments={10} className="flex-1" />
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3 w-3 shrink-0 text-violet-400" />
          <Meter value={current.memory} color="#a855f7" segments={10} className="flex-1" />
        </div>
        <div className="flex items-center gap-1.5">
          <Network className="h-3 w-3 shrink-0 text-pink-400" />
          <Meter value={Math.min(100, latencyMs / 2)} color="#ff2d9b" segments={10} className="flex-1" />
        </div>
      </div>

      {/* ---- Event log --------------------------------------------------- */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <span className="label-hud flex shrink-0 items-center gap-1.5">
          <Terminal className="h-3 w-3" />
          EVENT STREAM
        </span>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-cyan-500/15 bg-black/40 p-2 font-mono text-[10px] leading-relaxed">
          <AnimatePresence initial={false}>
            {log.map((entry) => (
              <motion.p
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-2"
              >
                <span className="shrink-0 text-slate-600">{formatRelative(entry.at)}</span>
                <span className={cn('min-w-0 break-words', LOG_TONE[entry.level] ?? LOG_TONE.info)}>
                  {entry.message}
                </span>
              </motion.p>
            ))}
          </AnimatePresence>

          {log.length === 0 ? (
            <p className="text-slate-600">
              <span className="text-cyan-400">$</span> awaiting deck activity
              <span className="ml-0.5 animate-blink text-cyan-400">_</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
