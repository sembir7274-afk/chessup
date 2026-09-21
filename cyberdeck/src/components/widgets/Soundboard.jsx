import { CloudRain, Orbit, Power, Volume2, VolumeX, Waves } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useSystem } from '../../context/SystemContext';
import { useAmbient } from '../../hooks/useAmbient';
import { NeonButton } from '../ui/NeonButton';

const ICONS = {
  white: Waves,
  rain: CloudRain,
  space: Orbit,
};

const ACCENTS = {
  cyan: {
    border: 'border-cyan-400/70',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-200',
    glow: 'shadow-glow-cyan',
    raw: '#22e4ff',
  },
  violet: {
    border: 'border-violet-400/70',
    bg: 'bg-violet-500/10',
    text: 'text-violet-200',
    glow: 'shadow-glow-violet',
    raw: '#a855f7',
  },
  pink: {
    border: 'border-pink-400/70',
    bg: 'bg-pink-500/10',
    text: 'text-pink-200',
    glow: 'shadow-glow-pink',
    raw: '#ff2d9b',
  },
};

/**
 * Ambient soundboard.
 *
 * Every bed is synthesised live in the Web Audio graph — no sample files ship
 * with the deck, so the beds loop forever without seams or downloads.
 */
export function Soundboard() {
  const { settings, update, sfx, toast, pushLog } = useSystem();
  const ambient = useAmbient({ soundEnabled: settings.soundEnabled });

  const handleToggle = async (source) => {
    if (!settings.soundEnabled) {
      sfx('error');
      toast('Audio bus is muted. Enable sound in the status bar.', { level: 'warn' });
      return;
    }
    const isOn = await ambient.toggle(source.id);
    sfx(isOn ? 'toggleOn' : 'toggleOff');
    pushLog(`AMBIENT ${source.label.toUpperCase()} ${isOn ? 'ONLINE' : 'OFFLINE'}`, isOn ? 'ok' : 'info');
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <span className="label-hud">AMBIENT SYNTHESIS</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
          {ambient.active.length} / {ambient.sources.length} LAYERS
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
        {ambient.sources.map((source) => {
          const Icon = ICONS[source.id] ?? Waves;
          const accent = ACCENTS[source.accent] ?? ACCENTS.cyan;
          const isOn = ambient.isActive(source.id);
          const level = ambient.levels[source.id];

          return (
            <motion.div
              key={source.id}
              layout
              className={cn(
                'rounded-md border bg-slate-950/50 p-2 transition-all duration-300',
                isOn ? cn(accent.border, accent.bg, accent.glow) : 'border-slate-700/50',
              )}
            >
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  aria-pressed={isOn}
                  aria-label={`Toggle ${source.label}`}
                  onClick={() => handleToggle(source)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-200',
                    isOn
                      ? cn(accent.border, accent.text, accent.glow)
                      : 'border-slate-700/60 text-slate-500 hover:border-cyan-500/50 hover:text-cyan-300',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </motion.button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'font-display text-[10px] font-bold uppercase tracking-[0.16em]',
                      isOn ? accent.text : 'text-slate-400',
                    )}
                  >
                    {source.label}
                  </p>
                  <p className="truncate font-mono text-[9px] text-slate-600">
                    {source.description}
                  </p>
                </div>

                {/* Playing indicator — three dancing bars. */}
                <div className="flex h-5 shrink-0 items-end gap-[2px]">
                  {[0, 1, 2].map((bar) => (
                    <motion.span
                      key={bar}
                      className="w-[3px] rounded-full"
                      style={{ backgroundColor: isOn ? accent.raw : '#1e2c47' }}
                      animate={
                        isOn
                          ? { height: ['30%', '100%', '55%', '85%', '30%'] }
                          : { height: '25%' }
                      }
                      transition={
                        isOn
                          ? { duration: 1.1 + bar * 0.25, repeat: Infinity, ease: 'easeInOut' }
                          : { duration: 0.2 }
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="label-hud w-8 shrink-0">LVL</span>
                <input
                  type="range"
                  min="0.02"
                  max="0.8"
                  step="0.01"
                  value={level}
                  aria-label={`${source.label} level`}
                  onChange={(event) => ambient.setLevel(source.id, Number(event.target.value))}
                  className="flex-1"
                  style={{ accentColor: accent.raw }}
                />
                <span className="w-8 shrink-0 text-right font-mono text-[9px] tabular-nums text-slate-500">
                  {Math.round((level / 0.8) * 100)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ---- Master bus ------------------------------------------------ */}
      <div className="shrink-0 space-y-2 border-t border-cyan-500/15 pt-2">
        <div className="flex items-center gap-2">
          <span className="label-hud w-14 shrink-0">MASTER</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.volume}
            aria-label="Master volume"
            onChange={(event) => update({ volume: Number(event.target.value) })}
            className="flex-1"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[9px] tabular-nums text-cyan-300">
            {Math.round(settings.volume * 100)}
          </span>
        </div>

        <div className="flex gap-1.5">
          <NeonButton
            size="sm"
            icon={settings.soundEnabled ? Volume2 : VolumeX}
            variant={settings.soundEnabled ? 'cyan' : 'pink'}
            sound={null}
            onClick={() => update({ soundEnabled: !settings.soundEnabled })}
            className="flex-1"
          >
            BUS {settings.soundEnabled ? 'OPEN' : 'MUTED'}
          </NeonButton>
          <NeonButton
            size="sm"
            icon={Power}
            variant="danger"
            sound="close"
            onClick={() => {
              ambient.stopAll();
              pushLog('ALL AMBIENT LAYERS TERMINATED', 'warn');
            }}
            disabled={ambient.active.length === 0}
            className="flex-1"
          >
            KILL ALL
          </NeonButton>
        </div>
      </div>
    </div>
  );
}
