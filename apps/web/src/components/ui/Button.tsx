import type { ReactNode } from 'react';

interface ButtonProps {
  variant: 'accent' | 'ghost' | 'danger';
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const BASE_STYLES =
  'inline-flex h-9 items-center justify-center rounded-[7px] px-4 text-sm font-medium transition-all duration-150 ease-in-out';

const VARIANT_STYLES: Record<ButtonProps['variant'], string> = {
  accent: 'bg-accent text-bg hover:bg-accent/90',
  ghost: 'border border-border text-text-primary hover:border-border-hover',
  danger: 'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
};

export function Button({
  variant,
  href,
  onClick,
  children,
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const disabledStyles = disabled ? 'pointer-events-none opacity-50' : '';
  const className = `${BASE_STYLES} ${VARIANT_STYLES[variant]} ${disabledStyles}`;

  if (href) {
    return (
      <a href={href} className={className} aria-disabled={disabled}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  );
}