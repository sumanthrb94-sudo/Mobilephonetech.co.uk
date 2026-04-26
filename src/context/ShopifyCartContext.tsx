import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import shopifyCart from '../services/shopifyCart';

export interface CartItem extends Product {
  quantity: number;
  shopifyVariantId?: string;
  shopifyLineId?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  lastAddedItem: CartItem | null;
  lastAddedQuantity: number;
  clearLastAdded: () => void;
  isLoading: boolean;
  checkoutUrl: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);
  const [lastAddedQuantity, setLastAddedQuantity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Load cart from Shopify on mount
  useEffect(() => {
    async function loadCart() {
      try {
        const cart = await shopifyCart.getCart();
        if (cart?.lines?.edges) {
          const cartItems = cart.lines.edges.map((edge: any) => ({
            id: edge.node.merchandise.product.title.toLowerCase().replace(/\s+/g, '-'),
            model: edge.node.merchandise.product.title,
            brand: 'Unknown', // Would need to fetch product details
            category: 'Phones',
            price: parseFloat(edge.node.merchandise.price.amount),
            originalPrice: parseFloat(edge.node.merchandise.price.amount),
            grade: 'Good',
            batteryHealth: 90,
            warrantyMonths: 12,
            returnDays: 30,
            imageUrl: edge.node.merchandise.product.images?.edges?.[0]?.node?.url || '',
            isCertified: true,
            stock: 10,
            specs: {},
            quantity: edge.node.quantity,
            shopifyVariantId: edge.node.merchandise.id,
            shopifyLineId: edge.node.id,
          }));
          setItems(cartItems);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    loadCart();
  }, []);

  const addToCart = async (product: Product, quantity: number = 1) => {
    setIsLoading(true);
    try {
      // For now, we'll need the Shopify variant ID
      // This would come from the product data when fully integrated
      const variantId = product.variants?.[0]?.id || product.id;
      
      const cart = await shopifyCart.addToCart(variantId, quantity);
      
      if (cart?.checkoutUrl) {
        setCheckoutUrl(cart.checkoutUrl);
      }

      // Update local state
      setItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === product.id);
        if (existingItem) {
          const updated = prevItems.map((item) =
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          setLastAddedItem({ ...product, quantity: existingItem.quantity + quantity });
          return updated;
        }
        setLastAddedItem({ ...product, quantity });
        return [...prevItems, { ...product, quantity }];
      });
      setLastAddedQuantity(quantity);
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Fallback to local cart if Shopify fails
      setItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === product.id);
        if (existingItem) {
          const updated = prevItems.map((item) =
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          setLastAddedItem({ ...product, quantity: existingItem.quantity + quantity });
          return updated;
        }
        setLastAddedItem({ ...product, quantity });
        return [...prevItems, { ...product, quantity }];
      });
      setLastAddedQuantity(quantity);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    setIsLoading(true);
    try {
      const item = items.find((i) => i.id === productId);
      if (item?.shopifyLineId) {
        await shopifyCart.removeFromCart(item.shopifyLineId);
      }
      setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    } catch (error) {
      console.error('Error removing from cart:', error);
      setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    setIsLoading(true);
    try {
      const item = items.find((i) => i.id === productId);
      if (item?.shopifyLineId) {
        await shopifyCart.updateQuantity(item.shopifyLineId, quantity);
      }
      setItems((prevItems) =>
        prevItems.map((item) =
          item.id === productId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      setItems((prevItems) =>
        prevItems.map((item) =
          item.id === productId ? { ...item, quantity } : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = () => {
    shopifyCart.clearCart();
    setItems([]);
    setCheckoutUrl(null);
  };

  const clearLastAdded = () => {
    setLastAddedItem(null);
    setLastAddedQuantity(0);
  };

  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      isCartOpen,
      setIsCartOpen,
      lastAddedItem,
      lastAddedQuantity,
      clearLastAdded,
      isLoading,
      checkoutUrl,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
