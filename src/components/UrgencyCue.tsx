import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Cue = { kind: 'stock'; icon: React.ElementType; text: string };

/**
 * UrgencyCue — a scarcity pill shown under the price, when there is a real
 * scarcity to report.
 *
 * It used to rotate three messages, two of which were invented: the viewer
 * count was `3 + (hash(productId) % 22)` and the "ordered N minutes ago" was
 * the same hash shifted four bits. Nobody was viewing the product and nobody
 * had ordered it. Under the DMCC Act 2024 that is not a grey area — false
 * claims about other consumers' behaviour, used to hurry a purchase, are an
 * automatically unfair practice the CMA can fine directly, without a court.
 * The fabricated 4.8-star aggregate removed from ProductDetail earlier was
 * the same defect wearing a different hat.
 *
 * What is left is the one cue that was ever true: stock, which comes from
 * the product document and is the number the checkout will actually reserve
 * against. If that is healthy there is nothing urgent to say, so the
 * component renders nothing rather than inventing something.
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

function buildCues(_id: string, stock: number): Cue[] {
  // Five is the threshold the inventory console already treats as "low", so
  // the shopper and the staff screen agree on what counts as nearly gone.
  if (stock > 0 && stock <= 5) {
    return [{ kind: 'stock', icon: Flame, text: `Only ${stock} left in stock` }];
  }
  return [];
}
