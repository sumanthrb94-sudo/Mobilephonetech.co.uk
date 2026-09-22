import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { trackPageView } from './lib/analytics';
import { lazyRoute } from './lib/lazyRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Sidebar from './components/Sidebar';
import ComparisonTool from './components/ComparisonTool';
import CartDrawer from './components/CartDrawer';
import AddedToCartModal from './components/AddedToCartModal';
import CartPage from './components/CartPage';
import CookieBanner from './components/layout/CookieBanner';
import ErrorBoundary from './components/ErrorBoundary';
import MobileBottomNav from './components/layout/MobileBottomNav';
import CheckoutHeader from './components/layout/CheckoutHeader';
import CheckoutFooter from './components/layout/CheckoutFooter';
import AnnouncementBar from './components/layout/AnnouncementBar';
import OfflineNotice from './components/OfflineNotice';
import PreviewBanner from './components/layout/PreviewBanner';
import ScrollToTop from './components/ScrollToTop';
import { Suspense, useEffect } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { CartProvider, useCart } from './context/CartContext';
import { SearchProvider } from './context/SearchContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { CatalogueProvider } from './context/CatalogueContext';
import Toast from './components/Toast';
import { PageLoading } from './components/ui/Loading';
import { useSeo } from './hooks/useSeo';
import { homeSeo } from './utils/seo';
import HomeSections from './components/HomeSections';

// Lazy load pages for performance
const ProductDetail = lazyRoute(() => import('./components/ProductDetail'));
const ProductsPage = lazyRoute(() => import('./components/ProductsPage'));
const CheckoutFlow = lazyRoute(() => import('./components/CheckoutFlow'));
const WishlistPage = lazyRoute(() => import('./components/WishlistPage'));
const OrderHistoryPage = lazyRoute(() => import('./components/OrderHistoryPage'));
const PrivacyPolicy = lazyRoute(() => import('./components/legal/PrivacyPolicy'));
const TermsOfService = lazyRoute(() => import('./components/legal/TermsOfService'));
const ReturnsPolicy = lazyRoute(() => import('./components/legal/ReturnsPolicy'));
const DeliveryPolicy = lazyRoute(() => import('./components/legal/DeliveryPolicy'));
const CookiePolicy = lazyRoute(() => import('./components/legal/CookiePolicy'));
const AboutPage = lazyRoute(() => import('./components/content/AboutPage'));
const SustainabilityPage = lazyRoute(() => import('./components/content/SustainabilityPage'));
const BuyingGuidesPage = lazyRoute(() => import('./components/content/BuyingGuidesPage'));
const FaqPage = lazyRoute(() => import('./components/content/FaqPage'));
const NotFound = lazyRoute(() => import('./components/NotFound'));
const AIAssistant = lazyRoute(() => import('./components/AIAssistant'));
const SupportChat = lazyRoute(() => import('./components/SupportChat'));
const AccountPage = lazyRoute(() => import('./components/AccountPage'));
// Admin console — lazy so the back-store bundle never ships to shoppers.
const AdminRoute = lazyRoute(() => import('./components/admin/AdminRoute'));
const AdminLayout = lazyRoute(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazyRoute(() => import('./components/admin/DashboardPage'));
const OrdersPage = lazyRoute(() => import('./components/admin/OrdersPage'));
const InventoryPage = lazyRoute(() => import('./components/admin/InventoryPage'));
const BannersPage = lazyRoute(() => import('./components/admin/BannersPage'));
const HomeLayoutPage = lazyRoute(() => import('./components/admin/HomeLayoutPage'));
const SeriesPage = lazyRoute(() => import('./components/admin/SeriesPage'));
const ReturnsPage = lazyRoute(() => import('./components/admin/ReturnsPage'));
const AnalyticsPage = lazyRoute(() => import('./components/admin/AnalyticsPage'));
const SupportInbox = lazyRoute(() => import('./components/admin/SupportInbox'));
const ProductEditor = lazyRoute(() => import('./components/admin/ProductEditor'));


/**
 * Homepage.
 *
 * Which blocks appear and in what order is staff-editable from /admin/home —
 * the running order and the components it renders live in HomeSections.
 */
function HomePage() {
  useSeo(homeSeo());
  return <HomeSections />;
}

/**
 * AnimatedPage — page-level fade/slide transition wrapper.
 * Applied to every route so route changes feel coordinated, not abrupt.
 * Respects prefers-reduced-motion via motion's useReducedMotion: when
 * set, the page just appears in place instead of sliding.
 */
function AnimatedPage({ children, paddingTop }: { children: React.ReactNode; paddingTop?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.2, 0, 0, 1] }}
      style={{ paddingTop }}
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const { isCartOpen, setIsCartOpen, cartCount } = useCart();
  const location = useLocation();
  const isCheckoutRoute = location.pathname.startsWith('/checkout');
  // The admin console keeps the navbar (admins still browse the shop) but drops
  // the marketing footer and the shopper tab bar, which are only noise there.
  const isAdminRoute = location.pathname.startsWith('/admin');

  // One page view per navigation. Counts only — no cookie, no identifier, so
  // this measures every visitor rather than only those who accept a banner.
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  // Toggle a root class so CSS can strip the mobile-reserved bottom
  // padding (which normally makes room for the fixed tab bar).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('is-checkout', isCheckoutRoute);
    return () => { document.documentElement.classList.remove('is-checkout'); };
  }, [isCheckoutRoute]);

  // Below 1024px the trust strip is not fixed chrome (see APP SHELL in
  // index.css); it renders inline on Home only. CSS needs to know which
  // route it is on, and a root class is the one signal available to the
  // fixed-position rules that live outside any component.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('is-home', location.pathname === '/');
    return () => { document.documentElement.classList.remove('is-home'); };
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--grey-0)',
        position: 'relative',
      }}
    >
      {/* Keyboard skip link — becomes visible on focus */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* aria-live cart announcer — screen readers hear when the count changes */}
      <div role="status" aria-live="polite" className="sr-only">
        {cartCount > 0 ? `Cart contains ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart is empty'}
      </div>

      {/* Above every branch, checkout included: the person furthest into the
          flow is the one who most needs telling. */}
      <PreviewBanner />

      {isCheckoutRoute ? (
        <CheckoutHeader />
      ) : (
        <>
          {/* Fixed header (64px) + Category nav (48px) = 112px */}
          <Navbar />
          {/* Sidebar (mobile alternative to category nav) */}
          <Sidebar />
        </>
      )}

      {/* Skip link — WCAG 2.4.1. Visible only on keyboard focus. */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '50%',
          top: '8px',
          transform: 'translate(-50%, -120%)',
          padding: '10px 18px',
          background: 'var(--black)',
          color: 'var(--grey-0)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: '14px',
          zIndex: 200,
          textDecoration: 'none',
          transition: 'transform var(--duration-fast) var(--ease-default)',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translate(-50%, 0)'; }}
        onBlur={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translate(-50%, -120%)'; }}
      >
        Skip to main content
      </a>

      {/* Losing signal must not cost the visitor the page they are on, so
          this is a bar under the app bar rather than a screen over it. */}
      <OfflineNotice />

      {/* Trust strip. Fixed to the bottom edge on desktop, where DOM order
          does not matter; below 1024px it un-pins and renders here, in the
          flow, directly under the app bar on Home. Mounted above <main> for
          exactly that reason — pinned chrome can sit anywhere, inline
          content cannot. */}
      {!isAdminRoute && <AnnouncementBar />}

      {/*
        Main content — offset by nav height.
        Hero already handles its own padding-top via CSS var(--nav-total).
        Non-hero pages (products, checkout etc.) need top padding.
      */}
      <main id="main-content" style={{ flexGrow: 1 }}>
        <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <ProductDetail />
                </AnimatedPage>
              } />
              <Route path="/products" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <ProductsPage />
                </AnimatedPage>
              } />
              <Route path="/compare" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <ComparisonTool />
                </AnimatedPage>
              } />
              <Route path="/cart" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <CartPage />
                </AnimatedPage>
              } />
              <Route path="/checkout" element={
                <AnimatedPage paddingTop="calc(var(--header-h) + 30px)">
                  <CheckoutFlow />
                </AnimatedPage>
              } />
              <Route path="/wishlist" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <WishlistPage />
                </AnimatedPage>
              } />
              <Route path="/orders" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <OrderHistoryPage />
                </AnimatedPage>
              } />
              <Route path="/privacy" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <PrivacyPolicy />
                </AnimatedPage>
              } />
              <Route path="/terms" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <TermsOfService />
                </AnimatedPage>
              } />
              <Route path="/returns" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <ReturnsPolicy />
                </AnimatedPage>
              } />
              <Route path="/delivery" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <DeliveryPolicy />
                </AnimatedPage>
              } />
              <Route path="/cookies" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <CookiePolicy />
                </AnimatedPage>
              } />
              <Route path="/about" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <AboutPage />
                </AnimatedPage>
              } />
              <Route path="/sustainability" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <SustainabilityPage />
                </AnimatedPage>
              } />
              <Route path="/guides" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <BuyingGuidesPage />
                </AnimatedPage>
              } />
              <Route path="/guides/:slug" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <BuyingGuidesPage />
                </AnimatedPage>
              } />
              <Route path="/faq" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <FaqPage />
                </AnimatedPage>
              } />
              <Route path="/help" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <FaqPage />
                </AnimatedPage>
              } />
              <Route path="/account" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <AccountPage />
                </AnimatedPage>
              } />

              {/* Admin console. The outer AdminRoute wraps the layout rather
                  than each child, so the "may you see this at all" check runs
                  once for the whole section.

                  The manager-only pages are wrapped again, individually. They
                  are the ones that decide what every visitor sees on the shop
                  front, or that show what stock cost us — see
                  src/lib/adminRoles.ts. Nesting the guard rather than hiding
                  the nav link matters: a staff member who has the URL, or a
                  bookmark from before their role changed, gets the same
                  refusal as one who clicked. */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="banners" element={
                  <AdminRoute capability="storefront:write"><BannersPage /></AdminRoute>
                } />
                <Route path="home" element={
                  <AdminRoute capability="storefront:write"><HomeLayoutPage /></AdminRoute>
                } />
                <Route path="series" element={
                  <AdminRoute capability="storefront:write"><SeriesPage /></AdminRoute>
                } />
                <Route path="inventory/new" element={<ProductEditor />} />
                <Route path="inventory/:id" element={<ProductEditor />} />
                <Route path="analytics" element={
                  <AdminRoute capability="insights:read"><AnalyticsPage /></AdminRoute>
                } />
                <Route path="returns" element={<ReturnsPage />} />
                <Route path="support" element={<SupportInbox />} />
              </Route>

              {/* Wildcard — catches every unmatched URL so a typo
                  never lands on a blank body. Emits noindex via useSeo. */}
              <Route path="*" element={
                <AnimatedPage paddingTop="var(--nav-total)">
                  <NotFound />
                </AnimatedPage>
              } />
            </Routes>
          </AnimatePresence>
        </Suspense>
        </ErrorBoundary>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AddedToCartModal />
      {/* The shopping assistant is for shoppers. In the console it is not just
          irrelevant — its floating bubble sits over the row action buttons.

          Off unless VITE_AI_ASSISTANT is "true". It is the only Gemini spend on
          the live site and improvises product advice under the brand, so it
          stays dark for launch and turns on with one Vercel env var — no code
          change — once the bill and the answers can be watched. Human support
          below is unaffected. */}
      {!isAdminRoute && import.meta.env.VITE_AI_ASSISTANT === 'true' && (
        <Suspense fallback={null}>
          <AIAssistant />
        </Suspense>
      )}
      {/* Human support, separate from the AI advisor: the assistant answers
          product questions, this reaches a person about an order. */}
      {!isAdminRoute && !isCheckoutRoute && (
        <Suspense fallback={null}>
          <SupportChat />
        </Suspense>
      )}
      <Toast />
      <CookieBanner />
      {isCheckoutRoute ? <CheckoutFooter /> : isAdminRoute ? null : <Footer />}
      {!isCheckoutRoute && !isAdminRoute && <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />}
      {/* Same again for the trust strip: delivery and returns promises are a
          shopper cue, and pinned to the bottom it covers the last table row. */}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <MotionConfig reducedMotion="user">
        <UIProvider>
          <AuthProvider>
            <CatalogueProvider>
              <CartProvider>
                <SearchProvider>
                  <CheckoutProvider>
                    <WishlistProvider>
                      <AppContent />
                    </WishlistProvider>
                  </CheckoutProvider>
                </SearchProvider>
              </CartProvider>
            </CatalogueProvider>
          </AuthProvider>
        </UIProvider>
      </MotionConfig>
    </Router>
  );
}
