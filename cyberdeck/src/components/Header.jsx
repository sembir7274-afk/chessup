import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Command,
  Cpu,
  Globe,
  HardDrive,
  LayoutGrid,
  Radio,
  Settings2,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { formatStardate, pad2 } from '../lib/format';
import { useClock } from '../hooks/useClock';
import { useSystem } from '../context/SystemContext';
import { useTelemetry } from '../context/TelemetryContext';
import { useWindows } from '../context/WindowContext';
import { useTasks } from '../context/TaskContext';
import { StatGraph } from './ui/StatGraph';
import { IconButton, NeonButton } from './ui/NeonButton';

const STATUS_TONE = {
  nominal: 'text-lime-300 border-lime-400/50 bg-lime-400/10',
  degraded: 'text-amber-300 border-amber-400/50 bg-amber-400/10',
  critical: 'text-red-300 border-red-500/50 bg-red-500/10',
};

/** Toggle row used inside the settings drawer. */
function SettingRow({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/5"
    >
      <span className="min-w-0">
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300">
          {label}
        </span>
        <span className="block truncate font-mono text-[9px] text-slate-600">{description}</span>
      </span>
      <span
        className={cn(
          'relative h-4 w-8 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-cyan-400/70 bg-cyan-500/25' : 'border-slate-600/60 bg-slate-800/60',
        )}
      >
        <motion.span
          className={cn(
            'absolute top-[1px] h-3 w-3 rounded-full',
            checked ? 'bg-cyan-300 shadow-glow-cyan' : 'bg-slate-500',
          )}
          animate={{ left: checked ? 17 : 2 }}
          transition={{ type: 'spring', stiffness: 520, damping: 30 }}
        />
      </span>
    </button>
  );
}

function SettingsDrawer({ onClose }) {
  const { settings, update, sfx } = useSystem();
  const { resetLayout } = useWindows();

  const toggle = (key) => () => {
    update({ [key]: !settings[key] });
    sfx(settings[key] ? 'toggleOff' : 'toggleOn');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="glass-panel absolute right-0 top-full z-[70] mt-2 w-[290px] p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="label-hud">DECK CONFIGURATION</span>
        <IconButton icon={X} label="Close settings" sound="close" onClick={onClose} />
      </div>

      <div className="space-y-1">
        <SettingRow
          label="Grid Overlay"
          description="Perspective grid over the backdrop"
          checked={settings.gridVisible}
          onChange={toggle('gridVisible')}
        />
        <SettingRow
          label="Scanlines"
          description="CRT raster + sweeping beam"
          checked={settings.scanlines}
          onChange={toggle('scanlines')}
        />
        <SettingRow
          label="Parallax Tracking"
          description="Backdrop follows the pointer"
          checked={settings.parallax}
          onChange={toggle('parallax')}
        />
        <SettingRow
          label="Vignette"
          description="Radial edge darkening"
          checked={settings.vignette}
          onChange={toggle('vignette')}
        />
      </div>

      <div className="mt-3 space-y-1.5 border-t border-cyan-500/15 pt-3">
        <div className="flex items-center justify-between">
          <span className="label-hud">BACKDROP MASK</span>
          <span className="font-mono text-[10px] tabular-nums text-cyan-300">
            {Math.round(settings.overlayOpacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="0.95"
          step="0.01"
          value={settings.overlayOpacity}
          aria-label="Backdrop mask opacity"
          onChange={(event) => update({ overlayOpacity: Number(event.target.value) })}
        />
        <p className="font-mono text-[9px] leading-relaxed text-slate-600">
          Raise the mask when your Higgsfield media is bright — UI text readability wins over the
          backdrop every time.
        </p>
      </div>

      <div className="mt-3 border-t border-cyan-500/15 pt-3">
        <NeonButton
          size="sm"
          icon={LayoutGrid}
          variant="pink"
          onClick={() => {
            resetLayout();
            onClose();
          }}
          className="w-full"
        >
          RESET WINDOW LAYOUT
        </NeonButton>
      </div>
    </motion.div>
  );
}

/**
 * Sci-Fi header and status bar: identity, live clock, telemetry read-outs and
 * the global audio / configuration controls.
 */
export function Header({ onOpenPalette, compact }) {
  const clock = useClock(1000);
  const { settings, update, toggleSound } = useSystem();
  const { series, current, latencyMs, status } = useTelemetry();
  const { stats } = useTasks();
  const [showSettings, setShowSettings] = useState(false);

  const utc = settings.utcMode;
  const hours = pad2(utc ? clock.getUTCHours() : clock.getHours());
  const minutes = pad2(utc ? clock.getUTCMinutes() : clock.getMinutes());
  const seconds = pad2(utc ? clock.getUTCSeconds() : clock.getSeconds());
  const secondPulse = clock.getSeconds() % 2 === 0;

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="relative z-50 shrink-0 border-b border-cyan-500/25 bg-slate-950/70 backdrop-blur-xl"
    >
      <div className="scan-beam pointer-events-none absolute inset-0 overflow-hidden" />

      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4">
        {/* ---- Identity ------------------------------------------------- */}
        <div className="flex shrink-0 items-center gap-2.5">
          <motion.div
            className="relative flex h-8 w-8 items-center justify-center rounded border border-cyan-400/50 bg-cyan-500/10 shadow-glow-cyan"
            animate={{ rotate: [0, 0, 0] }}
          >
            <ShieldCheck className="h-4 w-4 text-cyan-300" strokeWidth={2.2} />
            <motion.span
              className="absolute inset-0 rounded border border-cyan-400/40"
              animate={{ scale: [1, 1.28, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
            />
          </motion.div>

          <div className="leading-none">
            <h1 className="animate-flicker font-display text-sm font-black uppercase tracking-[0.22em] text-cyan-200 text-neon">
              CYBER<span className="text-pink-400 text-neon-pink">DECK</span>
            </h1>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              TERMINAL v1.0 // OPERATOR
            </p>
          </div>
        </div>

        {/* ---- Clock ----------------------------------------------------- */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="bracketed px-2 py-0.5 text-right">
            <div className="font-display text-lg font-bold tabular-nums leading-none text-cyan-100 text-neon">
              {hours}
              <span className={cn('mx-px transition-opacity duration-150', secondPulse ? 'opacity-100' : 'opacity-25')}>
                :
              </span>
              {minutes}
              <span className="ml-1 text-[11px] text-pink-400 text-neon-pink">{seconds}</span>
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
              {formatStardate(clock, utc)}
            </div>
          </div>

          <NeonButton
            size="sm"
            icon={Globe}
            active={utc}
            sound="click"
            onClick={() => update({ utcMode: !utc })}
            title="Toggle UTC / local time"
            className="px-1.5"
          >
            {utc ? 'UTC' : 'LCL'}
          </NeonButton>
        </div>

        {/* ---- Telemetry -------------------------------------------------- */}
        {!compact ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
            <StatGraph
              label="CPU"
              series={series.cpu}
              value={current.cpu}
              color="#22e4ff"
              height={26}
              width={90}
              warnAbove={85}
              className="w-[92px]"
            />
            <StatGraph
              label="MEM"
              series={series.memory}
              value={current.memory}
              color="#a855f7"
              height={26}
              width={90}
              warnAbove={90}
              className="w-[92px]"
            />
            <StatGraph
              label="NET"
              series={series.latency}
              value={latencyMs}
              unit="ms"
              color="#ff2d9b"
              height={26}
              width={90}
              warnAbove={150}
              className="w-[92px]"
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-end gap-2 font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-cyan-400" />
              {Math.round(current.cpu)}%
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-violet-400" />
              {Math.round(current.memory)}%
            </span>
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-pink-400" />
              {latencyMs}ms
            </span>
          </div>
        )}

        {/* ---- Controls ---------------------------------------------------- */}
        <div className="relative flex shrink-0 items-center gap-1.5">
          <span className={cn('chip hidden md:inline-flex', STATUS_TONE[status])}>
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-current"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            {status.toUpperCase()}
          </span>

          <span className="chip hidden border-cyan-500/40 bg-cyan-500/5 text-cyan-300 lg:inline-flex">
            {stats.active} TASKS
          </span>

          <NeonButton
            size="sm"
            icon={Command}
            sound="open"
            onClick={onOpenPalette}
            className="gap-1.5"
            title="Open command palette"
          >
            <span className="hidden sm:inline">CMD</span>
            <kbd className="rounded border border-cyan-500/40 px-1 text-[9px] text-cyan-300/70">
              ⌘K
            </kbd>
          </NeonButton>

          <NeonButton
            size="sm"
            icon={settings.soundEnabled ? Volume2 : VolumeX}
            variant={settings.soundEnabled ? 'cyan' : 'pink'}
            active={settings.soundEnabled}
            sound={null}
            onClick={toggleSound}
            title="Toggle sound effects"
            aria-pressed={settings.soundEnabled}
            className="px-2"
          >
            <span className="sr-only">Toggle sound</span>
          </NeonButton>

          <NeonButton
            size="sm"
            icon={Settings2}
            active={showSettings}
            sound="click"
            onClick={() => setShowSettings((prev) => !prev)}
            title="Deck configuration"
            className="px-2"
          >
            <span className="sr-only">Settings</span>
          </NeonButton>

          <AnimatePresence>
            {showSettings ? <SettingsDrawer onClose={() => setShowSettings(false)} /> : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom accent rail. */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
    </motion.header>
  );
}
