import { describe, it, expect } from 'vitest';
import {
  can, capabilitiesOf, roleFromClaims, roleLabel, refusalFor,
  type Capability, type StaffRole,
} from '../../lib/adminRoles';

/**
 * The console's authorization policy.
 *
 * What is pinned here is the division itself: staff can run the shop day to
 * day and cannot change what the shop front says, cannot take a product off
 * sale, and cannot read margin. If a change makes one of these pass by
 * widening staff's grants, it has removed the reason the split exists.
 */

describe('roleFromClaims', () => {
  it('reads the admin claim', () => {
    expect(roleFromClaims({ admin: true })).toBe('admin');
  });

  it('reads the staff claim', () => {
    expect(roleFromClaims({ staff: true })).toBe('staff');
  });

  /**
   * Every account that exists today carries `{ admin: true }` and nothing
   * else. A role split that locked those out on deploy would be an outage.
   */
  it('leaves every existing admin account an admin', () => {
    expect(roleFromClaims({ admin: true })).toBe('admin');
    expect(roleFromClaims({ admin: true, staff: true })).toBe('admin');
  });

  it('is none for a signed-in customer', () => {
    expect(roleFromClaims({})).toBe('none');
    expect(roleFromClaims(null)).toBe('none');
    expect(roleFromClaims(undefined)).toBe('none');
  });

  /**
   * Claims come from a decoded token, so their shape is not guaranteed. A
   * truthy check would promote anyone whose claim survived a round trip
   * through somewhere careless as the string "false".
   */
  it('promotes nobody on a truthy non-true claim', () => {
    for (const bad of ['true', 'false', 1, {}, [], 'admin']) {
      expect(roleFromClaims({ admin: bad })).toBe('none');
      expect(roleFromClaims({ staff: bad })).toBe('none');
    }
  });
});

describe('can', () => {
  it('lets staff do the daily work', () => {
    for (const c of ['console', 'products:write', 'orders:write', 'returns:write', 'support:write'] as Capability[]) {
      expect(can('staff', c)).toBe(true);
    }
  });

  /**
   * The whole point of the split. Each of these is either hard to undo or
   * commercially sensitive, and none of them is needed to pack a parcel.
   */
  it('keeps the manager-only decisions away from staff', () => {
    expect(can('staff', 'storefront:write')).toBe(false);
    expect(can('staff', 'products:archive')).toBe(false);
    expect(can('staff', 'insights:read')).toBe(false);
    expect(can('staff', 'catalogue:extend')).toBe(false);
  });

  /**
   * Staff cannot type a model — they pick from the catalogue — so asking a
   * manager for a missing one is the only way they can get a new phone
   * listed at all. Taking this away would leave them with no route forward.
   */
  it('lets staff ask for a model but not add one', () => {
    expect(can('staff', 'catalogue:request')).toBe(true);
    expect(can('staff', 'catalogue:extend')).toBe(false);
  });

  it('gives an admin everything staff has', () => {
    for (const c of capabilitiesOf('staff')) expect(can('admin', c)).toBe(true);
  });

  it('gives a customer nothing at all', () => {
    expect(capabilitiesOf('none')).toEqual([]);
    expect(can('none', 'console')).toBe(false);
    expect(can('none', 'products:write')).toBe(false);
  });

  it('refuses a capability no role declares', () => {
    expect(can('admin', 'nonsense' as Capability)).toBe(false);
    expect(can('bogus' as StaffRole, 'console')).toBe(false);
  });
});

describe('roleLabel', () => {
  it('names each role the way the console writes it', () => {
    expect(roleLabel('admin')).toBe('Manager');
    expect(roleLabel('staff')).toBe('Staff');
    expect(roleLabel('none')).toBe('No access');
  });
});

describe('refusalFor', () => {
  /**
   * A refusal that only says "no" sends the person to ask a colleague what
   * happened. Naming the role that would have worked makes it one message.
   */
  it('says which role would have worked for a manager-only action', () => {
    expect(refusalFor('storefront:write')).toMatch(/manager/i);
    expect(refusalFor('products:archive')).toMatch(/manager/i);
  });

  it('stays plain for anything else', () => {
    expect(refusalFor('orders:write')).not.toMatch(/manager/i);
  });
});
