import React from 'react';
import { Link } from 'react-router-dom';
import { X, BarChart3, ShoppingBag, Home, Zap, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_CATEGORIES } from '../data';
import { useUI } from '../context/UIContext';

export default function Sidebar() {
  const { isSidebarOpen, setIsSidebarOpen } = useUI();
  const isOpen = isSidebarOpen;
  const onClose = () => setIsSidebarOpen(false);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

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
            className="fixed inset-0 bg-black/50 z-[80]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-white z-[90] overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Menu</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 p-6 space-y-2">
              {/* Home */}
              <Link
                to="/"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors font-bold"
              >
                <Home size={20} /> Home
              </Link>

              {/* Tools Section */}
              <div className="pt-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 px-4 mb-3">
                  Shopping Tools
                </p>
                <Link
                  to="/compare"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors font-bold"
                >
                  <BarChart3 size={20} /> Compare Devices
                </Link>
                <Link
                  to="/wishlist"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors font-bold"
                >
                  <Heart size={20} /> My Wishlist
                </Link>
              </div>

              {/* Categories */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 px-4 mb-3">
                  Categories
                </p>
                {MOCK_CATEGORIES.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === category.id ? null : category.id
                        )
                      }
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors font-bold text-sm"
                    >
                      <span>{category.name}</span>
                      <span className="text-xs text-slate-400">
                        {expandedCategory === category.id ? '−' : '+'}
                      </span>
                    </button>

                    {/* Subcategories */}
                    <AnimatePresence>
                      {expandedCategory === category.id && category.children && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          {category.children.map((subcategory) => (
                            <Link
                              key={subcategory.id}
                              to={`/products?category=${subcategory.id}`}
                              onClick={onClose}
                              className="flex items-center gap-2 px-8 py-2.5 text-sm text-slate-500 hover:text-blue-600 hover:font-bold transition-colors"
                            >
                              <span className="w-1 h-1 bg-blue-600 rounded-full" />
                              {subcategory.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="border-t border-slate-100 p-6">
              <Link
                to="/products"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors font-bold"
              >
                <ShoppingBag size={18} /> Shop Now
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
