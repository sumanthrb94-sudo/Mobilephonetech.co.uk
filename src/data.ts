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
    imageUrl: '/assets/YUYFZeFzWLMA.png',
    galleryImages: [
      '/assets/YUYFZeFzWLMA.png',
      '/assets/xKrBA0WkKCOR.jpg',
      '/assets/y0wXjoNpojxp.png'
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
    },
    colorOptions: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    storageOptions: ['256GB', '512GB', '1TB'],
    conditionOptions: ['Pristine', 'Excellent'],
    variants: [
      {
        id: '1-nt-256-pristine',
        color: 'Natural Titanium',
        storage: '256GB',
        condition: 'Pristine',
        price: 849,
        originalPrice: 1199,
        stock: 5,
        batteryHealth: 98,
      }
    ]
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
    imageUrl: '/assets/nnCyJ3CuEgYe.jpg',
    galleryImages: [
      '/assets/nnCyJ3CuEgYe.jpg',
      '/assets/ybNb5k0B7nvc.png',
      '/assets/TYsh56U5ZjIX.png'
    ],
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
    },
    colorOptions: ['Space Black', 'Silver', 'Gold'],
    storageOptions: ['128GB', '256GB'],
    conditionOptions: ['Excellent', 'Good'],
    variants: [
      {
        id: '2-sb-128-excellent',
        color: 'Space Black',
        storage: '128GB',
        condition: 'Excellent',
        price: 629,
        originalPrice: 999,
        stock: 8,
        batteryHealth: 92,
      }
    ]
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
    },
    colorOptions: ['Midnight', 'Starlight', 'Blue'],
    storageOptions: ['128GB'],
    conditionOptions: ['Good'],
    variants: [
      {
        id: '3-midnight-128-good',
        color: 'Midnight',
        storage: '128GB',
        condition: 'Good',
        price: 399,
        originalPrice: 749,
        stock: 20,
        batteryHealth: 88,
      },
    ]
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
    },
    colorOptions: ['Pacific Blue', 'Gold', 'Silver'],
    storageOptions: ['128GB', '256GB'],
    conditionOptions: ['Excellent'],
    variants: [
      {
        id: '4-pb-128-excellent',
        color: 'Pacific Blue',
        storage: '128GB',
        condition: 'Excellent',
        price: 349,
        originalPrice: 899,
        stock: 8,
        batteryHealth: 90,
      },
    ]
  }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'phones',
    name: 'Smartphones',
    imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop',
    description: 'Refurbished and certified smartphones from top brands',
    productCount: 10,
    children: [
      {
        id: 'phones-apple',
        name: 'Apple iPhones',
        imageUrl: '/assets/YUYFZeFzWLMA.png',
        parent: 'phones',
        description: 'Latest and classic iPhone models',
        productCount: 4,
      },
      {
        id: 'phones-samsung',
        name: 'Samsung Galaxy',
        imageUrl: 'https://images.unsplash.com/photo-1511707267537-b85faf00021e?q=80&w=800&auto=format&fit=crop',
        parent: 'phones',
        description: 'Premium Samsung smartphones',
        productCount: 0,
      }
    ]
  },
  {
    id: 'computing',
    name: 'Mac & Computing',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop',
    description: 'Refurbished MacBooks and computing devices',
    productCount: 0
  }
];
