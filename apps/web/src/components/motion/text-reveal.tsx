'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';

type RevealTag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span';

type TextRevealProps = {
  as?: RevealTag;
  text?: string;
  lines?: string[];
  className?: string;
  lineClassName?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
};

const EASE_CURVE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const MOTION_TAGS: Record<RevealTag, typeof motion.div> = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  div: motion.div,
  span: motion.span,
};

function splitWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function TextReveal({
  as = 'div',
  text,
  lines,
  className,
  lineClassName,
  wordClassName,
  delay = 0,
  stagger = 0.06,
  duration = 0.72,
  once = true,
  amount = 0.45,
}: TextRevealProps): JSX.Element | null {
  const shouldReduceMotion = useReducedMotion();
  const lineList = lines && lines.length > 0 ? lines : text ? [text] : [];

  if (lineList.length === 0) {
    return null;
  }

  const MotionTag = MOTION_TAGS[as];

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: '112%', filter: 'blur(6px)' },
    visible: (index: number) => ({
      opacity: 1,
      y: '0%',
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: EASE_CURVE,
        delay: delay + index * stagger,
      },
    }),
  };

  if (shouldReduceMotion) {
    return (
      <MotionTag className={className}>
        {lineList.map((line, lineIndex) => (
          <span key={`${line}-${lineIndex}`} className={joinClassNames('text-reveal-line', lineClassName)}>
            {line}
          </span>
        ))}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
    >
      {lineList.map((line, lineIndex) => {
        const words = splitWords(line);

        return (
          <span key={`${line}-${lineIndex}`} className={joinClassNames('text-reveal-line', lineClassName)}>
            {words.map((word, wordIndex) => {
              const staggerIndex = lineIndex * 18 + wordIndex;
              return (
                <span key={`${word}-${staggerIndex}`} className="text-reveal-word-shell">
                  <motion.span
                    className={joinClassNames('text-reveal-word', wordClassName)}
                    variants={wordVariants}
                    custom={staggerIndex}
                  >
                    {word}
                  </motion.span>
                </span>
              );
            })}
          </span>
        );
      })}
    </MotionTag>
  );
}
