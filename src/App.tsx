import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import TrustBanner from './components/TrustBanner';
import FeaturedProducts from './components/FeaturedProducts';
import CategoryGrid from './components/CategoryGrid';
import TrustSection from './components/TrustSection';
import ComparisonTool from './components/ComparisonTool';
import CartDrawer from './components/CartDrawer';
import TradeInProgram from './components/TradeInProgram';
import WarrantyAndReturns from './components/WarrantyAndReturns';
import CookieBanner from './components/layout/CookieBanner';
import { Suspense, lazy } from 'react';
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

      {/* Section 6: Trade-In Programme */}
      <TradeInProgram />

      {/* Warranty & Returns */}
      <WarrantyAndReturns />
    </>
  );
}

function AppContent() {
  const { isCartOpen, setIsCartOpen } = useCart();

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
      {/* Fixed header (64px) + Category nav (48px) = 112px */}
      <Navbar
        onCartClick={() => setIsCartOpen(true)}
      />

      {/* Sidebar (mobile alternative to category nav) */}
      <Sidebar />

      {/*
        Main content — offset by nav height.
        Hero already handles its own padding-top via CSS var(--nav-total).
        Non-hero pages (products, checkout etc.) need top padding.
      */}
      <main style={{ flexGrow: 1 }}>
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
            <Route path="/checkout" element={
              <div style={{ paddingTop: 'var(--nav-total)' }}>
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
          </Routes>
        </Suspense>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <Suspense fallback={null}>
        <AIAssistant />
      </Suspense>
      <Toast />
      <CookieBanner />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
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
