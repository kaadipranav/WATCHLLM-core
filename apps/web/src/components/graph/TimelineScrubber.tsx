'use client';

interface TimelineScrubberProps {
  totalNodes: number;
  value: number;
  onScrub: (index: number) => void;
}

export function TimelineScrubber({ totalNodes, value, onScrub }: TimelineScrubberProps) {
  if (totalNodes <= 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>Timeline</span>
        <span className="font-mono">
          {Math.min(value + 1, totalNodes)}/{totalNodes} nodes highlighted
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, totalNodes - 1)}
        step={1}
        value={Math.min(value, Math.max(0, totalNodes - 1))}
        onChange={(event) => onScrub(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-raised accent-accent"
      />
    </div>
  );
}