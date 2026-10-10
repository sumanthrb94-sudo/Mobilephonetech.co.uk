import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalogue } from '../../context/CatalogueContext';
import { matchesPanel } from '../../lib/seriesPanels';
import { isUploadedPhoto } from '../../lib/productImages';
import ProductImage from '../ProductImage';
import type { GuideProductsBlock } from '../../data/guides';
import type { Product } from '../../types';

/** How many products an article shows inline; "See all" covers the rest. */
const GUIDE_RAIL_LIMIT = 4;

/**
 * The products an article block names, as they are in the shop right now:
 * in stock, one per model, photographed ones first, cheapest first within
 * that. An article written today still links to what is for sale next month.
 */
export function guideProducts(catalogue: Product[], block: GuideProductsBlock): Product[] {
  const seen = new Set<string>();
  return catalogue
    .filter(p => p.stock > 0 && matchesPanel(p, block))
    .sort((a, b) => Number(isUploadedPhoto(b.imageUrl)) - Number(isUploadedPhoto(a.imageUrl)) || a.price - b.price)
    .filter(p => {
      const key = `${p.brand} ${p.model}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, GUIDE_RAIL_LIMIT);
}

export default function GuideProducts({ block }: { block: GuideProductsBlock }) {
  const { products } = useCatalogue();
  const items = guideProducts(products, block);
  if (items.length === 0) return null;

  return (
    <aside className="guide-products" aria-label={block.title}>
      <div className="guide-products__head">
        <h3>{block.title}</h3>
        <Link to={block.href}>See all <ArrowRight size={13} aria-hidden="true" /></Link>
      </div>
      <div className="guide-products__grid">
        {items.map(p => (
          <Link key={p.id} to={`/product/${p.id}`} className="guide-products__item">
            <span className="guide-products__photo">
              <ProductImage brand={p.brand} model={p.model} category={p.category} imageUrl={p.imageUrl} alt="" context="thumb" />
            </span>
            <span className="guide-products__name">{p.model}{p.storage ? ` · ${p.storage}` : ''}</span>
            <span className="guide-products__price">
              From £{p.price}
              {p.originalPrice > p.price && <s>£{p.originalPrice} new</s>}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
