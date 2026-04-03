export function ForkReplayFeature() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-2xl font-semibold text-text-primary">Fork from any failure node</h3>
      <p className="mt-2 text-text-secondary">Branch from the exact break point and test fixes without cold reruns.</p>

      <div className="mt-6 rounded-md border border-border bg-surface-raised p-4">
        <svg viewBox="0 0 560 220" className="h-auto w-full" fill="none">
          <path d="M70 110H220V70H350" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
          <path d="M220 110V150H350" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
          <path d="M350 70H500" stroke="rgba(0,200,150,0.6)" strokeWidth="2" />
          <path d="M350 150H500" stroke="rgba(245,158,11,0.6)" strokeWidth="2" />

          <circle cx="70" cy="110" r="18" fill="#f0f0f0" />
          <circle cx="220" cy="110" r="18" fill="#ff4444" />
          <circle cx="350" cy="70" r="18" fill="#00C896" />
          <circle cx="350" cy="150" r="18" fill="#f59e0b" />
          <circle cx="500" cy="70" r="18" fill="#00C896" />
          <circle cx="500" cy="150" r="18" fill="#f59e0b" />

          <text x="47" y="145" fill="#888" fontSize="11">run</text>
          <text x="197" y="145" fill="#ff4444" fontSize="11">fail</text>
          <text x="330" y="105" fill="#00C896" fontSize="11">fork A</text>
          <text x="330" y="185" fill="#f59e0b" fontSize="11">fork B</text>
        </svg>
      </div>
    </div>
  );
}