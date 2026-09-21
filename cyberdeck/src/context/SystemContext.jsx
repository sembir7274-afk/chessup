import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { useLocalStorage } from '../hooks/useLocalStorage';

const SystemContext = createContext(null);

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  volume: 0.55,
  overlayOpacity: 0.62,
  gridVisible: true,
  scanlines: true,
  parallax: true,
  vignette: true,
  utcMode: false,
  accent: 'cyan',
};

const MAX_LOG = 60;

let logSeq = 0;

/**
 * Deck-wide state: operator preferences, the synthesised sound bus, the
 * boot/event log and transient toasts. Every widget talks to the audio engine
 * through `sfx` so a single mute switch governs the whole interface.
 */
export function SystemProvider({ children }) {
  const [settings, setSettings] = useLocalStorage('cyberdeck.settings', DEFAULT_SETTINGS);
  const [log, setLog] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [audioReady, setAudioReady] = useState(false);
  const toastTimers = useRef(new Map());

  const merged = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);

  const update = useCallback(
    (patch) => setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch })),
    [setSettings],
  );

  // Mirror preferences into the audio graph whenever they change.
  useEffect(() => {
    audioEngine.setMuted(!merged.soundEnabled);
    audioEngine.setVolume(merged.volume);
    if (!merged.soundEnabled) audioEngine.stopAllAmbient();
  }, [merged.soundEnabled, merged.volume]);

  // The first real gesture anywhere in the document unlocks playback.
  useEffect(() => {
    let cancelled = false;
    const unlock = async () => {
      const ok = await audioEngine.unlock();
      if (ok && !cancelled) {
        setAudioReady(true);
        audioEngine.setMuted(!merged.soundEnabled);
        audioEngine.setVolume(merged.volume);
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [merged.soundEnabled, merged.volume]);

  const sfx = useCallback(
    (name) => {
      if (!merged.soundEnabled) return;
      audioEngine.play(name);
    },
    [merged.soundEnabled],
  );

  const pushLog = useCallback((message, level = 'info') => {
    logSeq += 1;
    setLog((prev) => {
      const entry = { id: `log-${logSeq}`, message, level, at: Date.now() };
      return [entry, ...prev].slice(0, MAX_LOG);
    });
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message, { level = 'info', duration = 3600 } = {}) => {
      logSeq += 1;
      const id = `toast-${logSeq}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, level }]);
      const timer = window.setTimeout(() => dismissToast(id), duration);
      toastTimers.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const toggleSound = useCallback(() => {
    const next = !merged.soundEnabled;
    update({ soundEnabled: next });
    if (next) {
      // Unmute before the confirmation tone so it is audible.
      audioEngine.setMuted(false);
      audioEngine.play('toggleOn');
    } else {
      audioEngine.play('toggleOff');
    }
    pushLog(`AUDIO BUS ${next ? 'ENGAGED' : 'MUTED'}`, next ? 'ok' : 'warn');
  }, [merged.soundEnabled, update, pushLog]);

  const value = useMemo(
    () => ({
      settings: merged,
      update,
      sfx,
      toggleSound,
      audioReady,
      log,
      pushLog,
      toasts,
      toast,
      dismissToast,
    }),
    [merged, update, sfx, toggleSound, audioReady, log, pushLog, toasts, toast, dismissToast],
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error('useSystem must be used inside <SystemProvider>');
  return ctx;
}
