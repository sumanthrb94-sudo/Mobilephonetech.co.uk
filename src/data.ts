import { Product, Category } from './types';

export const MOCK_PHONES: Product[] = [
  {
    id: '1',
    model: 'iPhone 15 Pro Max',
    brand: 'Apple',
    category: 'Phones',
    price: 849,
    originalPrice: 1199,
    grade: 'Pristine',
    batteryHealth: 98,
    warrantyMonths: 12,
    returnDays: 30,
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-pro-max-1.jpg',
    galleryImages: [
      'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-pro-max-1.jpg',
      'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-pro-max-2.jpg'
    ],
    isCertified: true,
    stock: 5,
    conditionDescription: 'Like new condition with no visible scratches. Battery health guaranteed above 95%.',
    specs: {
      display: '6.7" LTPO Super Retina XDR OLED, 120Hz',
      processor: 'Apple A17 Pro (3 nm)',
      camera: '48MP Main | 12MP Telephoto | 12MP Ultrawide',
      battery: '4441 mAh',
      ram: '8GB',
      os: 'iOS 17',
      storage: '256GB'
    }
  },
  {
    id: '2',
    model: 'iPhone 14 Pro',
    brand: 'Apple',
    category: 'Phones',
    price: 629,
    originalPrice: 999,
    grade: 'Excellent',
    batteryHealth: 92,
    warrantyMonths: 12,
    returnDays: 30,
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-14-pro-1.jpg',
    isCertified: true,
    stock: 12,
    conditionDescription: 'Excellent condition. May have micro-scratches invisible from 20cm away.',
    specs: {
      display: '6.1" LTPO Super Retina XDR OLED',
      processor: 'Apple A16 Bionic',
      camera: '48MP Main | 12MP Telephoto | 12MP Ultrawide',
      battery: '3200 mAh',
      ram: '6GB',
      os: 'iOS 16',
      storage: '128GB'
    }
  },
  {
    id: '3',
    model: 'iPhone 13',
    brand: 'Apple',
    category: 'Phones',
    price: 399,
    originalPrice: 749,
    grade: 'Good',
    batteryHealth: 88,
    warrantyMonths: 12,
    returnDays: 30,
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-13-01.jpg',
    isCertified: true,
    stock: 20,
    conditionDescription: 'Good condition. Fully functional with some visible signs of use on the frame.',
    specs: {
      display: '6.1" Super Retina XDR OLED',
      processor: 'Apple A15 Bionic',
      camera: '12MP Dual System',
      battery: '3240 mAh',
      ram: '4GB',
      os: 'iOS 15',
      storage: '128GB'
    }
  },
  {
    id: '4',
    model: 'iPhone 12 Pro',
    brand: 'Apple',
    category: 'Phones',
    price: 349,
    originalPrice: 899,
    grade: 'Excellent',
    batteryHealth: 90,
    warrantyMonths: 12,
    returnDays: 30,
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-12-pro-1.jpg',
    isCertified: true,
    stock: 8,
    conditionDescription: 'Excellent condition. Professional refurbishing process completed.',
    specs: {
      display: '6.1" Super Retina XDR OLED',
      processor: 'Apple A14 Bionic',
      camera: '12MP Triple System + LiDAR',
      battery: '2815 mAh',
      ram: '6GB',
      os: 'iOS 14',
      storage: '128GB'
    }
  }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'phones',
    name: 'Refurbished iPhones',
    imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop'
  }
];
