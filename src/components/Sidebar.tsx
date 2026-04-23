import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, BarChart3, ShoppingBag, Home, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_CATEGORIES } from '../data';
import { useUI } from '../context/UIContext';

const linkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--grey-70)',
  textDecoration: 'none',
  transition: 'background var(--duration-fast), color var(--duration-fast)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--grey-40)',
  padding: '0 16px',
  margin: '0 0 8px 0',
};

export default function Sidebar() {
  const { isSidebarOpen, setIsSidebarOpen } = useUI();
  const isOpen = isSidebarOpen;
  const onClose = () => setIsSidebarOpen(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleHover = (e: React.MouseEvent<HTMLElement>, hover: boolean) => {
    const el = e.currentTarget as HTMLElement;
    el.style.background = hover ? 'var(--grey-5)' : 'transparent';
    el.style.color = hover ? 'var(--brand-cyan-hover)' : 'var(--grey-70)';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sidebar-title"
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              height: '100%',
              width: 'min(320px, 85vw)',
              background: 'var(--grey-0)',
              zIndex: 95,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '8px 0 32px rgba(0,0,0,0.08)',
            }}
          >
            {/* Header */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--grey-0)',
                borderBottom: '1px solid var(--grey-10)',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1,
              }}
            >
              <h2 id="sidebar-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0 }}>
                Menu
              </h2>
              <button
                onClick={onClose}
                aria-label="Close menu"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--grey-5)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--grey-70)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Items */}
            <nav style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Link
                to="/"
                onClick={onClose}
                style={linkStyle}
                onMouseEnter={(e) => handleHover(e, true)}
                onMouseLeave={(e) => handleHover(e, false)}
              >
                <Home size={18} /> Home
              </Link>

              {/* Tools Section */}
              <div style={{ paddingTop: '12px' }}>
                <p style={sectionLabelStyle}>Shopping tools</p>
                <Link
                  to="/compare"
                  onClick={onClose}
                  style={linkStyle}
                  onMouseEnter={(e) => handleHover(e, true)}
                  onMouseLeave={(e) => handleHover(e, false)}
                >
                  <BarChart3 size={18} /> Compare devices
                </Link>
                <Link
                  to="/wishlist"
                  onClick={onClose}
                  style={linkStyle}
                  onMouseEnter={(e) => handleHover(e, true)}
                  onMouseLeave={(e) => handleHover(e, false)}
                >
                  <Heart size={18} /> My wishlist
                </Link>
              </div>

              {/* Categories */}
              <div style={{ paddingTop: '16px', marginTop: '8px', borderTop: '1px solid var(--grey-10)' }}>
                <p style={{ ...sectionLabelStyle, paddingTop: '12px' }}>Categories</p>
                {MOCK_CATEGORIES.map((category) => {
                  const expanded = expandedCategory === category.id;
                  return (
                    <div key={category.id}>
                      <button
                        onClick={() => setExpandedCategory(expanded ? null : category.id)}
                        aria-expanded={expanded}
                        style={{
                          ...linkStyle,
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          justifyContent: 'space-between',
                        }}
                        onMouseEnter={(e) => handleHover(e, true)}
                        onMouseLeave={(e) => handleHover(e, false)}
                      >
                        <span>{category.name}</span>
                        <span style={{ fontSize: '13px', color: 'var(--grey-40)' }}>
                          {expanded ? '−' : '+'}
                        </span>
                      </button>

                      <AnimatePresence>
                        {expanded && category.children && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            {category.children.map((subcategory) => (
                              <Link
                                key={subcategory.id}
                                to={`/products?category=${subcategory.id}`}
                                onClick={onClose}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px 16px 10px 40px',
                                  fontFamily: 'var(--font-body)',
                                  fontSize: '13px',
                                  color: 'var(--grey-60)',
                                  textDecoration: 'none',
                                  transition: 'color var(--duration-fast)',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-cyan-hover)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--grey-60)'; }}
                              >
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--brand-cyan)' }} />
                                {subcategory.name}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </nav>

            {/* Footer CTA */}
            <div style={{ borderTop: '1px solid var(--grey-10)', padding: '20px 24px' }}>
              <Link
                to="/products"
                onClick={onClose}
                className="btn btn-primary btn-md btn-full"
                style={{ textDecoration: 'none' }}
              >
                <ShoppingBag size={16} /> Shop now
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
