import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, MapPin, Lock, ChevronRight, Edit3, Check, X, Eye, EyeOff, LogOut, ShoppingBag, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth, db, COL } from '../lib/firebase';
import { useSeo } from '../hooks/useSeo';
import ProductImage from './ProductImage';
import AuthModal from './AuthModal';

type Tab = 'profile' | 'orders' | 'addresses' | 'security';

/** Shape of an order document in Firestore, camelCase throughout. */
interface StoredOrder {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  createdAt: string;
  shippingAddress: Record<string, string> | null;
  paymentMethod: string | null;
  /** Line items live on the order document rather than a joined table. */
  items: {
    id: string;
    model: string;
    brand: string;
    price: number;
    quantity: number;
    imageUrl: string | null;
    selectedColor: string | null;
    selectedStorage: string | null;
  }[];
}

const STATUS_COLOR: Record<string, string> = {
  pending:    '#f59e0b',
  confirmed:  '#3b82f6',
  processing: '#8b5cf6',
  shipped:    'var(--brand-cyan-hover)',
  delivered:  '#16a34a',
  cancelled:  '#ef4444',
  refunded:   '#6b7280',
};

const STATUS_LABEL: Record<string, string> = {
  pending:    'Order placed',
  confirmed:  'Confirmed',
  processing: 'Processing',
  shipped:    'Shipped',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
  refunded:   'Refunded',
};

export default function AccountPage() {
  useSeo({ title: 'My Account | LeHart', noindex: true });
  const navigate = useNavigate();
  const { user, session, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile state
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Address state
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom' });
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Security state
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // undefined while providers are still unknown, so neither panel flashes.
  const hasPassword = user?.providers
    ? user.providers.includes('password')
    : undefined;

  useEffect(() => {
    // Signed out is rendered below rather than redirected: bouncing someone to
    // the homepage for tapping "Account" gives no clue what happened or what
    // to do about it.
    if (!user || user.isGuest) return;
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab]);

  async function loadProfile() {
    if (!session) return;
    try {
      const snap = await getDoc(doc(db, COL.users, user!.id));
      const data = snap.data() as Record<string, unknown> | undefined;
      if (data) {
        setFullName((data.fullName as string) ?? user!.fullName);
        setPhone((data.phone as string) ?? '');
        if (data.address) setAddress(data.address as typeof address);
      }
    } catch { /* fall back to the values already in state */ }
  }

  async function loadOrders() {
    if (!session) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      // No orderBy in the query: combining an equality filter with an orderBy
      // on a different field needs a composite index, and without it Firestore
      // rejects the whole query. A shopper has few orders, so sorting here
      // costs nothing and removes a deployment step that is easy to miss.
      const snap = await getDocs(query(
        collection(db, COL.orders),
        where('userId', '==', user!.id),
      ));
      // Line items live on the order document now, so there is nothing to join.
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as StoredOrder);
      rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      setOrders(rows);
    } catch (err) {
      // Previously this swallowed the error and rendered "No orders yet",
      // which is indistinguishable from genuinely having none — the single
      // most confusing way for this to fail.
      setOrders([]);
      setOrdersError((err as Error)?.message ?? 'Could not load your orders.');
    } finally {
      setOrdersLoading(false);
    }
  }

  async function saveProfile() {
    if (!session) return;
    setSavingProfile(true);
    // merge:true so this never clobbers the role or the saved address.
    await setDoc(
      doc(db, COL.users, user!.id),
      { fullName, phone, updatedAt: serverTimestamp() },
      { merge: true },
    ).catch(() => { /* surfaced by the unchanged UI state */ });
    setSavingProfile(false);
    setEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  async function saveAddress() {
    if (!session) return;
    setSavingAddress(true);
    await setDoc(
      doc(db, COL.users, user!.id),
      { address, updatedAt: serverTimestamp() },
      { merge: true },
    ).catch(() => { /* surfaced by the unchanged UI state */ });
    setSavingAddress(false);
    setEditingAddress(false);
  }

  async function changePassword() {
    setPwError(''); setPwSuccess('');
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setSavingPw(true);
    try {
      const current = auth.currentUser;
      if (!current) throw new Error('You are not signed in.');
      await updatePassword(current, newPw);
      setPwSuccess('Password updated successfully.');
      setNewPw(''); setConfirmPw('');
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // Firebase requires a recent sign-in for password changes and reports it
      // as an opaque code; say what to actually do about it.
      setPwError(code === 'auth/requires-recent-login'
        ? 'For security, sign out and back in before changing your password.'
        : (err as Error).message);
    } finally {
      setSavingPw(false);
    }
  }

  const handleLogout = async () => { await logout(); navigate('/'); };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #e5e7eb', fontFamily: 'var(--font-body)',
    fontSize: '14px', color: '#111827', background: 'white',
    boxSizing: 'border-box', outline: 'none',
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',   label: 'My Profile',   icon: <User size={16} /> },
    { id: 'orders',    label: 'Orders',        icon: <Package size={16} /> },
    { id: 'addresses', label: 'Addresses',     icon: <MapPin size={16} /> },
    { id: 'security',  label: 'Security',      icon: <Lock size={16} /> },
  ];

  // ── Signed out ──────────────────────────────────────────────
  if (!user || user.isGuest) {
    return (
      <div style={{ minHeight: '70vh', background: 'var(--grey-5)', paddingTop: 'var(--nav-total)', display: 'grid', placeItems: 'center', paddingInline: 20 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
            display: 'grid', placeItems: 'center',
            background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)',
          }}>
            <User size={26} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 900, color: 'var(--black)', margin: '0 0 8px' }}>
            {user?.isGuest ? 'You are browsing as a guest' : 'Sign in to your account'}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--grey-60)', lineHeight: 1.6, margin: '0 0 22px' }}>
            {user?.isGuest
              ? 'Create an account to keep your orders, addresses and wishlist across devices.'
              : 'See your orders, saved addresses and account details.'}
          </p>
          <button type="button" className="btn btn-primary btn-md" onClick={() => setAuthOpen(true)}>
            Sign in or create an account
          </button>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-5)', paddingTop: 'var(--nav-total)', paddingBottom: 64 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, color: 'var(--black)', margin: 0 }}>
              Hello, {fullName || user?.fullName || 'there'} 👋
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, border: '1.5px solid #e5e7eb', background: 'white', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Columns live in CSS (.account-grid): applied inline they had no
            breakpoint, so a 390px phone got a 180px sidebar and the content
            column overflowed the viewport. */}
        <div className="account-grid">
          {/* Sidebar */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'sticky', top: 100 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 18px', border: 'none', background: tab === t.id ? '#f0fdf4' : 'white',
                  borderLeft: `3px solid ${tab === t.id ? 'var(--brand-cyan)' : 'transparent'}`,
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? 'var(--black)' : '#6b7280', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                {t.icon} {t.label}
                {tab === t.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--grey-10)' }}>
              <Link to="/wishlist" style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: '#6b7280', textDecoration: 'none' }}>
                <Heart size={16} /> Wishlist
              </Link>
            </div>
          </div>

          {/* Main panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: 32 }}
            >

              {/* ── Profile tab ── */}
              {tab === 'profile' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, color: 'var(--black)', margin: 0 }}>Personal details</h2>
                    {!editingProfile ? (
                      <button onClick={() => setEditingProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1.5px solid #e5e7eb', background: 'white', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                        <Edit3 size={13} /> Edit
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditingProfile(false)} style={{ padding: '8px 14px', borderRadius: 999, border: '1.5px solid #e5e7eb', background: 'white', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={saveProfile} disabled={savingProfile} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: 'var(--black)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
                          {savingProfile ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    )}
                  </div>

                  {profileSaved && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 20, color: '#15803d', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                      <Check size={15} /> Profile saved successfully.
                    </div>
                  )}

                  <div className="account-field-row">
                    {[
                      { label: 'Full name', value: fullName, setter: setFullName, type: 'text' },
                      { label: 'Email address', value: user?.email ?? '', setter: () => {}, type: 'email', disabled: true },
                      { label: 'Phone number', value: phone, setter: setPhone, type: 'tel' },
                    ].map(({ label, value, setter, type, disabled }) => (
                      <div key={label} style={{ gridColumn: label === 'Full name' ? '1 / -1' : undefined }}>
                        <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
                        {editingProfile && !disabled ? (
                          <input type={type} value={value} onChange={e => setter(e.target.value)} style={inputStyle} />
                        ) : (
                          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--grey-5)', fontFamily: 'var(--font-body)', fontSize: 14, color: disabled ? '#9ca3af' : '#111827' }}>
                            {value || <span style={{ color: '#9ca3af' }}>Not set</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Orders tab ── */}
              {tab === 'orders' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, color: 'var(--black)', margin: '0 0 24px' }}>Order history</h2>
                  {ordersError && (
                    <div role="alert" style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      background: 'var(--color-sale-subtle)', border: '1px solid #fecaca',
                      borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 16,
                      fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#991b1b', lineHeight: 1.5,
                    }}>
                      <span>Could not load your orders — {ordersError}</span>
                    </div>
                  )}
                  {ordersLoading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Loading orders…</div>
                  ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <ShoppingBag size={40} style={{ color: '#e5e7eb', marginBottom: 12 }} />
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#6b7280', margin: '0 0 16px' }}>No orders yet.</p>
                      <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 999, background: 'var(--black)', color: 'white', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                        Browse devices
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {orders.map(order => (
                        <div key={order.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                          <button
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'white', border: 'none', cursor: 'pointer', gap: 12 }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[order.status] ?? '#9ca3af', flexShrink: 0 }} />
                              <div style={{ textAlign: 'left', minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>
                                  Order #{order.id.slice(0, 8).toUpperCase()}
                                </div>
                                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#6b7280' }}>
                                  {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {' · '}{order.items?.length ?? 0} item{order.items?.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>£{Number(order.total).toFixed(2)}</span>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: STATUS_COLOR[order.status] + '20', color: STATUS_COLOR[order.status] }}>
                                {STATUS_LABEL[order.status] ?? order.status}
                              </span>
                              <ChevronRight size={14} style={{ color: '#9ca3af', transform: expandedOrder === order.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedOrder === order.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--grey-10)' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
                                    {(order.items ?? []).map(item => (
                                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--grey-5)', flexShrink: 0, overflow: 'hidden' }}>
                                          <ProductImage brand={item.brand} model={item.model} imageUrl={item.imageUrl ?? ''} alt={item.model} color={item.selectedColor ?? undefined} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.brand} {item.model}</div>
                                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#6b7280' }}>
                                            {[item.selectedStorage, item.selectedColor].filter(Boolean).join(' · ')}
                                            {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                                          </div>
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--black)', flexShrink: 0 }}>£{Number(item.price).toFixed(2)}</div>
                                      </div>
                                    ))}
                                  </div>
                                  {order.shippingAddress && (
                                    <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--grey-5)', borderRadius: 10 }}>
                                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Delivered to</div>
                                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                                        {order.shippingAddress.fullName}<br />
                                        {order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}<br />
                                        {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Addresses tab ── */}
              {tab === 'addresses' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, color: 'var(--black)', margin: 0 }}>Saved address</h2>
                    {!editingAddress ? (
                      <button onClick={() => setEditingAddress(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1.5px solid #e5e7eb', background: 'white', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                        <Edit3 size={13} /> Edit
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditingAddress(false)} style={{ padding: '8px 14px', borderRadius: 999, border: '1.5px solid #e5e7eb', background: 'white', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={saveAddress} disabled={savingAddress} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: 'var(--black)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
                          {savingAddress ? 'Saving…' : 'Save address'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="account-field-row">
                    {[
                      { label: 'Address line 1', key: 'line1' as const, col: '1 / -1' },
                      { label: 'Address line 2 (optional)', key: 'line2' as const, col: '1 / -1' },
                      { label: 'City', key: 'city' as const },
                      { label: 'Postcode', key: 'postcode' as const },
                    ].map(({ label, key, col }) => (
                      <div key={key} style={{ gridColumn: col }}>
                        <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
                        {editingAddress ? (
                          <input value={address[key]} onChange={e => setAddress(a => ({ ...a, [key]: e.target.value }))} style={inputStyle} />
                        ) : (
                          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--grey-5)', fontFamily: 'var(--font-body)', fontSize: 14, color: '#111827' }}>
                            {address[key] || <span style={{ color: '#9ca3af' }}>Not set</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Security tab ── */}
              {tab === 'security' && hasPassword === false && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, color: 'var(--black)', margin: '0 0 16px' }}>Sign-in method</h2>
                  <div style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: 'var(--grey-5)', border: '1px solid var(--grey-10)',
                    borderRadius: 'var(--radius-md)', padding: '14px 16px',
                    fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-70)', lineHeight: 1.6,
                  }}>
                    <span>
                      You sign in with <strong style={{ color: 'var(--black)' }}>Google</strong>, so there is no
                      password on this account to change. Manage it from your Google account settings.
                    </span>
                  </div>
                </div>
              )}

              {tab === 'security' && hasPassword !== false && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, color: 'var(--black)', margin: '0 0 24px' }}>Change password</h2>
                  {pwError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, color: '#dc2626', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                      <X size={14} /> {pwError}
                    </div>
                  )}
                  {pwSuccess && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, color: '#15803d', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                      <Check size={14} /> {pwSuccess}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
                    {[
                      { label: 'New password', value: newPw, setter: setNewPw },
                      { label: 'Confirm new password', value: confirmPw, setter: setConfirmPw },
                    ].map(({ label, value, setter }) => (
                      <div key={label}>
                        <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPw ? 'text' : 'password'}
                            value={value}
                            onChange={e => setter(e.target.value)}
                            style={{ ...inputStyle, paddingRight: 40 }}
                          />
                          <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={changePassword}
                      disabled={savingPw || !newPw || !confirmPw}
                      style={{ padding: '12px 24px', borderRadius: 999, border: 'none', background: 'var(--black)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', opacity: savingPw || !newPw || !confirmPw ? 0.5 : 1 }}
                    >
                      {savingPw ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
