import { Product, Category } from './types';

// Brand logo URLs for fallback
const BRAND_LOGOS: Record<string, string> = {
  'Apple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1667px-Apple_logo_black.svg.png',
  'Samsung': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/2560px-Samsung_Logo.svg.png',
  'Google': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/2048px-Google_%22G%22_Logo.svg.png',
  'OnePlus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/OnePlus_logo.svg/2560px-OnePlus_logo.svg.png',
  'Motorola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Motorola_Logo_2023.svg/2560px-Motorola_Logo_2023.svg.png',
  'Sony': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sony_logo.svg/2560px-Sony_logo.svg.png',
  'Microsoft': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/2048px-Microsoft_logo.svg.png',
  'Nintendo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/2560px-Nintendo.svg.png',
  'Meta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/2560px-Meta_Platforms_Inc._logo.svg.png',
  'Dell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Dell_Logo.svg/2560px-Dell_Logo.svg.png',
  'Lenovo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Lenovo_Global_Corporate_Logo.png/2560px-Lenovo_Global_Corporate_Logo.png',
  'VIDVIE': '/assets/cat-accessories.png',
};

// Map product IDs to existing real images
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // Apple iPhones
  'apple-iphone-15-pro-max': '/assets/iphone-15-pro-max.png',
  'apple-iphone-14-pro': '/assets/iphone-14-pro.png',
  'apple-iphone-13': '/assets/iphone-13.png',
  'apple-iphone-12': '/assets/iphone-12.png',
  'apple-iphone-12-pro': '/assets/iphone-12-pro.png',
  'apple-iphone-11': '/assets/iphone-11.png',
  
  // Samsung
  'samsung-s24-ultra': '/assets/samsung-s24-ultra.png',
  'samsung-s23-ultra': '/assets/samsung-s23-ultra.png',
  'samsung-s22': '/assets/samsung-s22.png',
  'samsung-s21-fe': '/assets/samsung-s21-fe.png',
  
  // Google Pixel
  'google-pixel-8-pro': '/assets/pixel-8-pro.png',
  'google-pixel-7a': '/assets/pixel-7a.png',
  'google-pixel-6': '/assets/pixel-6.png',
  
  // OnePlus
  'oneplus-12': '/assets/oneplus-12.png',
  'oneplus-11': '/assets/oneplus-11.png',
  'oneplus-9-pro': '/assets/oneplus-9-pro.png',
  
  // Motorola
  'motorola-edge-40': '/assets/motorola-edge-40.png',
  'motorola-g84': '/assets/motorola-g84.png',
};

export function getProductImage(product: Product): string {
  // Check if we have a real image for this product
  const realImage = PRODUCT_IMAGE_MAP[product.id];
  if (realImage) return realImage;
  
  // Check if imageUrl is already a real asset
  if (product.imageUrl && !product.imageUrl.includes('placehold.co')) {
    return product.imageUrl;
  }
  
  // Return brand logo as fallback
  return BRAND_LOGOS[product.brand] || '/assets/cat-smartphones.png';
}

export function getBrandLogo(brand: string): string {
  return BRAND_LOGOS[brand] || '/assets/cat-smartphones.png';
}
