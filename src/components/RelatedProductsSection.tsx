import { useMemo } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { useCatalogue } from '../context/CatalogueContext';
import { motion } from 'motion/react';

interface RelatedProductsSectionProps {
  currentProduct: Product;
}

export default function RelatedProductsSection({ currentProduct }: RelatedProductsSectionProps) {
  const { products } = useCatalogue();
  const relatedProducts = useMemo(() => {
    return products.filter(phone => {
      // Exclude current product
      if (phone.id === currentProduct.id) return false;
      
      // Prefer same brand
      if (phone.brand === currentProduct.brand) return true;
      
      // Prefer same category
      if (phone.category === currentProduct.category) return true;
      
      return false;
    }).slice(0, 4); // Show max 4 related products
  }, [currentProduct, products]);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section style={{ paddingTop: 'var(--spacing-32)', paddingBottom: 'var(--spacing-32)', borderTop: '1px solid var(--grey-10)' }}>
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

      {/* Two across on a phone, matching the shop grid. One per row made
          each card a full screen tall: four upsells came to 2,811px, 55% of
          the product page, so a shopper reached the end of someone else's
          phone before the end of the one they opened. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {relatedProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            viewport={{ once: true }}
          >
            {/* compact: two to a row needs the denser card, the same one
                the shop grid uses at this width. */}
            <ProductCard phone={product} compact />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
