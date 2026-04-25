import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import shopifyService from '../services/shopify';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        
        // Check if Shopify is configured
        if (!shopifyService.isConfigured()) {
          console.warn('Shopify not configured, using mock data');
          // Import mock data as fallback
          const { MOCK_PHONES } = await import('../data');
          setProducts(MOCK_PHONES);
          return;
        }

        const shopifyProducts = await shopifyService.getProducts(100);
        setProducts(shopifyProducts);
      } catch (err) {
        console.error('Error loading products:', err);
        setError('Failed to load products');
        
        // Fallback to mock data
        const { MOCK_PHONES } = await import('../data');
        setProducts(MOCK_PHONES);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return { products, loading, error };
}

export function useProduct(handle: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);

        if (!shopifyService.isConfigured()) {
          console.warn('Shopify not configured, using mock data');
          const { MOCK_PHONES } = await import('../data');
          const found = MOCK_PHONES.find(p => p.id === handle);
          if (found) setProduct(found);
          return;
        }

        const shopifyProduct = await shopifyService.getProduct(handle);
        setProduct(shopifyProduct);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Failed to load product');
        
        // Fallback to mock data
        const { MOCK_PHONES } = await import('../data');
        const found = MOCK_PHONES.find(p => p.id === handle);
        if (found) setProduct(found);
      } finally {
        setLoading(false);
      }
    }

    if (handle) {
      fetchProduct();
    }
  }, [handle]);

  return { product, loading, error };
}

export function useCheckout() {
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createCheckout = useCallback(async (variantId: string, quantity: number = 1) => {
    try {
      setLoading(true);
      
      if (!shopifyService.isConfigured()) {
        console.warn('Shopify not configured');
        return;
      }

      const checkout = await shopifyService.createCheckout(variantId, quantity);
      if (checkout?.webUrl) {
        setCheckoutUrl(checkout.webUrl);
        // Redirect to Shopify checkout
        window.location.href = checkout.webUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkoutUrl, loading, createCheckout };
}
