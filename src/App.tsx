import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import TrustBanner from './components/TrustBanner';
import FeaturedProducts from './components/FeaturedProducts';
import CategoryGrid from './components/CategoryGrid';
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
import { useLocation } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { SearchProvider } from './context/SearchContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import Toast from './components/Toast';

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
  return (
    <>
      {/* Section 2: Trust Banner — scrollable green strip */}
      <TrustBanner />

      {/* Section 3: Hero Carousel */}
      <Hero />

      {/* Section 4: Category Grid */}
      <CategoryGrid />

      {/* Section 5: Featured Products */}
      <FeaturedProducts />

      {/* Section 5: Value Proposition / Trust */}
      <TrustSection />

      {/* Press coverage strip */}
      <PressLogosStrip />

      {/* Customer testimonials */}
      <TestimonialsSection />

      {/* Section 6: Trade-In Programme */}
      <TradeInProgram />

      {/* Warranty & Returns */}
      <WarrantyAndReturns />
    </>
  );
}

function AppContent() {
  const { isCartOpen, setIsCartOpen, cartCount } = useCart();
  const { pathname } = useLocation();

  // Checkout routes use a minimal header with no brand nav / search /
  // wishlist — the Amazon & BackMarket pattern that keeps the shopper
  // in the funnel. Bottom tab bar is also hidden on those routes so
  // there's no distracting tap-out back to Home / Shop / Wishlist.
  const isCheckoutRoute = pathname.startsWith('/checkout');

  // Toggle a root class so CSS can strip the mobile-reserved bottom
  // padding (which normally makes room for the fixed tab bar).
  React.useEffect(() => {
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

      {/*
        Main content — offset by nav height.
        Hero already handles its own padding-top via CSS var(--nav-total).
        Non-hero pages (products, checkout etc.) need top padding.
      */}
      <main id="main-content" style={{ flexGrow: 1 }}>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"         element={<HomePage />} />
            <Route path="/product/:id" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <ProductDetail />
              </div>
            } />
            <Route path="/products" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <ProductsPage />
              </div>
            } />
            <Route path="/compare"  element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <ComparisonTool />
              </div>
            } />
            <Route path="/cart" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <CartPage />
              </div>
            } />
            <Route path="/checkout" element={
              <div style={{ paddingTop: 'calc(var(--header-h) + 30px)' }}>
                <CheckoutFlow />
              </div>
            } />
            <Route path="/wishlist" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <WishlistPage />
              </div>
            } />
            <Route path="/orders"   element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <OrderHistoryPage />
              </div>
            } />
            <Route path="/privacy"  element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <PrivacyPolicy />
              </div>
            } />
            <Route path="/terms"    element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <TermsOfService />
              </div>
            } />
            <Route path="/about" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <AboutPage />
              </div>
            } />
            <Route path="/sustainability" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <SustainabilityPage />
              </div>
            } />
            <Route path="/guides" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <BuyingGuidesPage />
              </div>
            } />
            <Route path="/guides/:slug" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <BuyingGuidesPage />
              </div>
            } />
            <Route path="/faq" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <FaqPage />
              </div>
            } />
            <Route path="/help" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
                <FaqPage />
              </div>
            } />
          </Routes>
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
    </Router>
  );
}
