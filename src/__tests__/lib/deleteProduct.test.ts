import { describe, it, expect, vi, beforeEach } from 'vitest';

const docData = vi.fn();
const deleteDoc = vi.fn(async () => {});
const listAll = vi.fn(async () => ({ items: [] }));

vi.mock('firebase/firestore', async (orig) => ({
  ...(await orig<typeof import('firebase/firestore')>()),
  doc: (_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` }),
  getDoc: async () => ({ data: docData }),
  deleteDoc: (...a: unknown[]) => deleteDoc(...(a as [])),
}));
vi.mock('firebase/storage', async (orig) => ({
  ...(await orig<typeof import('firebase/storage')>()),
  ref: () => ({}),
  listAll: () => listAll(),
  deleteObject: async () => {},
}));
vi.mock('../../lib/firebase', () => ({
  db: {}, storage: {}, auth: { currentUser: null },
  COL: { products: 'products', productPrivate: 'productPrivate' },
  withAdminRetry: <T,>(fn: () => Promise<T>) => fn(),
}));

const { deleteProduct, usesFirebaseStorage } = await import('../../lib/adminApi');

describe('deleteProduct', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does not touch Firebase Storage for a product with only Cloudinary or no photos', async () => {
    docData.mockReturnValue({ imageUrl: 'https://res.cloudinary.com/x/a.jpg', images: [] });
    await deleteProduct('apple-ipad-10th-gen-64gb');
    expect(listAll).not.toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'products/apple-ipad-10th-gen-64gb' });
  });

  it('deletes the private half too, so no cost record outlives its product', async () => {
    docData.mockReturnValue({ imageUrl: '/assets/x.jpg' });
    await deleteProduct('p');
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'productPrivate/p' });
  });

  it('clears Firebase Storage files first when the product has them', async () => {
    docData.mockReturnValue({ images: ['https://firebasestorage.googleapis.com/v0/b/x/o/p.jpg'] });
    await deleteProduct('p');
    expect(listAll).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('still deletes the product when the Storage cleanup never answers', async () => {
    vi.useFakeTimers();
    docData.mockReturnValue({ images: ['https://firebasestorage.googleapis.com/v0/b/x/o/p.jpg'] });
    listAll.mockImplementationOnce(() => new Promise(() => {}));
    const pending = deleteProduct('p');
    await vi.advanceTimersByTimeAsync(8000);
    await pending;
    expect(deleteDoc).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('spots Firebase Storage addresses anywhere in the document', () => {
    expect(usesFirebaseStorage({ variants: [{ images: ['https://firebasestorage.googleapis.com/x'] }] })).toBe(true);
    expect(usesFirebaseStorage({ imageUrl: '/assets/x.jpg' })).toBe(false);
  });
});
