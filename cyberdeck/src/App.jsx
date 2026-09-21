import { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { SystemProvider, useSystem } from './context/SystemContext';
import { TelemetryProvider } from './context/TelemetryContext';
import { TaskProvider } from './context/TaskContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { WindowProvider, useWindows } from './context/WindowContext';
import { BackgroundLayer } from './components/BackgroundLayer';
import { BootSequence } from './components/BootSequence';
import { CommandPalette } from './components/CommandPalette';
import { Desktop } from './components/Desktop';
import { Dock } from './components/Dock';
import { Header } from './components/Header';
import { Toasts } from './components/ui/Toasts';
import { WIDGET_IDS } from './components/widgetRegistry';
import { useHotkeys } from './hooks/useHotkeys';
import { useIsCompact } from './hooks/useMediaQuery';

/** Everything that needs the providers mounted lives in here. */
function Deck() {
  const compact = useIsCompact();
  const { sfx, pushLog, toggleSound } = useSystem();
  const { focusNext } = useWindows();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [booted, setBooted] = useState(false);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    sfx('open');
  }, [sfx]);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    sfx('close');
  }, [sfx]);

  useHotkeys({
    'mod+k': () => (paletteOpen ? closePalette() : openPalette()),
    'mod+j': () => {
      focusNext();
      sfx('click');
    },
    'mod+m': toggleSound,
    escape: () => {
      if (paletteOpen) closePalette();
    },
  });

  useEffect(() => {
    if (!booted) return;
    pushLog('DECK ONLINE — ALL SUBSYSTEMS NOMINAL', 'ok');
    pushLog('PRESS CTRL+K / ⌘K FOR THE QUICK LAUNCHER', 'info');
  }, [booted, pushLog]);

  return (
    <div className="relative flex h-full flex-col">
      <BackgroundLayer />
      <BootSequence onComplete={() => setBooted(true)} />

      <Header onOpenPalette={openPalette} compact={compact} />
      <Desktop />
      <Dock onOpenPalette={openPalette} />

      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <Toasts />
    </div>
  );
}

/**
 * CyberDeck Terminal.
 *
 * Provider order matters: telemetry, tasks and the timer all reach for the
 * system bus (sound, logging, toasts), so SystemProvider wraps everything.
 */
export default function App() {
  return (
    // Framer's animations are JS-driven, so the stylesheet's
    // prefers-reduced-motion rule cannot reach them — `reducedMotion="user"`
    // is what actually honours the operating system setting.
    <MotionConfig reducedMotion="user">
      <SystemProvider>
        <TelemetryProvider>
          <TaskProvider>
            <PomodoroProvider>
              <WindowProvider ids={WIDGET_IDS}>
                <Deck />
              </WindowProvider>
            </PomodoroProvider>
          </TaskProvider>
        </TelemetryProvider>
      </SystemProvider>
    </MotionConfig>
  );
}
