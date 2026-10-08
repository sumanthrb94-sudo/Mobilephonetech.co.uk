import type { Category } from '../types';

/**
 * The shop's departments, as the side menu lists them. Names and copy only:
 * product counts come from the live catalogue, never from here.
 */
export const SHOP_CATEGORIES: Category[] = [
  {
    id: 'apple',
    name: 'Apple',
    imageUrl: '/assets/apple.png',
    description: 'Latest iPhones and refurbished Apple devices',
  },
  {
    id: 'samsung',
    name: 'Samsung',
    imageUrl: '/assets/samsung.png',
    description: 'Samsung Galaxy smartphones and accessories',
  },
  {
    id: 'google',
    name: 'Google',
    imageUrl: '/assets/google.png',
    description: 'Google Pixel phones and smart technology',
  },
  {
    id: 'tablets',
    name: 'Ipads & Tabs',
    imageUrl: '/assets/tablets.svg',
    description: 'iPads and Android tablets for work and play',
  },
  {
    id: 'watches',
    name: 'Watches',
    imageUrl: '/assets/accessories.svg',
    description: 'Refurbished Apple Watch and smartwatches',
  },
  {
    id: 'accessories',
    name: 'Accessories',
    imageUrl: '/assets/accessories.svg',
    description: 'Cases, chargers, and essential mobile add-ons',
  },
  {
    id: 'speakers',
    name: 'Speakers',
    imageUrl: '/assets/speakers.svg',
    description: 'Bluetooth and portable speakers for every occasion',
  },
  {
    id: 'hearables',
    name: 'Hearables',
    imageUrl: '/assets/hearables.svg',
    description: 'High-quality headphones and wireless earbuds',
  },
  {
    id: 'playables',
    name: 'Playables',
    imageUrl: '/assets/playables.svg',
    description: 'Gaming consoles, VR headsets, and interactive gear',
  },
];
