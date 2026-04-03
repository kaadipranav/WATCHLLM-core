const PROBLEMS = [
  {
    title: 'Agents fail silently',
    description: 'You only discover breakage after customer-facing responses degrade.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 4v9" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
        <path d="M4 12a8 8 0 1 0 16 0" />
      </svg>
    ),
  },
  {
    title: "Logs don't replay",
    description: 'Flat logs cannot recreate execution paths or explain why failures happened.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8M8 12h5M8 16h4" />
      </svg>
    ),
  },
  {
    title: 'Every debug costs money',
    description: 'Blind reruns burn tokens and time when root cause is still unknown.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v18" />
        <path d="M16 7c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 3 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" />
      </svg>
    ),
  },
];

export function ProblemSection() {
  return (
    <section className="px-6 py-24" id="product">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <article
            key={problem.title}
            className="rounded-lg border border-border bg-surface p-5 transition-colors duration-150 ease-in-out hover:border-border-hover"
          >
            <div className="mb-4 text-accent">{problem.icon}</div>
            <h2 className="text-lg font-semibold text-text-primary">{problem.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">{problem.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}