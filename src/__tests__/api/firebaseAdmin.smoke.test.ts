import { describe, it, expect } from 'vitest';

// Deliberately NOT mocked: this exercises the real firebase-admin import path.
describe('api/_firebaseAdmin (real module)', () => {
  it('returns null instead of throwing when credentials are absent', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    const mod = await import('../../../api/_firebaseAdmin.js');
    await expect(mod.adminDb()).resolves.toBeNull();
    expect(mod.getAdminInitError()).toMatch(/not set/i);
  });

  it('reports a parse failure rather than crashing', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = 'this-is-not-valid-base64-or-json!!';
    const mod = await import('../../../api/_firebaseAdmin.js');
    await expect(mod.adminDb()).resolves.toBeNull();
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
  });
});
