'use client';

import { motion, useReducedMotion } from 'framer-motion';

type GridBackgroundProps = {
  className?: string;
};

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function GridBackground({ className }: GridBackgroundProps): JSX.Element {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={joinClassNames('grid-background', className)} aria-hidden="true">
      <div className="grid-background-lines" />
      <motion.div
        className="grid-background-gradient"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [-28, 20, -16, -28],
                y: [-10, 14, 8, -10],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: 24,
                ease: 'easeInOut',
                repeat: Number.POSITIVE_INFINITY,
              }
        }
      />
      <div className="grid-background-fade" />
    </div>
  );
}
