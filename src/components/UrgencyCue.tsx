import React, { useEffect, useState } from 'react';
import { Flame, Eye, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Cue = { kind: 'stock' | 'viewers' | 'recent'; icon: React.ElementType; text: string };

/**
 * UrgencyCue — rotating social-proof pill shown under the price. Picks
 * one of three deterministic messages (stock, viewers, recent purchase)
 * and cycles every 6s. All values synthesised from the product id/stock
 * so the same product reads consistently across reloads.
 *
 * Text changes animate with AnimatePresence cross-fade for a polished feel.
 */
export default function UrgencyCue({ productId, stock }: { productId: string; stock: number }) {
  const cues = buildCues(productId, stock);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (cues.length <= 1) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % cues.length), 6000);
    return () => clearTimeout(t);
  }, [index, cues.length]);

  if (cues.length === 0) return null;
  const cue = cues[index];
  const Icon = cue.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: cue.kind === 'stock' ? 'var(--color-warn-subtle)' : 'var(--grey-5)',
        color: cue.kind === 'stock' ? '#92400e' : 'var(--grey-70)',
        border: `1px solid ${cue.kind === 'stock' ? '#fde68a' : 'var(--grey-10)'}`,
        borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        fontWeight: 600,
        minWidth: 0,
      }}
    >
      <Icon size={12} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={cue.text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          style={{ display: 'inline-block' }}
        >
          {cue.text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function buildCues(id: string, stock: number): Cue[] {
  const seed = hash(id);
  const cues: Cue[] = [];

  if (stock > 0 && stock <= 5) {
    cues.push({ kind: 'stock', icon: Flame, text: `Only ${stock} left in stock` });
  }

  const viewers = 3 + (seed % 22); // 3-24
  cues.push({ kind: 'viewers', icon: Eye, text: `${viewers} people viewing this` });

  const minutes = 2 + ((seed >> 4) % 58); // 2-59
  cues.push({ kind: 'recent', icon: Clock, text: `Ordered ${minutes} min ago` });

  return cues;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
