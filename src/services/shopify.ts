import { createStorefrontApiClient } from '@shopify/storefront-api-client';

// Initialize Shopify Storefront API client
const client = createStorefrontApiClient({
  storeDomain: import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || '',
  publicAccessToken: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || '',
  apiVersion: '2024-01',
});

// GraphQL query to get all products
const GET_PRODUCTS = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                availableForSale
                quantityAvailable
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          metafields(identifiers: [
            {namespace: "custom", key: "brand"},
            {namespace: "custom", key: "grade"},
            {namespace: "custom", key: "battery_health"},
            {namespace: "custom", key: "warranty_months"},
            {namespace: "custom", key: "return_days"},
            {namespace: "custom", key: "category"},
            {namespace: "custom", key: "specs_display"},
            {namespace: "custom", key: "specs_processor"},
            {namespace: "custom", key: "specs_storage"},
            {namespace: "custom", key: "specs_camera"},
            {namespace: "custom", key: "specs_battery"},
            {namespace: "custom", key: "condition_description"}
          ]) {
            key
            value
          }
        }
      }
    }
  }
`;

// GraphQL query to get product by handle
const GET_PRODUCT_BY_HANDLE = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            availableForSale
            quantityAvailable
            selectedOptions {
              name
              value
            }
          }
        }
      }
      metafields(identifiers: [
        {namespace: "custom", key: "brand"},
        {namespace: "custom", key: "grade"},
        {namespace: "custom", key: "battery_health"},
        {namespace: "custom", key: "warranty_months"},
        {namespace: "custom", key: "return_days"},
        {namespace: "custom", key: "category"},
        {namespace: "custom", key: "specs_display"},
        {namespace: "custom", key: "specs_processor"},
        {namespace: "custom", key: "specs_storage"},
        {namespace: "custom", key: "specs_camera"},
        {namespace: "custom", key: "specs_battery"},
        {namespace: "custom", key: "condition_description"}
      ]) {
        key
        value
      }
    }
  }
`;

// GraphQL mutation to create checkout
const CREATE_CHECKOUT = `
  mutation CreateCheckout($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        webUrl
        lineItems(first: 10) {
          edges {
            node {
              id
              title
              quantity
              variant {
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
      checkoutUserErrors {
        code
        field
        message
      }
    }
  }
`;

// Convert Shopify product to your Product type
function convertShopifyProduct(shopifyProduct: any) {
  const metafields: Record<string, string> = {};
  shopifyProduct.metafields?.forEach((mf: any) => {
    if (mf) metafields[mf.key] = mf.value;
  });

  const images = shopifyProduct.images?.edges?.map((edge: any) => edge.node.url) || [];
  const variants = shopifyProduct.variants?.edges?.map((edge: any) => ({
    id: edge.node.id,
    title: edge.node.title,
    price: parseFloat(edge.node.price.amount),
    originalPrice: edge.node.compareAtPrice ? parseFloat(edge.node.compareAtPrice.amount) : parseFloat(edge.node.price.amount),
    available: edge.node.availableForSale,
    stock: edge.node.quantityAvailable || 0,
    options: edge.node.selectedOptions,
  })) || [];

  return {
    id: shopifyProduct.handle,
    model: shopifyProduct.title,
    brand: metafields.brand || 'Unknown',
    category: metafields.category || 'Phones',
    price: parseFloat(shopifyProduct.priceRange.minVariantPrice.amount),
    originalPrice: shopifyProduct.compareAtPriceRange?.minVariantPrice?.amount 
      ? parseFloat(shopifyProduct.compareAtPriceRange.minVariantPrice.amount)
      : parseFloat(shopifyProduct.priceRange.minVariantPrice.amount),
    grade: metafields.grade || 'Good',
    batteryHealth: parseInt(metafields.battery_health) || 90,
    warrantyMonths: parseInt(metafields.warranty_months) || 12,
    returnDays: parseInt(metafields.return_days) || 30,
    imageUrl: images[0] || '',
    galleryImages: images,
    isCertified: true,
    stock: variants.reduce((sum: number, v: any) => sum + v.stock, 0),
    description: shopifyProduct.description,
    specs: {
      display: metafields.specs_display,
      processor: metafields.specs_processor,
      storage: metafields.specs_storage,
      mainCamera: metafields.specs_camera,
      battery: metafields.specs_battery,
    },
    conditionDescription: metafields.condition_description,
    variants,
  };
}

export const shopifyService = {
  // Get all products
  async getProducts(limit: number = 50) {
    try {
      const response = await client.request(GET_PRODUCTS, {
        variables: { first: limit },
      });
      
      if (response.errors) {
        console.error('Shopify API errors:', response.errors);
        throw new Error('Failed to fetch products from Shopify');
      }

      const products = response.data?.products?.edges?.map((edge: any) => 
        convertShopifyProduct(edge.node)
      ) || [];

      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get single product by handle
  async getProduct(handle: string) {
    try {
      const response = await client.request(GET_PRODUCT_BY_HANDLE, {
        variables: { handle },
      });

      if (response.errors) {
        console.error('Shopify API errors:', response.errors);
        throw new Error('Failed to fetch product from Shopify');
      }

      const product = response.data?.product;
      if (!product) throw new Error('Product not found');

      return convertShopifyProduct(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Create checkout from one or more cart line items
  async createCheckout(lineItems: { variantId: string; quantity: number }[]) {
    try {
      const response = await client.request(CREATE_CHECKOUT, {
        variables: { input: { lineItems } },
      });

      if (response.errors) {
        console.error('Shopify checkout errors:', response.errors);
        throw new Error('Failed to create checkout');
      }

      return response.data?.checkoutCreate?.checkout as { webUrl: string } | null;
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  },

  // Check if Shopify is configured
  isConfigured(): boolean {
    return !!(import.meta.env.VITE_SHOPIFY_STORE_DOMAIN && import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN);
  },
};

export default shopifyService;
