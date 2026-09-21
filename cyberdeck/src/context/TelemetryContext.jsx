import { createContext, useContext, useMemo } from 'react';
import { useSystemStats } from '../hooks/useSystemStats';

const TelemetryContext = createContext(null);

/**
 * One shared telemetry simulation for the whole deck, so the status bar and
 * the diagnostics panel always agree on the numbers.
 */
export function TelemetryProvider({ children }) {
  const { series, current } = useSystemStats({ intervalMs: 900 });

  const value = useMemo(() => {
    // Latency is reported in ms, not percent — scale the 0-100 walk up.
    const latencyMs = Math.round(6 + current.latency * 1.9);
    const status =
      current.cpu > 88 || latencyMs > 150
        ? 'critical'
        : current.cpu > 70 || latencyMs > 110
          ? 'degraded'
          : 'nominal';
    return { series, current, latencyMs, status };
  }, [series, current]);

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used inside <TelemetryProvider>');
  return ctx;
}
