import { useCallback, useEffect, useState } from 'react';
import { audioEngine, AMBIENT_SOURCES } from '../lib/audioEngine';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_LEVELS = AMBIENT_SOURCES.reduce((acc, source) => {
  acc[source.id] = 0.32;
  return acc;
}, {});

/**
 * React-side mirror of the engine's ambient layers.
 *
 * The engine owns the audio nodes; this hook owns the UI truth (which beds are
 * lit, at what level) and keeps the two in sync, including tearing every bed
 * down when the master sound switch is cut.
 */
export function useAmbient({ soundEnabled }) {
  const [levels, setLevels] = useLocalStorage('cyberdeck.ambient.levels', DEFAULT_LEVELS);
  const [active, setActive] = useState([]);

  // A master mute must not leave orphaned beds running.
  useEffect(() => {
    if (!soundEnabled && active.length > 0) {
      audioEngine.stopAllAmbient();
      setActive([]);
    }
  }, [soundEnabled, active.length]);

  useEffect(() => () => audioEngine.stopAllAmbient(), []);

  const toggle = useCallback(
    async (id) => {
      if (!soundEnabled) return false;
      await audioEngine.unlock();
      const level = levels[id] ?? 0.32;
      const isOn = audioEngine.toggleAmbient(id, level);
      setActive(audioEngine.activeAmbients());
      return isOn;
    },
    [soundEnabled, levels],
  );

  const setLevel = useCallback(
    (id, level) => {
      setLevels((prev) => ({ ...prev, [id]: level }));
      audioEngine.setAmbientLevel(id, level);
    },
    [setLevels],
  );

  const stopAll = useCallback(() => {
    audioEngine.stopAllAmbient();
    setActive([]);
  }, []);

  return {
    sources: AMBIENT_SOURCES,
    levels: { ...DEFAULT_LEVELS, ...levels },
    active,
    isActive: (id) => active.includes(id),
    toggle,
    setLevel,
    stopAll,
  };
}
