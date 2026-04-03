'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AttackCategory } from '@watchllm/types';

type TerminalRun = {
  category: AttackCategory;
  severity: number;
  status: 'completed' | 'running';
};

export const MOCK_RUNS: TerminalRun[] = [
  { category: 'prompt_injection', severity: 0.82, status: 'completed' },
  { category: 'tool_abuse', severity: 0.15, status: 'completed' },
  { category: 'hallucination', severity: 0.43, status: 'running' },
];

const START_DELAY_MS = 500;
const STEP_MS = 1100;

export function useSimulationTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let intervalId: number | null = null;

    const startTimeout = window.setTimeout(() => {
      setVisibleCount(1);

      intervalId = window.setInterval(() => {
        setVisibleCount((current) => {
          if (current >= MOCK_RUNS.length) return current;
          return current + 1;
        });
      }, STEP_MS);
    }, START_DELAY_MS);

    return () => {
      window.clearTimeout(startTimeout);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const visibleRuns = useMemo(() => MOCK_RUNS.slice(0, visibleCount), [visibleCount]);

  return {
    visibleRuns,
  };
}