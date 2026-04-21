import { Product, Category } from './types';

export const MOCK_PHONES: Product[] = [
  {
    id: '1',
    model: 'iPhone 15 Pro Max',
    brand: 'Apple',
    category: 'Phones',
    price: 1199,
    originalPrice: 1199,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-pro-max-1.jpg',
    isCertified: true,
    stock: 10,
    specs: {
      display: '6.7" LTPO Super Retina XDR OLED, 120Hz, HDR10, Dolby Vision',
      processor: 'Apple A17 Pro (3 nm)',
      camera: '48MP (wide) + 12MP (periscope telephoto) + 12MP (ultrawide)',
      battery: '4441 mAh, 20W wired, 15W wireless',
      ram: '8GB',
      os: 'iOS 17, upgradable to iOS 17.4',
      storage: '256GB/512GB/1TB'
    }
  },
  {
    id: '2',
    model: 'Galaxy S24 Ultra',
    brand: 'Samsung',
    category: 'Phones',
    price: 1299,
    originalPrice: 1299,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s24-ultra-1.jpg',
    isCertified: true,
    stock: 15,
    specs: {
      display: '6.8" Dynamic LTPO AMOLED 2X, 120Hz, HDR10+, 2600 nits',
      processor: 'Qualcomm Snapdragon 8 Gen 3 (4 nm)',
      camera: '200MP (wide) + 50MP (periscope telephoto) + 10MP (telephoto) + 12MP (ultrawide)',
      battery: '5000 mAh, 45W wired, 15W wireless',
      ram: '12GB',
      os: 'Android 14, One UI 6.1',
      storage: '256GB/512GB/1TB'
    }
  },
  {
    id: '3',
    model: 'Pixel 8 Pro',
    brand: 'Google',
    category: 'Phones',
    price: 999,
    originalPrice: 999,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/google/google-pixel-8-pro-1.jpg',
    isCertified: true,
    stock: 8,
    specs: {
      display: '6.7" LTPO OLED, 120Hz, HDR10+, 2400 nits',
      processor: 'Google Tensor G3 (4 nm)',
      camera: '50MP (wide) + 48MP (telephoto) + 48MP (ultrawide)',
      battery: '5050 mAh, 30W wired, 23W wireless',
      ram: '12GB',
      os: 'Android 14',
      storage: '128GB/256GB/512GB/1TB'
    }
  },
  {
    id: '4',
    model: 'Xiaomi 14 Ultra',
    brand: 'Xiaomi',
    category: 'Phones',
    price: 1499,
    originalPrice: 1499,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/xiaomi/xiaomi-14-ultra-1.jpg',
    isCertified: true,
    stock: 5,
    specs: {
      display: '6.73" LTPO AMOLED, 68B colors, 120Hz, Dolby Vision, HDR10+',
      processor: 'Qualcomm Snapdragon 8 Gen 3 (4 nm)',
      camera: '50MP (wide) + 50MP (periscope telephoto) + 50MP (telephoto) + 50MP (ultrawide)',
      battery: '5000 mAh, 90W wired, 80W wireless',
      ram: '16GB',
      os: 'Android 14, HyperOS',
      storage: '256GB/512GB/1TB'
    }
  },
  {
    id: '5',
    model: 'OnePlus 12',
    brand: 'OnePlus',
    category: 'Phones',
    price: 799,
    originalPrice: 799,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/oneplus/oneplus-12-1.jpg',
    isCertified: true,
    stock: 12,
    specs: {
      display: '6.82" LTPO AMOLED, 1B colors, 120Hz, Dolby Vision, HDR10+',
      processor: 'Qualcomm Snapdragon 8 Gen 3 (4 nm)',
      camera: '50MP (wide) + 64MP (periscope telephoto) + 48MP (ultrawide)',
      battery: '5400 mAh, 100W wired, 50W wireless',
      ram: '12GB/16GB/24GB',
      os: 'Android 14, OxygenOS 14',
      storage: '256GB/512GB/1TB'
    }
  },
  {
    id: '6',
    model: 'Galaxy Z Fold 5',
    brand: 'Samsung',
    category: 'Phones',
    price: 1799,
    originalPrice: 1799,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-z-fold5-1.jpg',
    isCertified: true,
    stock: 4,
    specs: {
      display: '7.6" Foldable Dynamic AMOLED 2X, 120Hz, HDR10+',
      processor: 'Qualcomm Snapdragon 8 Gen 2 (4 nm)',
      camera: '50MP (wide) + 10MP (telephoto) + 12MP (ultrawide)',
      battery: '4400 mAh, 25W wired, 15W wireless',
      ram: '12GB',
      os: 'Android 13, upgradable to Android 14, One UI 6',
      storage: '256GB/512GB/1TB'
    }
  },
  {
    id: '7',
    model: 'Nothing Phone (2)',
    brand: 'Nothing',
    category: 'Phones',
    price: 599,
    originalPrice: 599,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/nothing/nothing-phone-2-1.jpg',
    isCertified: true,
    stock: 20,
    specs: {
      display: '6.7" LTPO OLED, 1B colors, 120Hz, HDR10+',
      processor: 'Qualcomm Snapdragon 8+ Gen 1 (4 nm)',
      camera: '50MP (wide) + 50MP (ultrawide)',
      battery: '4700 mAh, 45W wired, 15W wireless',
      ram: '8GB/12GB',
      os: 'Android 13, upgradable to Android 14, Nothing OS 2.5',
      storage: '128GB/256GB/512GB'
    }
  },
  {
    id: '8',
    model: 'Xperia 1 V',
    brand: 'Sony',
    category: 'Phones',
    price: 1199,
    originalPrice: 1199,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/sony/sony-xperia-1-v-1.jpg',
    isCertified: true,
    stock: 6,
    specs: {
      display: '6.5" OLED, 1B colors, 120Hz, HDR BT.2020',
      processor: 'Qualcomm Snapdragon 8 Gen 2 (4 nm)',
      camera: '48MP (wide) + 12MP (telephoto) + 12MP (ultrawide)',
      battery: '5000 mAh, 30W wired, 15W wireless',
      ram: '12GB',
      os: 'Android 13, upgradable to Android 14',
      storage: '256GB/512GB'
    }
  },
  {
    id: '9',
    model: 'Edge 50 Pro',
    brand: 'Motorola',
    category: 'Phones',
    price: 699,
    originalPrice: 699,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/motorola/motorola-edge-50-pro-1.jpg',
    isCertified: true,
    stock: 15,
    specs: {
      display: '6.7" OLED, 1B colors, 144Hz, HDR10+, 2000 nits',
      processor: 'Qualcomm Snapdragon 7 Gen 3 (4 nm)',
      camera: '50MP (wide) + 10MP (telephoto) + 13MP (ultrawide)',
      battery: '4500 mAh, 125W wired, 50W wireless',
      ram: '8GB/12GB',
      os: 'Android 14',
      storage: '128GB/256GB/512GB'
    }
  },
  {
    id: '10',
    model: 'iPhone 15',
    brand: 'Apple',
    category: 'Phones',
    price: 799,
    originalPrice: 799,
    grade: 'New',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-1.jpg',
    isCertified: true,
    stock: 25,
    specs: {
      display: '6.1" Super Retina XDR OLED, HDR10, Dolby Vision, 2000 nits',
      processor: 'Apple A16 Bionic (4 nm)',
      camera: '48MP (wide) + 12MP (ultrawide)',
      battery: '3349 mAh, 15W wired, 15W wireless',
      ram: '6GB',
      os: 'iOS 17, upgradable to iOS 17.4',
      storage: '128GB/256GB/512GB'
    }
  }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'phones',
    name: 'Smartphones',
    imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop'
  }
];
