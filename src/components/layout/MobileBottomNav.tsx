import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Store, Heart, ShoppingBag, UserCircle } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useCart } from '../../context/CartContext';

/**
 * MobileBottomNav — native-feeling tab bar anchored to the bottom edge on
 * phones. Hidden on desktop where the top navbar already covers these
 * destinations. Respects iOS safe-area inset.
 */
export default function MobileBottomNav({ onCartClick }: { onCartClick: () => void }) {
  const { isDesktop } = useBreakpoint();
  const { cartCount } = useCart();
  if (isDesktop) return null;

  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 45,
        background: 'var(--grey-0)',
        borderTop: '1px solid var(--grey-10)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        <Item to="/" label="Home" icon={Home} end />
        <Item to="/products" label="Shop" icon={Store} />
        <Item to="/wishlist" label="Wishlist" icon={Heart} />
        <li>
          <button
            onClick={onCartClick}
            aria-label={`Cart (${cartCount} items)`}
            style={cellStyle}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    borderRadius: '9999px',
                    background: 'var(--brand-cyan)',
                    color: 'var(--grey-0)',
                    fontSize: '10px',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </span>
            <span style={labelStyle}>Cart</span>
          </button>
        </li>
        <Item to="/orders" label="Account" icon={UserCircle} />
      </ul>
    </nav>
  );
}

const cellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  width: '100%',
  padding: '10px 4px 8px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--grey-60)',
  textDecoration: 'none',
  transition: 'color var(--duration-fast)',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '-0.005em',
};

function Item({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ElementType; end?: boolean }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        style={({ isActive }) => ({
          ...cellStyle,
          color: isActive ? 'var(--brand-cyan-hover)' : 'var(--grey-60)',
        })}
      >
        <Icon size={20} />
        <span style={labelStyle}>{label}</span>
      </NavLink>
    </li>
  );
}
