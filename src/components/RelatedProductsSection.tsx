import { useMemo } from 'react';
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
    <section style={{ paddingTop: 'var(--spacing-64)', paddingBottom: 'var(--spacing-64)', borderTop: '1px solid var(--grey-10)' }}>
      <h2
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(22px, 2.5vw, 28px)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--black)',
          marginBottom: 'var(--spacing-32)',
        }}
      >
        You may also like
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {relatedProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            viewport={{ once: true }}
          >
            <ProductCard phone={product} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
