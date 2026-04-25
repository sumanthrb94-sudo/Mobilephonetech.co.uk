import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import TrustBanner from './components/TrustBanner';
import BrandShowcase from './components/BrandShowcase';
import QualityPromise from './components/QualityPromise';
import EcoImpactBlock from './components/EcoImpactBlock';
import HomeFaq from './components/HomeFaq';
import NewsletterSignup from './components/NewsletterSignup';
import TrustSection from './components/TrustSection';
import TestimonialsSection from './components/TestimonialsSection';
import PressLogosStrip from './components/PressLogosStrip';
import ComparisonTool from './components/ComparisonTool';
import CartDrawer from './components/CartDrawer';
import AddedToCartModal from './components/AddedToCartModal';
import CartPage from './components/CartPage';
import TradeInProgram from './components/TradeInProgram';
import WarrantyAndReturns from './components/WarrantyAndReturns';
import CookieBanner from './components/layout/CookieBanner';
import ErrorBoundary from './components/ErrorBoundary';
import MobileBottomNav from './components/layout/MobileBottomNav';
import CheckoutHeader from './components/layout/CheckoutHeader';
import CheckoutFooter from './components/layout/CheckoutFooter';
import AnnouncementBar from './components/layout/AnnouncementBar';
import ScrollToTop from './components/ScrollToTop';
import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { CartProvider, useCart } from './context/CartContext';
import { SearchProvider } from './context/SearchContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import Toast from './components/Toast';
import { useSeo } from './hooks/useSeo';
import { homeSeo } from './utils/seo';

// Lazy load pages for performance
const ProductDetail = lazy(() => import('./components/ProductDetail'));
const ProductsPage = lazy(() => import('./components/ProductsPage'));
const CheckoutFlow = lazy(() => import('./components/CheckoutFlow'));
const WishlistPage = lazy(() => import('./components/WishlistPage'));
const OrderHistoryPage = lazy(() => import('./components/OrderHistoryPage'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/legal/TermsOfService'));
const AboutPage = lazy(() => import('./components/content/AboutPage'));
const SustainabilityPage = lazy(() => import('./components/content/SustainabilityPage'));
const BuyingGuidesPage = lazy(() => import('./components/content/BuyingGuidesPage'));
const FaqPage = lazy(() => import('./components/content/FaqPage'));
const NotFound = lazy(() => import('./components/NotFound'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));

// Loading state component — on-brand skeleton
const PageLoader = () => (
  <div
    style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--grey-0)',
      padding: 'var(--spacing-48) var(--spacing-16)',
    }}
  >
    <div
      style={{
        width: '44px',
        height: '44px',
        border: '3px solid var(--color-brand-subtle)',
        borderTopColor: 'var(--brand-cyan)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
      role="status"
      aria-label="Loading"
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);


/**
 * Homepage — BM spec section order:
 * 1. Trust banner (green strip, scrolls with page)
 * 2. Hero carousel
 * 3. Category grid
 * 4. Featured products
 * 5. Value proposition / Trust section
 * 6. Trade-in programme
 * 7. Warranty & Returns (existing)
 * (Footer is rendered in AppContent below main)
 */
function HomePage() {
  useSeo(homeSeo());
  return (
    <>
      {/* Section 2: Trust Banner — scrollable green strip */}
      <TrustBanner />

      {/* Section 3: Hero Carousel */}
      <Hero />

      {/* Brand-showcase hero panels (iPhone 17, Galaxy S, Fold, Pixel).
          CategoryGrid removed — the top category nav + its dropdowns already
          expose every department, so the grid was duplicate navigation. */}
      <BrandShowcase />

      {/* Section 7: Sustainability / eco narrative — refurb differentiator */}
      <EcoImpactBlock />

      {/* Section 8: Value Proposition / Trust */}
      <TrustSection />

      {/* Press coverage strip */}
      <PressLogosStrip />

      {/* Customer testimonials */}
      <TestimonialsSection />

      {/* Section 9: Trade-In Programme */}
      <TradeInProgram />

      {/* Warranty & Returns */}
      <WarrantyAndReturns />

      {/* FAQ accordion — reduces refurb skepticism right above the footer */}
      <HomeFaq />

      {/* MPM-signature Inspected / Tested / Cleaned strip — moved down from
          just-below-hero to footer-adjacent so product content takes the
          above-the-fold real estate instead. */}
      <QualityPromise />

      {/* Newsletter lead-capture */}
      <NewsletterSignup />
    </>
  );
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

  // Toggle a root class so CSS can strip the mobile-reserved bottom
  // padding (which normally makes room for the fixed tab bar).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('is-checkout', isCheckoutRoute);
    return () => { document.documentElement.classList.remove('is-checkout'); };
  }, [isCheckoutRoute]);

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

      {isCheckoutRoute ? (
        <CheckoutHeader />
      ) : (
        <>
          {/* Fixed header (64px) + Category nav (48px) = 112px */}
          <Navbar onCartClick={() => setIsCartOpen(true)} />
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

      {/*
        Main content — offset by nav height.
        Hero already handles its own padding-top via CSS var(--nav-total).
        Non-hero pages (products, checkout etc.) need top padding.
      */}
      <main id="main-content" style={{ flexGrow: 1 }}>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
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
      <Suspense fallback={null}>
        <AIAssistant />
      </Suspense>
      <Toast />
      <CookieBanner />
      {isCheckoutRoute ? <CheckoutFooter /> : <Footer />}
      {!isCheckoutRoute && <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />}
      <AnnouncementBar />
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
            <CartProvider>
              <SearchProvider>
                <CheckoutProvider>
                  <WishlistProvider>
                    <AppContent />
                  </WishlistProvider>
                </CheckoutProvider>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </UIProvider>
      </MotionConfig>
    </Router>
  );
}
