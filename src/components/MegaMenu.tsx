import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { MOCK_CATEGORIES } from '../data';
import { Link } from 'react-router-dom';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MegaMenu({ isOpen, onClose }: MegaMenuProps) {
  const mainCategories = MOCK_CATEGORIES;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-2xl z-40"
          onMouseLeave={onClose}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-4 gap-8">
              {mainCategories.map((category) => (
                <div key={category.id} className="space-y-4">
                  {/* Main Category */}
                  <Link
                    to={`/products?category=${category.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 group-hover:text-blue-600 transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {category.productCount} products
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </Link>

                  {/* Subcategories */}
                  {category.children && category.children.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      {category.children.map((subcategory) => (
                        <Link
                          key={subcategory.id}
                          to={`/products?category=${subcategory.id}`}
                          onClick={onClose}
                          className="block text-sm text-slate-600 hover:text-blue-600 hover:font-bold transition-colors"
                        >
                          {subcategory.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Category Image */}
                  {category.imageUrl && (
                    <Link
                      to={`/products?category=${category.id}`}
                      onClick={onClose}
                      className="block mt-4 rounded-lg overflow-hidden h-32 cursor-pointer group"
                    >
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
