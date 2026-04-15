'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';

type HeroGridBoxesProps = {
  className?: string;
  rows?: number;
  cols?: number;
};

const HOVER_COLORS = [
  'rgba(45, 226, 230, 0.34)',
  'rgba(118, 204, 255, 0.34)',
  'rgba(92, 164, 255, 0.3)',
  'rgba(79, 103, 255, 0.27)',
];

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function getHoverColor(index: number): string {
  return HOVER_COLORS[index % HOVER_COLORS.length];
}

export function HeroGridBoxes({ className, rows = 14, cols = 26 }: HeroGridBoxesProps): JSX.Element {
  const shouldReduceMotion = useReducedMotion();
  const cells = rows * cols;

  const style = {
    '--hero-grid-cols': String(cols),
  } as CSSProperties;

  return (
    <div className={joinClassNames('hero-grid-boxes', className)} style={style} aria-hidden="true">
      {Array.from({ length: cells }, (_, index) => (
        <motion.span
          key={index}
          className="hero-grid-box-cell"
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  backgroundColor: getHoverColor(index),
                  boxShadow: 'inset 0 0 14px rgba(45, 226, 230, 0.22), 0 0 18px rgba(45, 226, 230, 0.25)',
                }
          }
          transition={{ duration: 0 }}
        />
      ))}
    </div>
  );
}
