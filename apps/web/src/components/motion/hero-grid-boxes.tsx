'use client';

import type { CSSProperties } from 'react';

type HeroGridBoxesProps = {
  className?: string;
  rows?: number;
  cols?: number;
};

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function HeroGridBoxes({ className, rows = 14, cols = 26 }: HeroGridBoxesProps): JSX.Element {
  const cells = rows * cols;

  const style = {
    '--hero-grid-cols': String(cols),
  } as CSSProperties;

  return (
    <div className={joinClassNames('hero-grid-boxes', className)} style={style} aria-hidden="true">
      {Array.from({ length: cells }, (_, index) => (
        <span key={index} className="hero-grid-box-cell" />
      ))}
    </div>
  );
}
