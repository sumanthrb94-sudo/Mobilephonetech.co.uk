import { createStorefrontApiClient } from '@shopify/storefront-api-client';

const client = createStorefrontApiClient({
  storeDomain: import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || '',
  publicAccessToken: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || '',
  apiVersion: '2024-01',
});

// Create a cart
const CREATE_CART = `
  mutation CreateCart {
    cartCreate {
      cart {
        id
        checkoutUrl
      }
    }
  }
`;

// Add items to cart
const ADD_TO_CART = `
  mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        lines(first: 10) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                  }
                }
              }
            }
          }
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

// Update cart lines
const UPDATE_CART = `
  mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        lines(first: 10) {
          edges {
            node {
              id
              quantity
            }
          }
        }
        cost {
          totalAmount {
            amount
          }
        }
      }
    }
  }
`;

// Remove from cart
const REMOVE_FROM_CART = `
  mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        lines(first: 10) {
          edges {
            node {
              id
              quantity
            }
          }
        }
        cost {
          totalAmount {
            amount
          }
        }
      }
    }
  }
`;

// Get cart
const GET_CART = `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
      lines(first: 50) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                product {
                  title
                  images(first: 1) {
                    edges {
                      node {
                        url
                      }
                    }
                  }
                }
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
      cost {
        subtotalAmount {
          amount
          currencyCode
        }
        totalAmount {
          amount
          currencyCode
        }
      }
    }
  }
`;

class ShopifyCartService {
  private cartId: string | null = null;

  constructor() {
    // Try to restore cart from localStorage
    this.cartId = localStorage.getItem('shopify_cart_id');
  }

  async createCart() {
    try {
      const response = await client.request(CREATE_CART);
      const cart = response.data?.cartCreate?.cart;
      if (cart?.id) {
        this.cartId = cart.id;
        localStorage.setItem('shopify_cart_id', cart.id);
        return cart;
      }
      throw new Error('Failed to create cart');
    } catch (error) {
      console.error('Error creating cart:', error);
      throw error;
    }
  }

  async addToCart(variantId: string, quantity: number = 1) {
    try {
      if (!this.cartId) {
        await this.createCart();
      }

      const response = await client.request(ADD_TO_CART, {
        variables: {
          cartId: this.cartId,
          lines: [
            {
              merchandiseId: variantId,
              quantity,
            },
          ],
        },
      });

      return response.data?.cartLinesAdd?.cart;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async updateQuantity(lineId: string, quantity: number) {
    try {
      if (!this.cartId) throw new Error('No cart found');

      const response = await client.request(UPDATE_CART, {
        variables: {
          cartId: this.cartId,
          lines: [
            {
              id: lineId,
              quantity,
            },
          ],
        },
      });

      return response.data?.cartLinesUpdate?.cart;
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  }

  async removeFromCart(lineId: string) {
    try {
      if (!this.cartId) throw new Error('No cart found');

      const response = await client.request(REMOVE_FROM_CART, {
        variables: {
          cartId: this.cartId,
          lineIds: [lineId],
        },
      });

      return response.data?.cartLinesRemove?.cart;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  async getCart() {
    try {
      if (!this.cartId) return null;

      const response = await client.request(GET_CART, {
        variables: { cartId: this.cartId },
      });

      return response.data?.cart;
    } catch (error) {
      console.error('Error getting cart:', error);
      return null;
    }
  }

  getCheckoutUrl(): string | null {
    // This will be populated after cart operations
    return null;
  }

  clearCart() {
    this.cartId = null;
    localStorage.removeItem('shopify_cart_id');
  }
}

export const shopifyCart = new ShopifyCartService();
export default shopifyCart;
