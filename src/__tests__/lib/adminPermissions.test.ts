import { describe, expect, it } from 'vitest';
import { adminPermissionsFromClaims } from '../../lib/adminPermissions';

describe('adminPermissionsFromClaims', () => {
  it('does not grant financial access to a signed-out user or customer', () => {
    expect(adminPermissionsFromClaims(null)).toEqual({ isAdmin: false, role: null, canViewProfit: false });
    expect(adminPermissionsFromClaims({ admin: false, role: 'owner', finance: true }))
      .toEqual({ isAdmin: false, role: null, canViewProfit: false });
  });

  it('keeps operational and support staff out of BP and GP', () => {
    expect(adminPermissionsFromClaims({ admin: true, role: 'operations' }))
      .toEqual({ isAdmin: true, role: 'operations', canViewProfit: false });
    expect(adminPermissionsFromClaims({ admin: true, role: 'support' }))
      .toEqual({ isAdmin: true, role: 'support', canViewProfit: false });
  });

  it('lets the owner and an explicitly appointed finance user see profit', () => {
    expect(adminPermissionsFromClaims({ admin: true, role: 'owner' }))
      .toEqual({ isAdmin: true, role: 'owner', canViewProfit: true });
    expect(adminPermissionsFromClaims({ admin: true, role: 'operations', finance: true }))
      .toEqual({ isAdmin: true, role: 'operations', canViewProfit: true });
  });
});
