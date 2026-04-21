import { Product, Category } from './types';

export const MOCK_PHONES: Product[] = [
  {
    id: '1',
    model: 'iPhone 15 Pro',
    brand: 'Apple',
    category: 'Phones',
    price: 749,
    originalPrice: 999,
    grade: 'Pristine',
    imageUrl: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-pro-1.jpg',
    isCertified: true,
    stock: 5,
    specs: {
      display: '6.1" LTPO Super Retina XDR OLED, 120Hz',
      processor: 'Apple A17 Pro (3 nm)',
      camera: '48MP + 12MP + 12MP',
      battery: '3274 mAh',
      ram: '8GB',
      os: 'iOS 17',
      aiPerformance: '35 TOPS'
    }
  },
  {
    id: 'mac-1',
    model: 'Mac Mini M2 Pro',
    brand: 'Apple',
    category: 'Computing',
    price: 1199,
    originalPrice: 1299,
    grade: 'New',
    imageUrl: 'https://images.unsplash.com/photo-1615655459345-3ec85ce26ae4?q=80&w=800&auto=format&fit=crop',
    isCertified: true,
    stock: 10,
    specs: {
      processor: 'Apple M2 Pro (10-core CPU)',
      ram: '16GB Unified Memory',
      os: 'macOS Sonoma',
      ports: '4x Thunderbolt 4, 2x USB-A, HDMI, Ethernet',
      aiPerformance: '15.8 TOPS (Neural Engine)'
    }
  },
  {
    id: 'case-1',
    model: 'Ultra-Clear Privacy Case',
    brand: 'Case-Mate',
    category: 'Accessories',
    price: 29,
    originalPrice: 39,
    grade: 'New',
    imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbab?q=80&w=800&auto=format&fit=crop',
    isCertified: true,
    stock: 100,
    specs: {
      type: 'MagSafe Protective Case',
      compatibilty: 'iPhone 15 Pro',
      display: 'Military Grade Drop Protection'
    }
  },
  {
    id: 'glass-1',
    model: 'Diamond Shield Privacy Glass',
    brand: 'Spigen',
    category: 'Accessories',
    price: 19,
    originalPrice: 25,
    grade: 'New',
    imageUrl: 'https://images.unsplash.com/photo-1592890288564-76628a30a657?q=80&w=800&auto=format&fit=crop',
    isCertified: true,
    stock: 500,
    specs: {
      type: '2-Way Privacy Filter',
      compatibilty: 'Generic 6.1" to 6.7"',
      display: '9H Hardness Tempered Glass'
    }
  },
  {
    id: 'mac-2',
    model: 'Mac Mini M4',
    brand: 'Apple',
    category: 'Computing',
    price: 599,
    originalPrice: 599,
    grade: 'New',
    imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ea696c1d01?q=80&w=800&auto=format&fit=crop',
    isCertified: true,
    stock: 15,
    specs: {
      processor: 'Apple M4 (10-core CPU)',
      ram: '16GB RAM',
      os: 'macOS Sequoia',
      aiPerformance: '38 TOPS (Next-Gen NPU)'
    }
  },
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'phones',
    name: 'Smartphones',
    imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'computing',
    name: 'Mac & Computing',
    imageUrl: 'https://images.unsplash.com/photo-1605339031086-6bebc5539bbd?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'accessories',
    name: 'Accessories & Glass',
    imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop'
  }
];
