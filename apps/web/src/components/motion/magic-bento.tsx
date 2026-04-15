'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { SpotlightCard } from './spotlight-card';

export type MagicBentoItem = {
  key: string;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
  icon: ReactNode;
  subDanger?: boolean;
};

type MagicBentoProps = {
  items: MagicBentoItem[];
  className?: string;
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  glowColor?: string;
  disableAnimations?: boolean;
};

function joinClassNames(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ');
}

function getStarStyle(itemIndex: number, starIndex: number): CSSProperties {
  const left = (itemIndex * 23 + starIndex * 19) % 100;
  const top = (itemIndex * 31 + starIndex * 37) % 100;
  const delay = ((itemIndex + 1) * (starIndex + 3)) % 7;
  const duration = 2.6 + ((itemIndex + starIndex) % 5) * 0.6;

  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

export default function MagicBento({
  items,
  className,
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableTilt = false,
  enableMagnetism = false,
  clickEffect = true,
  spotlightRadius = 360,
  particleCount = 10,
  glowColor = '0, 212, 212',
  disableAnimations = false,
}: MagicBentoProps): JSX.Element {
  const shouldReduceMotion = useReducedMotion();
  const canAnimate = !disableAnimations && !shouldReduceMotion;

  return (
    <div className={joinClassNames('magic-bento-grid', className)}>
      {items.map((item, index) => {
        const wrapperClass = joinClassNames('magic-bento-cell', index === 0 && 'magic-bento-cell-primary');

        const cardClasses = joinClassNames(
          'magic-bento-item',
          index === 0 && 'magic-bento-item-primary',
          textAutoHide && 'magic-bento-text-auto-hide',
          enableBorderGlow && 'magic-bento-border-glow',
          enableMagnetism && 'magic-bento-magnetism'
        );

        const accentStyle = {
          '--magic-accent': item.accent,
          '--magic-glow-rgb': glowColor,
        } as CSSProperties;

        const card = (
          <motion.article
            className={cardClasses}
            style={accentStyle}
            whileHover={
              canAnimate
                ? enableTilt
                  ? { y: -2, rotateX: 1.5, rotateY: -1.2 }
                  : { y: -2 }
                : undefined
            }
            whileTap={canAnimate && clickEffect ? { scale: 0.992 } : undefined}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {enableStars && (
              <div className="magic-bento-stars" aria-hidden="true">
                {Array.from({ length: particleCount }, (_, starIndex) => (
                  <span key={`${item.key}-star-${starIndex}`} style={getStarStyle(index, starIndex)} />
                ))}
              </div>
            )}

            <div className="magic-bento-head">
              <p className="magic-bento-label">{item.label}</p>
              <div className="magic-bento-icon">{item.icon}</div>
            </div>

            <p className="magic-bento-value">{item.value}</p>
            <p className={joinClassNames('magic-bento-sub', item.subDanger && 'magic-bento-sub-danger')}>
              {item.sub}
            </p>
          </motion.article>
        );

        if (!enableSpotlight) {
          return (
            <div key={item.key} className={wrapperClass}>
              {card}
            </div>
          );
        }

        return (
          <SpotlightCard
            key={item.key}
            className={joinClassNames('magic-bento-spotlight', wrapperClass)}
            size={spotlightRadius}
            glowColor="rgba(0, 212, 212, 0.24)"
            softGlowColor="rgba(0, 212, 212, 0.1)"
          >
            {card}
          </SpotlightCard>
        );
      })}
    </div>
  );
}
