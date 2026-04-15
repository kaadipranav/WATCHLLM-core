'use client';

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import type { HTMLAttributes, MouseEventHandler } from 'react';

type SpotlightCardProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
  glowColor?: string;
  softGlowColor?: string;
};

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function SpotlightCard({
  className,
  children,
  size = 260,
  glowColor = 'rgba(0, 212, 212, 0.26)',
  softGlowColor = 'rgba(0, 212, 212, 0.1)',
  onMouseMove,
  onMouseLeave,
  onMouseEnter,
  ...rest
}: SpotlightCardProps): JSX.Element {
  const shouldReduceMotion = useReducedMotion();

  const pointerX = useMotionValue(-size);
  const pointerY = useMotionValue(-size);
  const glowVisibility = useMotionValue(0);
  const smoothGlowVisibility = useSpring(glowVisibility, {
    stiffness: 320,
    damping: 34,
    mass: 0.2,
  });

  const glowGradient = useMotionTemplate`
    radial-gradient(
      ${size}px circle at ${pointerX}px ${pointerY}px,
      ${glowColor} 0%,
      ${softGlowColor} 36%,
      rgba(0, 212, 212, 0.03) 54%,
      transparent 72%
    )
  `;

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - rect.left);
    pointerY.set(event.clientY - rect.top);
    glowVisibility.set(1);

    if (onMouseMove) {
      onMouseMove(event);
    }
  };

  const handleMouseEnter: MouseEventHandler<HTMLDivElement> = (event) => {
    glowVisibility.set(1);

    if (onMouseEnter) {
      onMouseEnter(event);
    }
  };

  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = (event) => {
    glowVisibility.set(0);

    if (onMouseLeave) {
      onMouseLeave(event);
    }
  };

  return (
    <div
      {...rest}
      className={joinClassNames('spotlight-card', className)}
      onMouseMove={shouldReduceMotion ? onMouseMove : handleMouseMove}
      onMouseEnter={shouldReduceMotion ? onMouseEnter : handleMouseEnter}
      onMouseLeave={shouldReduceMotion ? onMouseLeave : handleMouseLeave}
    >
      {!shouldReduceMotion && (
        <motion.div
          className="spotlight-card-glow"
          style={{
            background: glowGradient,
            opacity: smoothGlowVisibility,
          }}
        />
      )}
      <div className="spotlight-card-content">{children}</div>
    </div>
  );
}
