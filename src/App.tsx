import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
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
import React from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { SearchProvider } from './context/SearchContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';

function HomePage() {
  return (
    <>
      <Hero />
      <div id="categories">
        <CategoryGrid />
      </div>
      <div id="products">
        <FeaturedProducts />
      </div>
      <div id="compare">
        <ComparisonTool />
      </div>
      <TrustSection />
      <TradeInProgram />
      <WarrantyAndReturns />
    </>
  );
}

function AppContent() {
  const { isCartOpen, setIsCartOpen } = useCart();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg relative">
      <Navbar onCartClick={() => setIsCartOpen(true)} onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/compare" element={<ComparisonTool />} />
          <Route path="/checkout" element={<CheckoutFlow />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
        </Routes>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AIAssistant />
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
