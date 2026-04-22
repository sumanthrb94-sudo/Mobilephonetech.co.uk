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
import AIAssistant from './components/AIAssistant';
import CartDrawer from './components/CartDrawer';
import ProductDetail from './components/ProductDetail';
import TradeInProgram from './components/TradeInProgram';
import WarrantyAndReturns from './components/WarrantyAndReturns';
import ProductsPage from './components/ProductsPage';
import CheckoutFlow from './components/CheckoutFlow';
import WishlistPage from './components/WishlistPage';
import OrderHistoryPage from './components/OrderHistoryPage';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import CookieBanner from './components/layout/CookieBanner';
import React from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { SearchProvider } from './context/SearchContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';

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
      <div id="categories">
        <CategoryGrid />
      </div>

      {/* Section 5: Featured Products */}
      <div id="products">
        <FeaturedProducts />
      </div>

      {/* Comparison Tool */}
      <div id="compare">
        <ComparisonTool />
      </div>

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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      {/* Sidebar (mobile alternative to category nav) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/*
        Main content — offset by nav height.
        Hero already handles its own padding-top via CSS var(--nav-total).
        Non-hero pages (products, checkout etc.) need top padding.
      */}
      <main style={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/product/:id" element={
            /* Product detail pages need top padding for fixed nav */
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
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AIAssistant />
      <CookieBanner />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
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
    </Router>
  );
}
