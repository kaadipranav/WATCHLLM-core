export function GraphReplayFeature() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-2xl font-semibold text-text-primary">Replay with graph-level context</h3>
      <p className="mt-2 text-text-secondary">Inspect the exact chain of calls that produced failure.</p>

      <div className="mt-6 rounded-md border border-border bg-surface-raised p-4">
        <svg viewBox="0 0 560 220" className="h-auto w-full" fill="none">
          <line x1="80" y1="110" x2="210" y2="110" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <line x1="240" y1="110" x2="360" y2="70" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <line x1="240" y1="110" x2="360" y2="150" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <line x1="390" y1="70" x2="490" y2="70" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <line x1="390" y1="150" x2="490" y2="150" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

          <circle cx="60" cy="110" r="20" fill="#f0f0f0" />
          <circle cx="230" cy="110" r="20" fill="#00C896" />
          <circle cx="380" cy="70" r="20" fill="#6366f1" />
          <circle cx="380" cy="150" r="20" fill="#f59e0b" />
          <circle cx="510" cy="70" r="20" fill="#ff4444" />
          <circle cx="510" cy="150" r="20" fill="#f0f0f0" />

          <text x="46" y="148" fill="#888" fontSize="11">start</text>
          <text x="206" y="148" fill="#888" fontSize="11">llm</text>
          <text x="356" y="108" fill="#888" fontSize="11">tool</text>
          <text x="344" y="188" fill="#888" fontSize="11">decision</text>
          <text x="485" y="108" fill="#ff4444" fontSize="11">failure</text>
        </svg>
      </div>
    </div>
  );
}