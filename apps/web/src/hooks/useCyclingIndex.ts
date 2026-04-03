'use client';

import { useEffect, useState } from 'react';

export function useCyclingIndex(total: number, intervalMs: number) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (total <= 1) return;

    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, total]);

  return index;
}