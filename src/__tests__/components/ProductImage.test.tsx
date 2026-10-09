import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductImage from '../../components/ProductImage';

describe('ProductImage', () => {
  it('shows an uploaded photo', () => {
    const { container } = render(<ProductImage brand="Apple" model="iPhone 16" imageUrl="https://res.cloudinary.com/x/iphone.jpg" alt="iPhone 16" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://res.cloudinary.com/x/iphone.jpg');
  });

  it('draws the phone in the chosen colour, not a demo picture, when nothing was uploaded', () => {
    const { container } = render(<ProductImage brand="Apple" model="iPhone 16" color="Teal" imageUrl="/assets/iphone-16.jpg" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Apple iPhone 16 in Teal' })).toBeTruthy();
    expect(screen.getByText('Photo coming soon')).toBeTruthy();
  });

  it('keeps one neutral body and shows the colour on the buttons only', () => {
    const draw = (color: string) => {
      const { container, unmount } = render(<ProductImage brand="Apple" model="iPhone 16" color={color} imageUrl="" />);
      const body = [...container.querySelectorAll('stop')].slice(0, 2).map(s => s.getAttribute('stop-color')).join();
      const fills = [...container.querySelectorAll('rect')].map(r => r.getAttribute('fill'));
      unmount();
      return { body, fills };
    };
    const black = draw('Black');
    const pink = draw('Pink');
    expect(black.body).toBe(pink.body);
    expect(pink.fills.filter(f => f && !black.fills.includes(f)).length).toBeGreaterThanOrEqual(3);
  });

  it('drops the tag at thumbnail size', () => {
    render(<ProductImage brand="Apple" model="iPhone 16" imageUrl="" context="thumb" />);
    expect(screen.queryByText('Photo coming soon')).toBeNull();
    expect(screen.getByRole('img', { name: 'Apple iPhone 16' })).toBeTruthy();
  });
});

describe('ProductImage loading', () => {
  it('offers width-limited Cloudinary renditions with sizes for the context', () => {
    const { container } = render(<ProductImage brand="Apple" model="iPhone 16" imageUrl="https://res.cloudinary.com/x/image/upload/f_auto,q_auto/v1/iphone.jpg" context="card" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('srcset')).toContain('https://res.cloudinary.com/x/image/upload/w_320,c_limit,f_auto,q_auto/v1/iphone.jpg 320w');
    expect(img.getAttribute('sizes')).toBe('(min-width: 1024px) 25vw, 50vw');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('loads the product page photo eagerly and first', () => {
    const { container } = render(<ProductImage brand="Apple" model="iPhone 16" imageUrl="https://res.cloudinary.com/x/image/upload/v1/iphone.jpg" context="hero" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('leaves a non-Cloudinary photo as a single source', () => {
    const { container } = render(<ProductImage brand="Apple" model="iPhone 16" imageUrl="https://firebasestorage.googleapis.com/v0/b/x/o/p.jpg?alt=media" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://firebasestorage.googleapis.com/v0/b/x/o/p.jpg?alt=media');
    expect(img.getAttribute('srcset')).toBeNull();
    expect(img.getAttribute('sizes')).toBeNull();
  });
});
