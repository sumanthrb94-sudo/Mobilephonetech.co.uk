import React, { useEffect, useRef } from 'react';
import { animate, stagger, text } from 'animejs';
import { useReducedMotion } from 'motion/react';

/**
 * Headline that reveals word by word.
 *
 * anime.js's text splitter does the part that is genuinely awkward otherwise:
 * it wraps each word in its own element while preserving the original markup,
 * line breaks and spacing, so the stagger can run without the caller
 * hand-writing a span per word — and without breaking text selection or
 * copy-paste, because the splitter marks the wrappers up accessibly.
 *
 * Falls back to plain text when motion is reduced or the split throws, so a
 * failure here can never leave the headline invisible.
 */
export default function RevealText({
  children,
  as: Tag = 'span',
  delay = 0,
  className,
  style,
}: {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;

    let splitter: ReturnType<typeof text.split> | null = null;

    try {
      splitter = text.split(el, { words: true, chars: false });
      const words = (splitter?.words ?? []) as Element[];
      if (!words.length) return;

      animate(words, {
        opacity: [0, 1],
        y: ['0.55em', '0em'],
        duration: 650,
        ease: 'outQuad',
        delay: stagger(50, { start: delay }),
      });
    } catch {
      // Already rendered as ordinary children — leave the text alone rather
      // than risk a headline that never becomes visible.
      splitter = null;
    }

    return () => { splitter?.revert(); };
  }, [children, delay, reduceMotion]);

  return React.createElement(Tag, { ref, className, style }, children);
}
