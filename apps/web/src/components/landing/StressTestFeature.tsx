'use client';

import { ALL_ATTACK_CATEGORIES } from '@watchllm/types';
import { useCyclingIndex } from '@/hooks/useCyclingIndex';

export function StressTestFeature() {
  const activeIndex = useCyclingIndex(ALL_ATTACK_CATEGORIES.length, 900);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-2xl font-semibold text-text-primary">Stress test every failure mode</h3>
      <p className="mt-2 text-text-secondary">
        Run targeted attacks across all categories before shipping changes.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ALL_ATTACK_CATEGORIES.map((category, index) => {
          const isLit = index === activeIndex;
          return (
            <div
              key={category}
              className={`rounded-md border px-2 py-3 text-center font-mono text-xs transition-all duration-150 ease-in-out ${
                isLit
                  ? 'border-accent bg-accent-dim text-accent shadow-[0_0_18px_rgba(0,200,150,0.18)]'
                  : 'border-border bg-surface-raised text-text-tertiary'
              }`}
            >
              {category}
            </div>
          );
        })}
      </div>
    </div>
  );
}