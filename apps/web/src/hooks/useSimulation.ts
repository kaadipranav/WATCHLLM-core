'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SimRunRow, SimulationRow } from '@watchllm/types';
import { api } from '@/lib/api-client';

export type SimulationDetail = SimulationRow & { runs: SimRunRow[] };

export function useSimulation(simulationId: string) {
  const [data, setData] = useState<SimulationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const nextData = await api.simulations.get(simulationId);
      setData(nextData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load simulation');
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    if (data.status !== 'queued' && data.status !== 'running') return;

    const intervalId = window.setInterval(() => {
      void load();
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [data, load]);

  return {
    data,
    error,
    isLoading,
    refresh: load,
  };
}