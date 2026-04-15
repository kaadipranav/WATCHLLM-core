'use client';

import { useMemo } from 'react';

type EvervaultCardProps = {
  text: string;
  className?: string;
};

type IconProps = {
  className?: string;
};

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*';

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function generateMatrixText(seedText: string, rows = 9, cols = 34): string {
  const seed = seedText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const matrixRows = Array.from({ length: rows }, (_, rowIndex) => {
    return Array.from({ length: cols }, (_, colIndex) => {
      const glyphIndex = (seed + rowIndex * 17 + colIndex * 31 + rowIndex * colIndex) % GLYPHS.length;
      return GLYPHS[glyphIndex];
    }).join('');
  });

  return matrixRows.join('\n');
}

export function EvervaultCard({ text, className }: EvervaultCardProps): JSX.Element {
  const matrixText = useMemo(() => generateMatrixText(text), [text]);

  return (
    <div className={joinClassNames('evervault-overlay', className)} aria-hidden="true">
      <div className="evervault-overlay-grid" />
      <pre className="evervault-overlay-matrix">{matrixText}</pre>
      <div className="evervault-overlay-fade" />
    </div>
  );
}

export function Icon({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={joinClassNames('evervault-corner-icon', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10V4h6" />
      <path d="M14 4h6v6" />
      <path d="M20 14v6h-6" />
      <path d="M10 20H4v-6" />
    </svg>
  );
}
