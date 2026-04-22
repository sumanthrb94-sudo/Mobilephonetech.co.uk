import React, { useMemo } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { MOCK_PHONES } from '../data';
import { motion } from 'motion/react';

interface RelatedProductsSectionProps {
  currentProduct: Product;
}

export default function RelatedProductsSection({ currentProduct }: RelatedProductsSectionProps) {
  const relatedProducts = useMemo(() => {
    return MOCK_PHONES.filter(phone => {
      // Exclude current product
      if (phone.id === currentProduct.id) return false;
      
      // Prefer same brand
      if (phone.brand === currentProduct.brand) return true;
      
      // Prefer same category
      if (phone.category === currentProduct.category) return true;
      
      return false;
    }).slice(0, 4); // Show max 4 related products
  }, [currentProduct]);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 border-t border-slate-100">
      <h3 className="text-2xl font-black text-slate-900 mb-8">Related Products</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {relatedProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <ProductCard phone={product} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
