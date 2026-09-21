import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSystem } from './SystemContext';
import { firePomodoroConfetti } from '../lib/confetti';
import { formatDuration } from '../lib/format';

const PomodoroContext = createContext(null);

export const POMODORO_MODES = {
  focus: {
    id: 'focus',
    label: 'Deep Work',
    short: 'FOCUS',
    minutes: 25,
    accent: 'cyan',
    ring: '#22e4ff',
    description: 'Neural link saturated. No interrupts.',
  },
  short: {
    id: 'short',
    label: 'Short Break',
    short: 'DECOMP',
    minutes: 5,
    accent: 'lime',
    ring: '#9dff3d',
    description: 'Flush the buffers. Stand up.',
  },
  long: {
    id: 'long',
    label: 'Long Break',
    short: 'COOLDOWN',
    minutes: 15,
    accent: 'pink',
    ring: '#ff2d9b',
    description: 'Full coolant cycle. Step away from the deck.',
  },
};

export const MODE_LIST = Object.values(POMODORO_MODES);

/** Four deep-work blocks earn a long break. */
const CYCLES_BEFORE_LONG = 4;

/**
 * The Neural Sync timer.
 *
 * Countdown is derived from a wall-clock deadline rather than decremented per
 * tick, so a throttled background tab cannot make the timer drift.
 */
export function PomodoroProvider({ children }) {
  const { sfx, pushLog, toast } = useSystem();

  const [mode, setMode] = useState('focus');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(POMODORO_MODES.focus.minutes * 60);
  const [completedFocus, setCompletedFocus] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const deadline = useRef(null);
  const total = POMODORO_MODES[mode].minutes * 60;

  const applyMode = useCallback((nextMode, { autostart = false } = {}) => {
    const seconds = POMODORO_MODES[nextMode].minutes * 60;
    setMode(nextMode);
    setRemaining(seconds);
    if (autostart) {
      deadline.current = Date.now() + seconds * 1000;
      setRunning(true);
    } else {
      deadline.current = null;
      setRunning(false);
    }
  }, []);

  const handleComplete = useCallback(() => {
    const finished = POMODORO_MODES[mode];
    sfx('alarm');
    firePomodoroConfetti();

    if (mode === 'focus') {
      const nextCount = completedFocus + 1;
      setCompletedFocus(nextCount);
      const nextMode = nextCount % CYCLES_BEFORE_LONG === 0 ? 'long' : 'short';
      pushLog(`SYNC BLOCK ${nextCount} COMPLETE — ${POMODORO_MODES[nextMode].short} QUEUED`, 'ok');
      toast(`${finished.label} complete. ${POMODORO_MODES[nextMode].label} queued.`, {
        level: 'ok',
      });
      applyMode(nextMode, { autostart: autoAdvance });
    } else {
      pushLog('RECOVERY CYCLE COMPLETE — REENGAGING DEEP WORK', 'ok');
      toast('Break over. Deep Work re-armed.', { level: 'info' });
      applyMode('focus', { autostart: autoAdvance });
    }
  }, [mode, completedFocus, sfx, pushLog, toast, applyMode, autoAdvance]);

  useEffect(() => {
    if (!running) return undefined;

    const tick = () => {
      if (deadline.current === null) return;
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        deadline.current = null;
        setRunning(false);
        handleComplete();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, handleComplete]);

  const start = useCallback(() => {
    if (running) return;
    const seconds = remaining > 0 ? remaining : POMODORO_MODES[mode].minutes * 60;
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
    sfx('beep');
    pushLog(`NEURAL SYNC ENGAGED — ${POMODORO_MODES[mode].short} ${formatDuration(seconds)}`, 'ok');
  }, [running, remaining, mode, sfx, pushLog]);

  const pause = useCallback(() => {
    if (!running) return;
    deadline.current = null;
    setRunning(false);
    sfx('toggleOff');
    pushLog('NEURAL SYNC HELD', 'warn');
  }, [running, sfx, pushLog]);

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
  }, [running, pause, start]);

  const reset = useCallback(() => {
    applyMode(mode);
    sfx('close');
    pushLog(`${POMODORO_MODES[mode].short} TIMER RESET`, 'info');
  }, [mode, applyMode, sfx, pushLog]);

  const skip = useCallback(() => {
    const nextMode =
      mode === 'focus'
        ? (completedFocus + 1) % CYCLES_BEFORE_LONG === 0
          ? 'long'
          : 'short'
        : 'focus';
    applyMode(nextMode);
    sfx('open');
    pushLog(`PHASE SKIPPED — ${POMODORO_MODES[nextMode].short} ARMED`, 'warn');
  }, [mode, completedFocus, applyMode, sfx, pushLog]);

  const selectMode = useCallback(
    (nextMode) => {
      if (!POMODORO_MODES[nextMode]) return;
      applyMode(nextMode);
      sfx('click');
      pushLog(`MODE SET — ${POMODORO_MODES[nextMode].label.toUpperCase()}`, 'info');
    },
    [applyMode, sfx, pushLog],
  );

  const value = useMemo(
    () => ({
      mode,
      modeConfig: POMODORO_MODES[mode],
      running,
      remaining,
      total,
      progress: total > 0 ? 1 - remaining / total : 0,
      completedFocus,
      cyclesBeforeLong: CYCLES_BEFORE_LONG,
      autoAdvance,
      setAutoAdvance,
      start,
      pause,
      toggle,
      reset,
      skip,
      selectMode,
    }),
    [
      mode,
      running,
      remaining,
      total,
      completedFocus,
      autoAdvance,
      start,
      pause,
      toggle,
      reset,
      skip,
      selectMode,
    ],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used inside <PomodoroProvider>');
  return ctx;
}
