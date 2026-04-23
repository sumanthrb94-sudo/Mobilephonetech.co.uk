import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import ProductCard from './ProductCard';
import { Heart, ArrowLeft, Bell, BellRing, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Breadcrumbs from './ui/Breadcrumbs';

const ALERTS_KEY = 'mobiletech:price-alerts';

function loadAlerts(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || '{}'); } catch { return {}; }
}
function saveAlerts(map: Record<string, boolean>) {
  try { localStorage.setItem(ALERTS_KEY, JSON.stringify(map)); } catch {}
}

/**
 * WishlistPage — saved-for-later collection with per-item "alert me on price
 * drop" toggle + "move all to cart" bulk action. Price-drop alerts persist to
 * localStorage (mocks a notification subscription).
 */
export default function WishlistPage() {
  const { items, clearWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Record<string, boolean>>(() => loadAlerts());

  useEffect(() => { saveAlerts(alerts); }, [alerts]);

  const toggleAlert = (id: string) => {
    setAlerts((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      showToast(next[id] ? 'Price drop alert on' : 'Price drop alert off', next[id] ? 'success' : 'info');
      return next;
    });
  };

  const moveAllToCart = () => {
    if (items.length === 0) return;
    items.forEach((p) => addToCart(p, 1));
    items.forEach((p) => removeFromWishlist(p.id));
    showToast(`${items.length} item${items.length === 1 ? '' : 's'} moved to cart`, 'success');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>

        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />

        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-32)' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              color: 'var(--grey-50)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '0', marginBottom: 'var(--spacing-24)'
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'var(--black)', lineHeight: 1.1, marginBottom: '12px', letterSpacing: '-0.03em' }}>
            Your wishlist
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', maxWidth: '440px' }}>
            {items.length === 0 ? 'Nothing saved yet.' : `${items.length} item${items.length !== 1 ? 's' : ''} saved for later.`}
          </p>
        </div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 'var(--spacing-80) 0', textAlign: 'center'
            }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--grey-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-24)' }}>
              <Heart size={32} style={{ color: 'var(--grey-30)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>
              No items in your wishlist
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', marginBottom: 'var(--spacing-32)' }}>
              Heart any product to save it here.
            </p>
            <button onClick={() => navigate('/products')} className="btn btn-primary btn-md">
              Browse products
            </button>
          </motion.div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-24)', paddingBottom: 'var(--spacing-16)', borderBottom: '1px solid var(--grey-10)', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', margin: 0 }}>
                Showing <strong style={{ color: 'var(--black)', fontWeight: 700 }}>{items.length}</strong> saved item{items.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={moveAllToCart} className="btn btn-primary btn-sm">
                  <ShoppingBag size={14} /> Move all to cart
                </button>
                <button
                  onClick={clearWishlist}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                    color: 'var(--color-sale)',
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--spacing-24)' }}>
              {items.map((product) => (
                <div key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ProductCard phone={product} />
                  <button
                    onClick={() => toggleAlert(product.id)}
                    aria-pressed={!!alerts[product.id]}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: alerts[product.id] ? 'var(--color-brand-subtle)' : 'var(--grey-5)',
                      color: alerts[product.id] ? 'var(--brand-cyan-hover)' : 'var(--grey-60)',
                      border: `1px solid ${alerts[product.id] ? 'rgba(0, 186, 219, 0.3)' : 'var(--grey-10)'}`,
                      borderRadius: 'var(--radius-full)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {alerts[product.id] ? <BellRing size={12} /> : <Bell size={12} />}
                    {alerts[product.id] ? 'Price drop alert on' : 'Alert me on price drop'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
