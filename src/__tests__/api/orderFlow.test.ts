import { describe, it, expect } from 'vitest';
import { canTransition, STATUS_FOR_KIND } from '../../../api/_orderFlow.js';
import { nextAction, stageOf, STAGES } from '../../lib/orders';

/**
 * The order lifecycle.
 *
 * An order goes paid → dispatched → out for delivery → delivered, one stage
 * at a time, and never back. The admin screen offers only the next move, but
 * the screen is a courtesy: a replayed request, a stale tab or a second
 * member of staff all reach the route directly, so the rule has to live
 * there. These pin both, and — crucially — that the two agree.
 */

describe('canTransition', () => {
  it('allows each step forward, one at a time', () => {
    expect(canTransition('pending', 'dispatched').ok).toBe(true);
    expect(canTransition('confirmed', 'dispatched').ok).toBe(true);
    expect(canTransition('dispatched', 'out-for-delivery').ok).toBe(true);
    expect(canTransition('out-for-delivery', 'delivered').ok).toBe(true);
  });

  it('refuses going backwards', () => {
    // The bug this exists for: a delivered order re-marked as dispatched
    // mails the customer "on its way" for a parcel already in their hands.
    const back = canTransition('delivered', 'dispatched');
    expect(back.ok).toBe(false);
    expect(back.reason).toMatch(/already delivered/i);

    expect(canTransition('out-for-delivery', 'dispatched').ok).toBe(false);
  });

  it('refuses skipping a stage', () => {
    const skip = canTransition('pending', 'delivered');
    expect(skip.ok).toBe(false);
    expect(skip.reason).toMatch(/dispatched/i);
  });

  it('refuses repeating the stage the order is already at', () => {
    const same = canTransition('dispatched', 'dispatched');
    expect(same.ok).toBe(false);
    expect(same.reason).toMatch(/already dispatched/i);
  });

  it('will not move a refunded order at all', () => {
    for (const to of ['dispatched', 'out-for-delivery', 'delivered']) {
      expect(canTransition('refunded', to).ok).toBe(false);
    }
    // Not even the re-send, which is otherwise always allowed.
    expect(canTransition('refunded', 'confirmed', 'confirmation').ok).toBe(false);
  });

  it('allows re-sending the receipt at any live stage', () => {
    // Not a transition: it re-sends an email for a stage already reached.
    for (const from of ['pending', 'confirmed', 'dispatched', 'out-for-delivery', 'delivered']) {
      expect(canTransition(from, 'confirmed', 'confirmation').ok).toBe(true);
    }
  });

  it('refuses a status it does not recognise rather than guessing', () => {
    expect(canTransition('banana', 'dispatched').ok).toBe(false);
    expect(canTransition('pending', 'banana').ok).toBe(false);
  });
});

describe('the admin screen and the route agree', () => {
  /**
   * The screen offers one move per stage and the route enforces the same
   * rules, but they are two files — api/ and src/ are separate build trees,
   * so neither can import the other at runtime. This is the join: every move
   * the UI offers must be one the route would accept.
   */
  it('never offers a move the server would refuse', () => {
    for (const status of ['pending', 'confirmed', 'dispatched', 'out-for-delivery', 'delivered', 'refunded']) {
      const next = nextAction(status);
      if (!next) continue;
      const target = STATUS_FOR_KIND[next.kind];
      const check = canTransition(status, target, next.kind);
      expect(check.ok, `${status} → ${target}: ${check.reason ?? ''}`).toBe(true);
    }
  });

  it('offers nothing once an order is delivered or refunded', () => {
    expect(nextAction('delivered')).toBeNull();
    expect(nextAction('refunded')).toBeNull();
  });

  it('places every live status somewhere on the rail', () => {
    expect(stageOf('pending')).toBe('paid');
    expect(stageOf('confirmed')).toBe('paid');
    expect(stageOf('dispatched')).toBe('dispatched');
    expect(stageOf('out-for-delivery')).toBe('out-for-delivery');
    expect(stageOf('delivered')).toBe('delivered');
    // Refunded is the end of the line, not a point on it.
    expect(stageOf('refunded')).toBeNull();
    expect(STAGES).toHaveLength(4);
  });
});
