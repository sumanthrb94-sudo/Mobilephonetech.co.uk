import { describe, it, expect } from 'vitest';
import { resolveFormFactor } from '../../utils/deviceFormFactor';

describe('resolveFormFactor', () => {
  it('draws Apple Watches as watches, not phones', () => {
    expect(resolveFormFactor('Apple', 'Apple Watch Series 11', 'Smartwatches')).toBe('watch');
    expect(resolveFormFactor('Apple', 'Apple Watch Ultra 3')).toBe('watch');
  });

  it('draws modern Galaxy A phones full-screen, like the S range', () => {
    expect(resolveFormFactor('Samsung', 'Galaxy A16')).toBe('galaxy-s');
    expect(resolveFormFactor('Samsung', 'Galaxy A32 5G')).toBe('galaxy-s');
  });

  it('keeps iPhones, iPads, tablets and Pixels on their own shapes', () => {
    expect(resolveFormFactor('Apple', 'iPhone 17 Pro Max')).toBe('iphone-island');
    expect(resolveFormFactor('Apple', 'iPad Pro 13-inch (M5)')).toBe('ipad-pro');
    expect(resolveFormFactor('Samsung', 'Galaxy Tab A11 5G')).toBe('galaxy-tab');
    expect(resolveFormFactor('Google', 'Pixel 9a')).toBe('pixel-bar');
  });
});
