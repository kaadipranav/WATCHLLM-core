interface StatusBadgeProps {
  status: 'queued' | 'running' | 'completed' | 'failed';
}

const STYLES: Record<StatusBadgeProps['status'], string> = {
  queued: 'border border-border bg-surface text-text-secondary',
  running: 'border border-warning/40 bg-warning/10 text-warning',
  completed: 'border border-accent/40 bg-accent/10 text-accent',
  failed: 'border border-danger/40 bg-danger/10 text-danger',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-medium font-mono ${STYLES[status]}`}
    >
      {status === 'running' ? <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" /> : null}
      {status}
    </span>
  );
}