import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-10 text-center">
      <div className="mb-4 text-text-secondary">{icon}</div>
      <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 max-w-md text-text-secondary">{description}</p>
      {ctaLabel && onCtaClick ? (
        <div className="mt-5">
          <Button variant="accent" onClick={onCtaClick}>
            {ctaLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}