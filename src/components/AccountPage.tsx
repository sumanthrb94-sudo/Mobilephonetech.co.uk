import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, MapPin, Lock, ChevronRight, ChevronLeft, Edit3, Check, X, Eye, EyeOff, LogOut, ShoppingBag, Heart, LifeBuoy, Truck, RotateCcw, FileText, ShieldCheck, Cookie } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth, db, COL } from '../lib/firebase';
import { useSeo } from '../hooks/useSeo';
import ProductImage from './ProductImage';
import AuthModal from './AuthModal';
import BrandMark from './ui/BrandMark';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { COMPANY, companyDetailsComplete } from '../config/company';
import { lookupPostcode, hasCoordinates, type PostcodePlace } from '../utils/postcodeLookup';
import ReturnFlowModal from './ReturnFlowModal';
import { listMyReturns, isReturnable, RETURN_STATUS_LABEL, WARRANTY_MONTHS } from '../lib/returns';
import type { ReturnItem, ReturnRequest } from '../types';

// Same lazy split as checkout, and for the same reason: Leaflet plus its
// stylesheet is ~42KB gzipped, wanted only by someone who pressed Find
// address on this tab specifically, not by every visit to My Account.
const AddressMap = lazy(() => import('./AddressMap'));

type Tab = 'profile' | 'orders' | 'addresses' | 'security';

/**
 * The links folded in from the site footer, which is hidden below 1024px.
 * They are not decoration: Terms, Privacy and Cookies have to stay reachable
 * from every screen, and the Account tab is one tap from all of them.
 */
const MORE_LINKS: { to: string; label: string; icon: React.ElementType }[] = [
  { to: '/faq',       label: 'Help & FAQ',            icon: LifeBuoy },
  { to: '/returns',   label: 'Returns & warranty',     icon: RotateCcw },
  { to: '/delivery',  label: 'Delivery',               icon: Truck },
  { to: '/terms',     label: 'Terms of service',       icon: FileText },
  { to: '/privacy',   label: 'Privacy policy',         icon: ShieldCheck },
  { to: '/cookies',   label: 'Cookies',                icon: Cookie },
];

/**
 * The case for making an account, on the screen that asks for one.
 *
 * The signed-out panel used to ask and give no reason, which is a form the
 * visitor has to want to fill in before they know what it buys them. Each of
 * these names something they get; none of them names something we keep.
 * Three, not six — a list long enough to scroll is a wall, not an argument.
 */
const GATE_REASONS: { icon: React.ElementType; title: string; detail: string }[] = [
  { icon: Package, title: 'Your orders in one place',   detail: 'Every order and where it has got to, without digging through your email.' },
  { icon: MapPin,  title: 'Addresses already filled in', detail: 'Check out without typing the same postcode again.' },
  { icon: Heart,   title: 'A wishlist that follows you', detail: 'Save it on your phone, find it on your laptop.' },
];

/**
 * Entrance for the signed-out panel: the mark lands, then each line follows
 * it in. Staggered rather than all at once because the eye should arrive at
 * the brand first and the button last, in the order the screen is read.
 *
 * Short and small on purpose — 340ms and 10px. This runs every time the
 * Account tab is tapped while signed out, and anything longer turns a tab
 * into a wait.
 */
const GATE_LIST: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const GATE_ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] } },
};

/* prefers-reduced-motion: the same screen, already arrived. Not a slower
   version of the same slide — that setting is often vestibular, and a gentle
   drift is still drift. */
const GATE_LIST_STILL: Variants = { hidden: {}, shown: {} };
const GATE_ITEM_STILL: Variants = { hidden: { opacity: 1, y: 0 }, shown: { opacity: 1, y: 0 } };

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
  const { isDesktop } = useBreakpoint();

  /**
   * `null` is the phone's menu root — the list of sections, with nothing
   * open. Desktop has no such state: its rail shows every section at once,
   * so something must always be selected. Keeping one state and letting the
   * breakpoint decide what `null` means is why there is no second copy of
   * this screen to drift out of sync.
   */
  const [tab, setTab] = useState<Tab | null>(null);
  const openTab: Tab = tab ?? 'profile';

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
  // Returns already raised, keyed against their order so a customer cannot
  // start a second request for something already in progress — see
  // OrderHistoryPage, which this mirrors. This tab is the one shoppers
  // actually reach (nothing links to /orders), so the return flow has to
  // live here too, not only on that orphaned page.
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [returnOrder, setReturnOrder] = useState<{ id: string; createdAt: string; items: ReturnItem[] } | null>(null);

  // Address state
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom' });
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Postcode lookup, same as checkout's: a union rather than a bag of
  // booleans so "loading and errored" is not a state this can reach.
  type LookupState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'found'; place: PostcodePlace }
    | { status: 'error'; message: string };
  const [addressLookup, setAddressLookup] = useState<LookupState>({ status: 'idle' });
  const [postcodeQuery, setPostcodeQuery] = useState('');

  async function runAddressLookup() {
    const typed = postcodeQuery.trim();
    setAddressLookup({ status: 'loading' });
    const result = await lookupPostcode(typed);
    if (!result.ok) {
      setAddressLookup({ status: 'error', message: result.message });
      return;
    }
    const { place } = result;
    setAddress((a) => ({
      ...a,
      postcode: place.postcode,
      city: place.town || a.city,
      // County has no field of its own here either; line 2 is where it
      // belongs, and only if nothing is already sitting there.
      line2: !a.line2 && place.county && place.county !== place.town ? place.county : a.line2,
    }));
    setAddressLookup({ status: 'found', place });
  }

  // Security state
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Called here, above the signed-out early return, so the hook order is the
  // same on both branches of this component.
  const reduceMotion = useReducedMotion();
  const gateList = reduceMotion ? GATE_LIST_STILL : GATE_LIST;
  const gateItem = reduceMotion ? GATE_ITEM_STILL : GATE_ITEM;

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
    if (openTab === 'orders') { loadOrders(); loadReturns(); }
  }, [openTab]);

  async function loadReturns() {
    if (!user || user.isGuest) { setReturns([]); return; }
    try {
      setReturns(await listMyReturns(user.id));
    } catch {
      setReturns([]);
    }
  }

  const returnFor = (orderId: string) =>
    returns.find(r => r.orderId === orderId && r.status !== 'cancelled' && r.status !== 'rejected');

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

  /** Up to two initials for the header avatar, falling back to the email's
   *  first character so the circle is never empty on a phone-first account
   *  that has no name yet. */
  const initials = (() => {
    const source = (fullName || user?.fullName || '').trim();
    if (source) {
      return source.split(/\s+/).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');
    }
    return (user?.email?.[0] ?? '?').toUpperCase();
  })();

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
      <div
        className="account-gate"
        style={{
          background: 'var(--grey-5)',
          display: 'flex', flexDirection: 'column',
          paddingInline: 20, boxSizing: 'border-box',
        }}
      >
        {/* flex:1 rather than a fixed height: the block sits in the optical
            centre of whatever room is left, and the legal strip below keeps
            its place at the bottom instead of being pushed off. */}
        <motion.div
          style={{ flex: 1, display: 'grid', placeItems: 'center', width: '100%' }}
          variants={gateList}
          initial="hidden"
          animate="shown"
        >
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            {/* The brand, not a stock silhouette. This screen is the first
                thing behind the Account tab and it was introducing the shop
                with a generic Lucide user glyph — the one mark on it that
                belongs to nobody. BrandMark is the same tile the navbar
                draws, the installed icon uses and the boot splash paints, so
                the thing they tapped to open the app is the thing greeting
                them here. Still, not spinning: spinning is how this mark
                says "working", and nothing is loading. */}
            <motion.div variants={gateItem} style={{ marginBottom: 20 }}>
              <BrandMark size="lg" />
            </motion.div>

            <motion.h1
              variants={gateItem}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 900, color: 'var(--black)', margin: '0 0 8px', letterSpacing: '-0.02em' }}
            >
              {user?.isGuest ? 'You are browsing as a guest' : 'Sign in to your account'}
            </motion.h1>
            <motion.p
              variants={gateItem}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--grey-60)', lineHeight: 1.6, margin: '0 0 24px' }}
            >
              {user?.isGuest
                ? 'Create an account to keep your orders, addresses and wishlist across devices.'
                : 'See your orders, saved addresses and account details.'}
            </motion.p>

            {/* What the empty half of this screen is for. The old version
                asked for a sign-in and gave no reason to want one, then left
                126px of grey underneath the ask. Three lines, left-aligned
                because a list is read rather than admired, each naming
                something the visitor gets rather than something we store. */}
            <motion.ul
              variants={gateItem}
              style={{
                listStyle: 'none', margin: '0 0 26px', padding: 16,
                display: 'grid', gap: 14, textAlign: 'left',
                background: 'var(--grey-0)', borderRadius: 14,
                border: '1px solid var(--grey-10)',
              }}
            >
              {GATE_REASONS.map(({ icon: Icon, title, detail }) => (
                <li key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0, width: 34, height: 34, borderRadius: 10,
                      display: 'grid', placeItems: 'center',
                      background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)',
                    }}
                  >
                    <Icon size={17} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, color: 'var(--black)' }}>
                      {title}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-60)', lineHeight: 1.5 }}>
                      {detail}
                    </span>
                  </span>
                </li>
              ))}
            </motion.ul>

            {/* btn-full below 1024px: a centred pill on a phone is a smaller
                target than the thumb arriving at it. */}
            <motion.div variants={gateItem}>
              <button
                type="button"
                className={isDesktop ? 'btn btn-primary btn-md' : 'btn btn-primary btn-md btn-full'}
                onClick={() => setAuthOpen(true)}
              >
                Sign in or create an account
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Phones only: the footer that carries the legal links and the
            registered identity is hidden below 1024px, and a visitor who
            has not signed in never reaches the Help & legal list below.
            Without this a phone visitor had no way to the terms or privacy
            notice from here, and no page telling them who the company is.

            A sibling of the centred block rather than a child of it, so it
            settles at the bottom of the screen where a footer belongs
            instead of riding up and down with the panel above it. */}
        {!isDesktop && (
          <div style={{ marginTop: 28 }}>
            <nav aria-label="Legal" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px' }}>
              {MORE_LINKS.filter(l => /terms|privacy|cookies|returns|delivery/.test(l.to)).map(l => (
                <Link key={l.to} to={l.to} style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--grey-60)' }}>
                  {l.label}
                </Link>
              ))}
            </nav>
            {companyDetailsComplete() && (
              <p className="app-legal" style={{ textAlign: 'center' }}>
                {COMPANY.legalName} · Registered in England &amp; Wales, company no. {COMPANY.companyNumber}
                {' '}· Registered office: {COMPANY.registeredOffice}
                {COMPANY.vatNumber ? ` · VAT ${COMPANY.vatNumber}` : ''}
              </p>
            )}
          </div>
        )}
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  // No paddingTop on the wrapper: the route is wrapped in AnimatedPage, which
  // already offsets by --nav-total. Setting it again put 128px of blank above
  // the avatar on every screen.
  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-5)', paddingBottom: 64 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', boxSizing: 'border-box' }}>

        {/* ── Phone: the menu root ─────────────────────────────────────
            An app's profile tab is a list of places you can go, not four
            sections crammed into a chip row that runs off the screen edge.
            Choosing one pushes it in (below), with a back row to come out —
            so nothing has to shrink to fit 390px. Desktop is untouched: its
            rail shows every section at once and never reaches this branch. */}
        {!isDesktop && tab === null && (
          <div className="app-screen">
            <header className="app-profile">
              <div className="app-profile__avatar" aria-hidden="true">{initials}</div>
              <div className="app-profile__text">
                <h1 className="app-profile__name">{fullName || user?.fullName || 'Your account'}</h1>
                <p className="app-profile__email">{user?.email}</p>
              </div>
            </header>

            <nav className="app-list" aria-label="Account sections">
              {TABS.map(t => (
                <button key={t.id} type="button" className="app-list__row" onClick={() => setTab(t.id)}>
                  <span className="app-list__icon">{t.icon}</span>
                  <span className="app-list__label">{t.label}</span>
                  <ChevronRight size={18} className="app-list__chev" />
                </button>
              ))}
              <Link to="/wishlist" className="app-list__row">
                <span className="app-list__icon"><Heart size={18} /></span>
                <span className="app-list__label">Wishlist</span>
                <ChevronRight size={18} className="app-list__chev" />
              </Link>
            </nav>

            {/* Folded in from the site footer, which the app shell hides
                below 1024px. Terms, Privacy and Cookies have to stay
                reachable, and this keeps them two taps from any screen. */}
            <p className="app-list__heading">Help &amp; legal</p>
            <nav className="app-list" aria-label="Help and legal">
              {MORE_LINKS.map(l => {
                const Icon = l.icon;
                return (
                  <Link key={l.to} to={l.to} className="app-list__row">
                    <span className="app-list__icon"><Icon size={18} /></span>
                    <span className="app-list__label">{l.label}</span>
                    <ChevronRight size={18} className="app-list__chev" />
                  </Link>
                );
              })}
            </nav>
            {/* The registered identity, here because the footer that carries
                it on desktop is hidden on phones. Same source as the footer:
                src/config/company.ts, nothing typed here. */}
            {companyDetailsComplete() && (
              <p className="app-legal">
                {COMPANY.legalName} · Registered in England &amp; Wales, company no. {COMPANY.companyNumber}
                {' '}· Registered office: {COMPANY.registeredOffice}
                {COMPANY.vatNumber ? ` · VAT ${COMPANY.vatNumber}` : ''}
              </p>
            )}

            <button type="button" className="app-list app-list__row app-list__row--danger" onClick={handleLogout}>
              <span className="app-list__icon"><LogOut size={18} /></span>
              <span className="app-list__label">Sign out</span>
            </button>
          </div>
        )}

        {/* ── Phone: a section, pushed in ── */}
        {!isDesktop && tab !== null && (
          <div className="app-topbar">
            <button type="button" className="app-topbar__back" onClick={() => setTab(null)}>
              <ChevronLeft size={20} />
              <span>Account</span>
            </button>
            <h1 className="app-topbar__title">{TABS.find(t => t.id === tab)?.label}</h1>
          </div>
        )}

        {/* Header and rail are the desktop layout. The phone gets the two
            branches above instead, so neither has to be hidden by CSS at a
            width it was never laid out for. */}
        {isDesktop && (
          <div className="account-hero">
            <div className="account-hero__who">
              <div className="account-hero__avatar" aria-hidden="true">{initials}</div>
              <div className="account-hero__text">
                <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(19px,3vw,28px)', fontWeight: 900, color: 'var(--black)', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Hello, {fullName || user?.fullName || 'there'}
                </h1>
                <p className="account-hero__email">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto', padding: '9px 16px', borderRadius: 999, border: '1.5px solid var(--grey-10)', background: 'var(--grey-0)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--grey-70)', cursor: 'pointer' }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}

        {/* Columns live in CSS (.account-grid): applied inline they had no
            breakpoint, so a 390px phone got a 180px sidebar and the content
            column overflowed the viewport. */}
        <div className="account-grid">
          {isDesktop && (
            <nav className="account-tabs" aria-label="Account sections">
              {TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="account-tab"
                  data-active={openTab === t.id}
                  aria-current={openTab === t.id ? 'page' : undefined}
                >
                  {t.icon} {t.label}
                  {openTab === t.id && <ChevronRight size={14} className="account-tab__chevron" />}
                </button>
              ))}
              <Link to="/wishlist" className="account-tab account-tab--link">
                <Heart size={16} /> Wishlist
              </Link>
            </nav>
          )}

          {/* Main panel. On a phone the menu root IS the screen, so the
              panel only exists once a section has been pushed in. */}
          {(isDesktop || tab !== null) && (
          <AnimatePresence mode="wait">
            <motion.div
              key={openTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="account-panel"
            >

              {/* ── Profile tab ── */}
              {openTab === 'profile' && (
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
              {openTab === 'orders' && (
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
                                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--grey-10)' }}>
                                    {(() => {
                                      const existing = returnFor(order.id);
                                      if (existing) {
                                        return (
                                          <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 34,
                                            padding: '0 12px', borderRadius: 999,
                                            background: 'var(--color-brand-subtle)', border: '1px solid rgba(161,98,7,0.25)',
                                            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--brand-cyan-hover)',
                                          }}>
                                            <RotateCcw size={14} />
                                            {existing.id} · {RETURN_STATUS_LABEL[existing.status]}
                                          </span>
                                        );
                                      }
                                      if (!isReturnable(order.createdAt)) {
                                        return (
                                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b7280' }}>
                                            This order is past its {WARRANTY_MONTHS}-month warranty period.
                                          </span>
                                        );
                                      }
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReturnOrder({
                                              id: order.id,
                                              createdAt: order.createdAt,
                                              items: order.items.map(i => ({
                                                productId: i.id,
                                                model: i.model,
                                                brand: i.brand,
                                                quantity: i.quantity,
                                                price: i.price,
                                                imageUrl: i.imageUrl,
                                              })),
                                            });
                                          }}
                                          className="btn btn-secondary btn-md"
                                        >
                                          <RotateCcw size={14} /> Start a return
                                        </button>
                                      );
                                    })()}
                                  </div>
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
              {openTab === 'addresses' && (
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
                  {editingAddress && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Postcode lookup
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                        <input
                          value={postcodeQuery}
                          onChange={(e) => { setPostcodeQuery(e.target.value); if (addressLookup.status !== 'idle') setAddressLookup({ status: 'idle' }); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void runAddressLookup(); } }}
                          placeholder="e.g. SW1A 1AA"
                          autoComplete="postal-code"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => { void runAddressLookup(); }}
                          disabled={addressLookup.status === 'loading'}
                          className="btn btn-secondary btn-md"
                        >
                          {addressLookup.status === 'loading' ? 'Finding…' : 'Find address'}
                        </button>
                      </div>
                      <div aria-live="polite">
                        {addressLookup.status === 'error' && (
                          <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-sale)', margin: '0 0 12px 0' }}>
                            {addressLookup.message}
                          </p>
                        )}
                        {addressLookup.status === 'found' && (
                          <div style={{ marginBottom: 12 }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-70)', margin: '0 0 8px 0' }}>
                              Found <strong style={{ color: 'var(--black)' }}>{addressLookup.place.postcode}</strong>
                              {addressLookup.place.town ? <> — {addressLookup.place.town}</> : null}
                              . Add your house number and street below.
                            </p>
                            {hasCoordinates(addressLookup.place) && (
                              <Suspense fallback={<div style={{ height: 170, borderRadius: 'var(--radius-lg)', background: 'var(--grey-5)', border: '1px solid var(--grey-20)' }} />}>
                                <AddressMap
                                  latitude={addressLookup.place.latitude}
                                  longitude={addressLookup.place.longitude}
                                  label={addressLookup.place.postcode}
                                />
                              </Suspense>
                            )}
                          </div>
                        )}
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-50)', margin: 0 }}>
                        Checks your postcode and fills in the town and county. Your house number and street are yours to add.
                      </p>
                    </div>
                  )}
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
              {openTab === 'security' && hasPassword === false && (
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

              {openTab === 'security' && hasPassword !== false && (
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
          )}
        </div>
      </div>
      <ReturnFlowModal
        orderId={returnOrder?.id ?? ''}
        orderDate={returnOrder?.createdAt ?? new Date().toISOString()}
        items={returnOrder?.items ?? []}
        isOpen={!!returnOrder}
        onClose={() => setReturnOrder(null)}
        onCreated={loadReturns}
      />
    </div>
  );
}
