import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from './ProductCard';
import { Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function WishlistPage() {
  const { items, clearWishlist } = useWishlist();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Your Wishlist</h1>
          <p className="text-lg text-slate-500 font-medium">
            {items.length === 0 ? 'Your wishlist is empty' : `${items.length} item${items.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No items in your wishlist</h3>
            <p className="text-slate-500 font-medium mb-6">Start adding products to save them for later</p>
            <button
              onClick={() => navigate('/products')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </button>
          </motion.div>
        ) : (
          <>
            <div className="mb-8 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600">
                Showing <span className="text-slate-900">{items.length}</span> saved item{items.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={clearWishlist}
                className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                Clear Wishlist
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.map((product) => (
                <ProductCard key={product.id} phone={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
